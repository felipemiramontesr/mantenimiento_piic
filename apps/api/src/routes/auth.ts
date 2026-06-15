import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import argon2 from 'argon2';
import { z } from 'zod';
import db from '../services/db';
import EncryptionService from '../services/encryption';
import { recordAuditLog } from '../services/auditService';
import requirePermission from '../middleware/requirePermission';
import withConnection from '../utils/withConnection';

/** Owner-scoped roles that receive a FLEET_OWNER link on registration. */
const OWNER_SCOPED_ROLE_IDS = [1, 2]; // 1=Propietario de Flotilla, 2=Propietario Privado

/**
 * Links a freshly registered owner-scoped user (roles 1 or 2) to its FLEET_OWNER
 * catalog row, creating the row when the owner label does not exist yet.
 * common_catalogs.id has no AUTO_INCREMENT — next id is resolved with
 * MAX(id)+1 inside the same transaction (FOR UPDATE serializes concurrents).
 */
async function linkExternalClientOwner(userId: number, ownerLabel: string): Promise<void> {
  return withConnection(async (connection) => {
    await connection.beginTransaction();
    try {
      const [existing] = await connection.execute<RowDataPacket[]>(
        "SELECT id FROM common_catalogs WHERE category = 'FLEET_OWNER' AND label = ? LIMIT 1",
        [ownerLabel]
      );
      let ownerId: number;
      if (existing.length > 0) {
        ownerId = existing[0].id as number;
      } else {
        const [nextRows] = await connection.execute<RowDataPacket[]>(
          'SELECT COALESCE(MAX(id), 0) + 1 AS nextId FROM common_catalogs FOR UPDATE'
        );
        ownerId = nextRows[0].nextId as number;
        await connection.execute<ResultSetHeader>(
          "INSERT INTO common_catalogs (id, category, code, label) VALUES (?, 'FLEET_OWNER', ?, ?)",
          [ownerId, `OWN_U${userId}`, ownerLabel]
        );
      }
      await connection.execute<ResultSetHeader>(
        'INSERT IGNORE INTO user_fleet_owners (user_id, owner_id) VALUES (?, ?)',
        [userId, ownerId]
      );
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    }
  });
}

/**
 * 🔱 Archon Auth Engine (v.8.7.0) - THE NUCLEUS
 * Goal: 100.00% Absolute Everything. Catch-Compaction for V8 reporting.
 */

function mapUserResponse(user: RowDataPacket): {
  id: number;
  uuid: string;
  username: string;
  fullName: string;
  email: string;
  roleId: number;
  roleName: string;
  department: string;
  imageUrl: string | null;
  employeeNumber: string | null;
  is_active: boolean;
} {
  let rid = user.role_id;
  if (rid === undefined) {
    rid = user.roleId;
  }
  let rname = user.role_name;
  if (!rname) {
    rname = user.roleName;
  }
  let img = user.profile_picture_url;
  if (!img) {
    img = user.imageUrl;
  }
  // Plan Omega: data URIs pass through directly, legacy filenames use endpoint
  let pic = null;
  if (img && img.startsWith('data:')) {
    pic = img;
  } else if (img) {
    pic = `/v1/users/${user.id}/profile-image`;
  }
  return {
    id: user.id,
    uuid: user.uuid,
    username: user.username,
    fullName: user.full_name || user.fullName,
    email: EncryptionService.decrypt(user.email),
    roleId: rid,
    roleName: rname,
    department: user.department_name || user.department,
    imageUrl: pic,
    employeeNumber: user.employee_number || user.employeeNumber || null,
    is_active: user.is_active !== undefined ? Boolean(user.is_active) : true,
  };
}

