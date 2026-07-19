import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { PoolConnection } from 'mysql2/promise';
import '@fastify/cookie';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { hash as argon2Hash, verify as argon2Verify } from '@node-rs/argon2';
import { z } from 'zod';
import { userUpdateSchema } from '@mantenimiento/contracts';
import db from '../services/db';
import EncryptionService from '../services/encryption';
import { recordAuditLog } from '../services/auditService';
import requirePermission from '../middleware/requirePermission';
import withConnection from '../utils/withConnection';
import FleetService from '../services/fleetService';

const resolveOwnerScope = async (request: FastifyRequest): Promise<number[] | null> => {
  const { id, permissions } = request.user as { id: number; permissions?: string[] };
  if (!permissions || permissions.includes('*') || !permissions.includes('fleet:scoped'))
    return null;
  return FleetService.getUserOwnerIds(id);
};

const isUserInOwnerScope = async (
  connection: PoolConnection,
  targetUserId: string,
  ownerScope: number[]
): Promise<boolean> => {
  const [memberships] = await connection.execute<RowDataPacket[]>(
    'SELECT owner_id FROM user_owner_membership WHERE user_id = ?',
    [targetUserId]
  );
  const targetOwnerIds = memberships.map((m) => m.owner_id as number);
  return targetOwnerIds.some((oid) => ownerScope.includes(oid));
};