async function findUserByEmail(username: string): Promise<RowDataPacket | null> {
  const response = await db.execute<RowDataPacket[]>('SELECT * FROM users WHERE is_active = 1', []);
  if (!response) {
    return null;
  }
  const [results] = response;
  if (!results) {
    return null;
  }
  const found = results.find((u) => {
    try {
      if (EncryptionService.decrypt(u.email) === username) {
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  });
  if (!found) {
    return null;
  }
  const fullResponse = await db.execute<RowDataPacket[]>(
    'SELECT u.*, r.name as role_name, cat.label as department_name FROM users u JOIN roles r ON u.role_id = r.id LEFT JOIN common_catalogs cat ON u.department_id = cat.id WHERE u.id = ?',
    [found.id]
  );
  if (!fullResponse) {
    return null;
  }
  const [fullRows] = fullResponse;
  if (!fullRows || !fullRows[0]) {
    return null;
  }
  return fullRows[0];
}

export default async function authRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post<{ Body: { username?: string; password?: string } }>(
    '/login',
    async (request, reply) => {
      const { username, password } = request.body;
      if (!username) {
        return reply.code(400).send({ error: 'L1' });
      }
      if (!password) {
        return reply.code(400).send({ error: 'L2' });
      }
      try {
        const response = await db.execute<RowDataPacket[]>(
          'SELECT u.*, r.name as role_name, cat.label as department_name FROM users u JOIN roles r ON u.role_id = r.id LEFT JOIN common_catalogs cat ON u.department_id = cat.id WHERE u.username = ?',
          [username]
        );
        let user: RowDataPacket | null = null;
        if (response) {
          const [results] = response;
          if (results && results.length > 0) {
            [user] = results;
          }
          if (!user) {
            user = await findUserByEmail(username);
          }
        }
        if (!user) {
          return reply.code(401).send({ error: 'L3' });
        }
        let hash = user.password_hash;
        if (!hash) {
          hash = user.passwordHash;
        }
        if (!hash || !(await argon2.verify(hash, password))) {
          return reply.code(401).send({ error: 'L4' });
        }
        const mapped = mapUserResponse(user);

        // Multi-role: resolve permissions as union of all assigned roles
        const [userRoleRows] = await db.execute<RowDataPacket[]>(
          'SELECT role_id FROM user_roles WHERE user_id = ?',
          [mapped.id]
        );
        const roleIds: number[] =
          userRoleRows.length > 0 ? userRoleRows.map((r) => r.role_id as number) : [mapped.roleId]; // backward compat: fall back to users.role_id

        let permissions: string[];
        if (roleIds.includes(0)) {
          permissions = ['*'];
        } else {
          const placeholders = roleIds.map(() => '?').join(',');
          const [permRows] = await db.execute<RowDataPacket[]>(
            `SELECT DISTINCT p.slug
             FROM role_permissions rp
             JOIN permissions p ON p.id = rp.permission_id
             WHERE rp.role_id IN (${placeholders})`,
            roleIds
          );
          permissions = permRows.map((r) => r.slug as string);
        }

        const token = fastify.jwt.sign({
          id: user.id,
          username: user.username,
          roleId: mapped.roleId,
          roleName: mapped.roleName,
          permissions,
          type: 'access',
        });
        const refreshToken = fastify.jwt.sign(
          { id: user.id, type: 'refresh' },
          { expiresIn: '7d' }
        );
        const isProduction = process.env.NODE_ENV === 'production';
        return reply
          .setCookie('refresh_token', refreshToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: 'strict',
            domain: isProduction ? '.piic.com.mx' : undefined,
            path: '/v1/auth',
            maxAge: 7 * 24 * 60 * 60,
          })
          .send({ success: true, token, user: { ...mapped, permissions } });
      } catch (e) {
        fastify.log.error(e);
        return reply.code(500).send({ error: 'LOGIN_FAIL' });
      }
    }
  );

  fastify.post('/refresh', async (request, reply) => {
    try {
      const decoded = await request.jwtVerify<{ id: number; type: string }>();
      if (!decoded || decoded.type !== 'refresh') {
        return reply.code(401).send({ error: 'INVALID_TOKEN_TYPE' });
      }
      const [userRows] = await db.execute<RowDataPacket[]>(
        `SELECT u.*, r.name as role_name, cat.label as department_name
         FROM users u JOIN roles r ON u.role_id = r.id
         LEFT JOIN common_catalogs cat ON u.department_id = cat.id
         WHERE u.id = ? AND u.is_active = 1`,
        [decoded.id]
      );
      if (!userRows.length) return reply.code(401).send({ error: 'USER_NOT_FOUND' });
      const user = userRows[0];
      const mapped = mapUserResponse(user);
      const [roleRows] = await db.execute<RowDataPacket[]>(
        'SELECT role_id FROM user_roles WHERE user_id = ?',
        [mapped.id]
      );
      const roleIds: number[] =
        roleRows.length > 0 ? roleRows.map((r) => r.role_id as number) : [mapped.roleId];
      let permissions: string[];
      if (roleIds.includes(0)) {
        permissions = ['*'];
      } else {
        const ph = roleIds.map(() => '?').join(',');
        const [permRows] = await db.execute<RowDataPacket[]>(
          `SELECT DISTINCT p.slug FROM role_permissions rp
           JOIN permissions p ON p.id = rp.permission_id WHERE rp.role_id IN (${ph})`,
          roleIds
        );
        permissions = permRows.map((r) => r.slug as string);
      }
      const accessToken = fastify.jwt.sign({
        id: user.id,
        username: user.username,
        roleId: mapped.roleId,
        roleName: mapped.roleName,
        permissions,
        type: 'access',
      });
      return reply.send({ success: true, token: accessToken, user: { ...mapped, permissions } });
    } catch {
      return reply.code(401).send({ error: 'REFRESH_FAIL' });
    }
  });

  fastify.post('/logout', async (_request, reply) => {
    const isProduction = process.env.NODE_ENV === 'production';
    return reply
      .clearCookie('refresh_token', {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'strict',
        domain: isProduction ? '.piic.com.mx' : undefined,
        path: '/v1/auth',
      })
      .send({ success: true });
  });

  fastify.post('/register', async (request, reply) => {
    const schema = z.object({
      username: z.string().min(3),
      email: z.string().email(),
      password: z.string().min(8),
      roleId: z
        .number()
        .int()
        .refine((id) => [1, 2].includes(id), {
          message: 'roleId must be 1 (Flotilla) or 2 (Privado)',
        }),
      fullName: z.string().optional(),
      departmentId: z.number().int().optional(),
      employeeNumber: z.string().optional(),
    });
    const body = schema.safeParse(request.body);
    if (!body.success) {
      return reply.code(400).send({ error: 'R1' });
    }
    const { username, email, password, roleId, fullName, departmentId, employeeNumber } = body.data;
    try {
      const existing = await db.execute<RowDataPacket[]>(
        'SELECT id FROM users WHERE username = ?',
        [username]
      );
      if (existing) {
        const [results] = existing;
        if (results && results.length > 0) {
          return reply.code(409).send({ error: 'R2' });
        }
      }
      const hash = await argon2.hash(password);
      const enc = EncryptionService.encrypt(email);
      const [res] = await db.execute<ResultSetHeader>(
        'INSERT INTO users (username, email, password_hash, role_id, full_name, department_id, employee_number) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [username, enc, hash, roleId, fullName || '', departmentId || null, employeeNumber || null]
      );
      if (OWNER_SCOPED_ROLE_IDS.includes(roleId)) {
        await linkExternalClientOwner(res.insertId, fullName || username);
      }
      return reply.code(201).send({ success: true, userId: res.insertId });
    } catch (e) {
      fastify.log.error(e);
      return reply.code(500).send({ error: 'REG_FAIL' });
    }
  });

  fastify.get('/users', async (request, reply) => {
    await request.jwtVerify();
    const { role } = request.query as { role?: string };
    try {
      let q =
        'SELECT u.*, r.name as role_name, cat.label as department_name FROM users u JOIN roles r ON u.role_id = r.id LEFT JOIN common_catalogs cat ON u.department_id = cat.id WHERE 1=1';
      const p: (string | number)[] = [];
      if (role) {
        q += ' AND u.role_id = ?';
        p.push(Number(role));
      }
      const res = await db.execute<RowDataPacket[]>(q, p);
      let rows: RowDataPacket[] = [];
      if (res) {
        const [results] = res;
        if (results) {
          rows = results as RowDataPacket[];
        }
      }
      return reply.send({ success: true, data: rows.map(mapUserResponse) });
    } catch (e) {
      fastify.log.error(e);
      return reply.code(500).send({ error: 'USER_FAIL' });
    }
  });

  fastify.patch('/users/:id', async (request, reply) => {
    const schema = z.object({
      data: z.object({
        fullName: z.string().optional(),
        department: z.string().optional(),
        email: z.string().email().optional(),
        password: z.string().min(8).optional(),
        roleId: z.number().int().optional(),
        profilePictureUrl: z.string().optional(),
        employeeNumber: z.string().optional(),
        departmentId: z.number().int().optional(),
        is_active: z.boolean().optional(),
      }),
      reason: z.string().min(5),
    });
    const { id } = request.params as { id: string };
    const body = schema.safeParse(request.body);
    if (!body.success) {
      return reply.code(400).send({ error: 'U1', details: body.error.format() });
    }
    const { data: updates, reason } = body.data;
    await request.jwtVerify();
    const admin = request.user as { id: number };

    let connection;
    try {
      connection = await db.getConnection();
      await connection.beginTransaction();

      // 1. Snapshot Before
      const [rows] = await connection.execute<RowDataPacket[]>(
        'SELECT * FROM users WHERE id = ? FOR UPDATE',
        [id]
      );
      if (rows.length === 0) {
        connection.release();
        return reply.code(404).send({ error: 'U3' });
      }
      const snapshotBefore = rows[0];

      // 2. Build Updates
      const fields: string[] = [];
      const values: (string | number | boolean)[] = [];
      if (updates.fullName) {
        fields.push('full_name = ?');
        values.push(updates.fullName);
      }
      if (updates.department) {
        fields.push('department = ?');
        values.push(updates.department);
      }
      if (updates.email) {
        fields.push('email = ?');
        values.push(EncryptionService.encrypt(updates.email));
      }
      if (updates.password) {
        fields.push('password_hash = ?');
        values.push(await argon2.hash(updates.password));
      }
      if (updates.roleId !== undefined) {
        fields.push('role_id = ?');
        values.push(updates.roleId);
      }
      if (updates.profilePictureUrl) {
        fields.push('profile_picture_url = ?');
        values.push(updates.profilePictureUrl);
      }
      if (updates.employeeNumber) {
        fields.push('employee_number = ?');
        values.push(updates.employeeNumber);
      }
      if (updates.departmentId) {
        fields.push('department_id = ?');
        values.push(updates.departmentId);
      }
      if (updates.is_active !== undefined) {
        fields.push('is_active = ?');
        values.push(updates.is_active ? 1 : 0);
      }

      if (fields.length > 0) {
        values.push(id);
        await connection.execute(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
      }

      // Sync user_roles when role changes — keeps login resolution consistent
      if (updates.roleId !== undefined) {
        await connection.execute('DELETE FROM user_roles WHERE user_id = ?', [id]);
        await connection.execute('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)', [
          Number(id),
          updates.roleId,
        ]);
      }

      // 3. Snapshot After
      const [rowsAfter] = await connection.execute<RowDataPacket[]>(
        'SELECT * FROM users WHERE id = ?',
        [id]
      );
      const snapshotAfter = rowsAfter[0];

      // 4. Audit
      await recordAuditLog({
        entity_type: 'user',
        entity_id: String(id),
        action: 'UPDATE',
        snapshot_before: snapshotBefore,
        snapshot_after: snapshotAfter,
        reason,
        user_id: admin.id,
      });

      await connection.commit();
      connection.release();
      return reply.send({ success: true });
    } catch (e) {
      if (connection) {
        await connection.rollback();
        connection.release();
      }
      fastify.log.error(e);
      return reply.code(500).send({ error: 'UPDATE_FAIL' });
    }
  });

  fastify.delete('/users/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const schema = z.object({
      reason: z.string().min(5),
    });
    const parse = schema.safeParse(request.body);
    if (!parse.success) {
      return reply.code(400).send({ error: 'D1', details: parse.error.format() });
    }
    const { reason } = parse.data;
    await request.jwtVerify();
    const admin = request.user as { id: number };

    let connection;
    try {
      connection = await db.getConnection();
      await connection.beginTransaction();

      // 1. Snapshot Before
      const [rows] = await connection.execute<RowDataPacket[]>(
        'SELECT * FROM users WHERE id = ? FOR UPDATE',
        [id]
      );
      if (rows.length === 0) {
        connection.release();
        return reply.code(404).send({ error: 'D3' });
      }
      const snapshotBefore = rows[0];

      // 2. Perform Delete
      await connection.execute('DELETE FROM users WHERE id = ?', [id]);

      // 3. Audit
      await recordAuditLog({
        entity_type: 'user',
        entity_id: String(id),
        action: 'DELETE',
        snapshot_before: snapshotBefore,
        reason,
        user_id: admin.id,
      });

      await connection.commit();
      connection.release();
      return reply.send({ success: true });
    } catch (e) {
      if (connection) {
        await connection.rollback();
        connection.release();
      }
      fastify.log.error(e);
      return reply.code(500).send({ error: 'DELETE_FAIL' });
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Owner-Scoped Fleet Access (F1-A · A3): user ↔ FLEET_OWNER links
  // Guard: user:admin — only user administrators manage owner assignments.
  // ──────────────────────────────────────────────────────────────────────────
  const ownersGuard = {
    onRequest: async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      try {
        await request.jwtVerify();
      } catch {
        reply.code(401).send({ error: 'Archon Protection: Session required' });
      }
    },
    preHandler: [requirePermission('user:admin')],
  };

  fastify.get('/users/:id/owners', ownersGuard, async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const [rows] = await db.execute<RowDataPacket[]>(
        `SELECT ufo.owner_id AS ownerId, cc.label
         FROM user_fleet_owners ufo
         JOIN common_catalogs cc ON cc.id = ufo.owner_id AND cc.category = 'FLEET_OWNER'
         WHERE ufo.user_id = ?`,
        [id]
      );
      return reply.send({ success: true, data: rows });
    } catch (e) {
      fastify.log.error({ err: (e as Error).message }, 'User owners fetch failed');
      return reply
        .code(500)
        .send({ success: false, code: 'INTERNAL_ERROR', message: 'OWNERS_FAIL' });
    }
  });

  fastify.put('/users/:id/owners', ownersGuard, async (request, reply) => {
    const schema = z.object({
      ownerIds: z.array(z.number().int()),
      reason: z.string().min(5),
    });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        success: false,
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0].message,
      });
    }
    const { id } = request.params as { id: string };
    const { ownerIds, reason } = parsed.data;
    const admin = request.user as { id: number };

    return withConnection(async (connection) => {
      await connection.beginTransaction();
      try {
        const [userRows] = await connection.execute<RowDataPacket[]>(
          'SELECT id FROM users WHERE id = ? FOR UPDATE',
          [id]
        );
        if (userRows.length === 0) {
          await connection.rollback();
          return reply
            .code(404)
            .send({ success: false, code: 'NOT_FOUND', message: 'Usuario no encontrado' });
        }

        if (ownerIds.length > 0) {
          const [catalogRows] = await connection.execute<RowDataPacket[]>(
            `SELECT id FROM common_catalogs WHERE category = 'FLEET_OWNER' AND id IN (${ownerIds
              .map(() => '?')
              .join(',')})`,
            ownerIds
          );
          if (catalogRows.length !== ownerIds.length) {
            await connection.rollback();
            return reply.code(400).send({
              success: false,
              code: 'VALIDATION_ERROR',
              message: 'Propietario inválido: no existe en el catálogo FLEET_OWNER',
              field: 'ownerIds',
            });
          }
        }

        const [beforeRows] = await connection.execute<RowDataPacket[]>(
          'SELECT owner_id FROM user_fleet_owners WHERE user_id = ?',
          [id]
        );

        await connection.execute<ResultSetHeader>(
          'DELETE FROM user_fleet_owners WHERE user_id = ?',
          [id]
        );

        if (ownerIds.length > 0) {
          await connection.execute<ResultSetHeader>(
            `INSERT INTO user_fleet_owners (user_id, owner_id) VALUES ${ownerIds
              .map(() => '(?,?)')
              .join(',')}`,
            ownerIds.flatMap((ownerId) => [Number(id), ownerId])
          );
        }

        await recordAuditLog({
          entity_type: 'user',
          entity_id: String(id),
          action: 'UPDATE',
          snapshot_before: { ownerIds: beforeRows.map((r) => r.owner_id as number) },
          snapshot_after: { ownerIds },
          reason,
          user_id: admin.id,
        });

        await connection.commit();
        return reply.send({ success: true, data: { ownerIds } });
      } catch (error) {
        await connection.rollback();
        fastify.log.error({ err: (error as Error).message }, 'User owners update failed');
        return reply
          .code(500)
          .send({ success: false, code: 'INTERNAL_ERROR', message: 'OWNERS_UPDATE_FAIL' });
      }
    });
  });

  fastify.get('/roles', async (request, reply) => {
    await request.jwtVerify();
    try {
      const res = await db.execute(
        "SELECT id, name as label FROM roles ORDER BY (name = 'Master (Archon)') DESC, name ASC",
        []
      );
      let rows: RowDataPacket[] = [];
      if (res) {
        const [results] = res;
        if (results) {
          rows = results as RowDataPacket[];
        }
      }
      return reply.send(rows);
    } catch (e) {
      fastify.log.error(e);
      return reply.code(500).send({ error: 'ROLE_FAIL' });
    }
  });

  // GET /v1/auth/users/:uuid/node — Sovereign node: full user profile + permissions + recent activity
  // GET /v1/auth/me — resolved user profile + capabilities (union of all assigned roles)
  fastify.get('/me', async (request, reply) => {
    try {
      await request.jwtVerify();
      const { id } = request.user as { id: number };

      const [userRows] = await db.execute<RowDataPacket[]>(
        `SELECT u.*, r.name AS role_name, cat.label AS department_name
         FROM users u
         JOIN roles r ON u.role_id = r.id
         LEFT JOIN common_catalogs cat ON u.department_id = cat.id
         WHERE u.id = ?`,
        [id]
      );
      if (userRows.length === 0)
        return reply
          .code(404)
          .send({ success: false, code: 'NOT_FOUND', message: 'Usuario no encontrado' });

      const user = userRows[0];

      const [userRoleRows] = await db.execute<RowDataPacket[]>(
        'SELECT role_id FROM user_roles WHERE user_id = ?',
        [id]
      );
      const roleIds: number[] =
        userRoleRows.length > 0
          ? userRoleRows.map((r) => r.role_id as number)
          : [user.role_id as number];

      let capabilities: string[];
      if (roleIds.includes(0)) {
        capabilities = ['*'];
      } else {
        const placeholders = roleIds.map(() => '?').join(',');
        const [permRows] = await db.execute<RowDataPacket[]>(
          `SELECT DISTINCT p.slug
           FROM role_permissions rp
           JOIN permissions p ON p.id = rp.permission_id
           WHERE rp.role_id IN (${placeholders})`,
          roleIds
        );
        capabilities = permRows.map((r) => r.slug as string);
      }

      return reply.send({
        success: true,
        data: { ...mapUserResponse(user), capabilities },
      });
    } catch (error) {
      fastify.log.error(error);
      return reply
        .code(500)
        .send({ success: false, code: 'INTERNAL_ERROR', message: 'Error al cargar perfil' });
    }
  });

  fastify.get('/users/:uuid/node', async (request, reply) => {
    try {
      await request.jwtVerify();
      const perms = (request.user as { permissions: string[] }).permissions;
      if (!perms.includes('*') && !perms.includes('user:admin')) {
        return reply
          .code(403)
          .send({ success: false, code: 'FORBIDDEN', message: 'Permission required: user:admin' });
      }
      const { uuid } = request.params as { uuid: string };
      const [userRows] = await db.execute<RowDataPacket[]>(
        `SELECT u.*, r.name AS role_name, cat.label AS department_name
         FROM users u
         JOIN roles r ON u.role_id = r.id
         LEFT JOIN common_catalogs cat ON u.department_id = cat.id AND cat.category = 'DEPARTMENT'
         WHERE u.uuid = ?`,
        [uuid]
      );
      if (userRows.length === 0)
        return reply.code(404).send({ success: false, message: 'Usuario no encontrado' });

      const user = userRows[0];
      const [permRows, routeRows] = await Promise.all([
        db.execute<RowDataPacket[]>(
          `SELECT p.slug, p.description
         FROM role_permissions rp
         JOIN permissions p ON p.id = rp.permission_id
         WHERE rp.role_id = ?
         ORDER BY p.slug`,
          [user.role_id]
        ),
        db.execute<RowDataPacket[]>(
          `SELECT fm.uuid, fm.unit_id, fre.destination, fm.status,
                fm.start_at, fm.end_at
         FROM fleet_movements fm
         JOIN fleet_route_extensions fre ON fre.movement_id = fm.id
         WHERE fre.driver_id = ? AND fm.movement_type = 'ROUTE'
         ORDER BY fm.created_at DESC LIMIT 5`,
          [user.id]
        ),
      ]);

      const emailDecrypted = EncryptionService.decrypt(user.email as string);

      return reply.send({
        success: true,
        data: {
          user: { ...user, email: emailDecrypted },
          permissions: permRows[0],
          recentRoutes: routeRows[0],
        },
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ success: false, message: 'Error al cargar nodo de usuario' });
    }
  });
}