// FC 082 F0c — /register y sus helpers (resolveOwnerRow, insertOwnerProfile)
// murieron con las bandas de roles {1,3,4} (084_AN v3.1 §1a). El alta de
// usuarios/Arcs renace en F3 sobre el chasis §24.13 + Contrato §C (dual-door).

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
    {
      config: {
        rateLimit: {
          max: process.env.NODE_ENV === 'production' ? 10 : 1000,
          timeWindow: '1 minute',
        },
      },
    },
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
        if (!hash || !(await argon2Verify(hash, password))) {
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

        // FC 082 F0c — sin roles 1/3/4 ni eje suite no hay ownerType derivable;
        // queda null (gate web lo trata como usuario interno). F3 lo re-deriva del Arc.
        const ownerType: 'FLOTILLA' | 'PRIVATE' | 'CENTER' | null = null;

        const token = fastify.jwt.sign({
          id: user.id,
          username: user.username,
          roleId: mapped.roleId,
          roleName: mapped.roleName,
          permissions,
          type: 'access',
          owner_type: ownerType,
        });
        const refreshToken = fastify.jwt.sign(
          { id: user.id, type: 'refresh' },
          { expiresIn: '7d' }
        );
        const isProduction = process.env.NODE_ENV === 'production';
        const refreshCookieOpts = {
          httpOnly: true,
          secure: isProduction,
          sameSite: 'strict' as const,
          domain: isProduction ? '.piic.com.mx' : undefined,
          path: '/v1/auth',
          maxAge: 7 * 24 * 60 * 60,
        };
        return reply
          .setCookie('refresh_token', refreshToken, refreshCookieOpts)
          .send({ success: true, token, user: { ...mapped, permissions, ownerType } });
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
      // FC 082 F0c — ownerType null (ver /login); eje suite eliminado.
      const ownerType: 'FLOTILLA' | 'PRIVATE' | 'CENTER' | null = null;

      const accessToken = fastify.jwt.sign({
        id: user.id,
        username: user.username,
        roleId: mapped.roleId,
        roleName: mapped.roleName,
        permissions,
        type: 'access',
        owner_type: ownerType,
      });
      return reply.send({
        success: true,
        token: accessToken,
        user: { ...mapped, permissions, ownerType },
      });
    } catch {
      return reply.code(401).send({ error: 'REFRESH_FAIL' });
    }
  });

  fastify.post('/logout', async (_request, reply) => {
    const isProduction = process.env.NODE_ENV === 'production';
    const clearCookieOpts = {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict' as const,
      domain: isProduction ? '.piic.com.mx' : undefined,
      path: '/v1/auth',
    };
    return reply.clearCookie('refresh_token', clearCookieOpts).send({ success: true });
  });

  // FC 082 F0c — POST /register eliminado (bandas {1,3,4} muertas — 084_AN §1a).

  fastify.get('/users', async (request, reply) => {
    await request.jwtVerify();
    const { role } = request.query as { role?: string };
    try {
      const ownerScope = await resolveOwnerScope(request);
      if (ownerScope !== null && ownerScope.length === 0) {
        return reply.send({ success: true, data: [] });
      }

      let q = `
        SELECT DISTINCT u.*, r.name as role_name, cat.label as department_name
        FROM users u
        JOIN roles r ON u.role_id = r.id
        LEFT JOIN common_catalogs cat ON u.department_id = cat.id
      `;
      const p: (string | number)[] = [];

      if (ownerScope !== null) {
        q += ` JOIN user_owner_membership uom ON u.id = uom.user_id WHERE uom.owner_id IN (${ownerScope
          .map(() => '?')
          .join(', ')})`;
        p.push(...ownerScope);
      } else {
        q += ' WHERE 1=1';
      }

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
    // FC 076 F4 — schema movido a packages/contracts (SSOT compartido con
    // apps/web); importado 1:1, cero cambio semántico (Cond.1 Bravo).
    const schema = userUpdateSchema;
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

      // Scoping Guard
      const ownerScope = await resolveOwnerScope(request);
      if (ownerScope !== null && !(await isUserInOwnerScope(connection, id, ownerScope))) {
        connection.release();
        return reply.code(403).send({ error: 'FORBIDDEN', message: 'User outside owner scope' });
      }

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
        values.push(await argon2Hash(updates.password));
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

      // Scoping Guard
      const ownerScope = await resolveOwnerScope(request);
      if (ownerScope !== null && !(await isUserInOwnerScope(connection, id, ownerScope))) {
        connection.release();
        return reply.code(403).send({ error: 'FORBIDDEN', message: 'User outside owner scope' });
      }

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
  // Archon Master: user ↔ owner membership management
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
    preHandler: [requirePermission('admin:role:edit')],
  };

  fastify.get('/users/:id/owners', ownersGuard, async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const ownerScope = await resolveOwnerScope(request);
      if (ownerScope !== null) {
        const [memberships] = await db.execute<RowDataPacket[]>(
          'SELECT owner_id FROM user_owner_membership WHERE user_id = ?',
          [id]
        );
        const targetOwnerIds = memberships.map((m) => m.owner_id as number);
        const hasOverlap = targetOwnerIds.some((oid) => ownerScope.includes(oid));
        if (!hasOverlap) {
          return reply
            .code(403)
            .send({ success: false, code: 'FORBIDDEN', message: 'User outside owner scope' });
        }
      }
      const [rows] = await db.execute<RowDataPacket[]>(
        `SELECT uom.owner_id AS ownerId, o.label, o.handle, otc.code AS ownerType
         FROM user_owner_membership uom
         JOIN owners o ON o.id = uom.owner_id
         JOIN owner_types_catalog otc ON otc.id = o.owner_type_id
         WHERE uom.user_id = ?`,
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

        const ownerScope = await resolveOwnerScope(request);
        if (ownerScope !== null) {
          const [beforeRows] = await connection.execute<RowDataPacket[]>(
            'SELECT owner_id FROM user_owner_membership WHERE user_id = ?',
            [id]
          );
          const targetOwnerIds = beforeRows.map((r) => r.owner_id as number);
          const hasOverlap = targetOwnerIds.some((oid) => ownerScope.includes(oid));
          if (targetOwnerIds.length > 0 && !hasOverlap) {
            await connection.rollback();
            return reply
              .code(403)
              .send({ success: false, code: 'FORBIDDEN', message: 'User outside owner scope' });
          }
          const allInScope = ownerIds.every((oid) => ownerScope.includes(oid));
          if (!allInScope) {
            await connection.rollback();
            return reply.code(403).send({
              success: false,
              code: 'FORBIDDEN',
              message: 'Cannot assign owner outside of scope',
            });
          }
        }

        if (ownerIds.length > 0) {
          const [ownerRows] = await connection.execute<RowDataPacket[]>(
            `SELECT id FROM owners WHERE id IN (${ownerIds.map(() => '?').join(',')})`,
            ownerIds
          );
          if (ownerRows.length !== ownerIds.length) {
            await connection.rollback();
            return reply.code(400).send({
              success: false,
              code: 'VALIDATION_ERROR',
              message: 'Propietario inválido: no existe en la tabla de propietarios',
              field: 'ownerIds',
            });
          }
        }

        const [beforeRows] = await connection.execute<RowDataPacket[]>(
          'SELECT owner_id FROM user_owner_membership WHERE user_id = ?',
          [id]
        );

        await connection.execute<ResultSetHeader>(
          'DELETE FROM user_owner_membership WHERE user_id = ?',
          [id]
        );

        if (ownerIds.length > 0) {
          await connection.execute<ResultSetHeader>(
            `INSERT INTO user_owner_membership (user_id, owner_id) VALUES ${ownerIds
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

  // FC 082 F0c — POST /sub-users eliminado (roles {2,4,5} y concepto familiar
  // muertos — 084_AN §1a). Los sub-usuarios renacen en F3 como relaciones Arc.

  fastify.get('/roles', async (request, reply) => {
    await request.jwtVerify();
    try {
      const { scope } = request.query as { scope?: string };
      const isPersonal = scope === 'personal';
      const sql = isPersonal
        ? "SELECT id, name as label FROM roles WHERE id NOT IN (1, 3) AND name != 'Master (Archon)' ORDER BY name ASC"
        : "SELECT id, name as label FROM roles ORDER BY (name = 'Master (Archon)') DESC, name ASC";
      const res = await db.execute(sql, []);
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
      const ownerScope = await resolveOwnerScope(request);
      if (ownerScope !== null) {
        const [memberships] = await db.execute<RowDataPacket[]>(
          'SELECT owner_id FROM user_owner_membership WHERE user_id = ?',
          [user.id]
        );
        const targetOwnerIds = memberships.map((m) => m.owner_id as number);
        const hasOverlap = targetOwnerIds.some((oid) => ownerScope.includes(oid));
        if (!hasOverlap) {
          return reply
            .code(403)
            .send({ success: false, code: 'FORBIDDEN', message: 'User outside owner scope' });
        }
      }
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
