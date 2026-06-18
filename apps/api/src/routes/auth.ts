import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { PoolConnection } from 'mysql2/promise';
import '@fastify/cookie';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { hash as argon2Hash, verify as argon2Verify } from '@node-rs/argon2';
import { z } from 'zod';
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

type OwnerType = 'FLOTILLA' | 'CENTER' | 'PRIVATE';

/** Finds or creates the owners + common_catalogs rows inside an existing transaction. */
async function resolveOwnerRow(
  connection: PoolConnection,
  userId: number,
  ownerLabel: string,
  ownerType: OwnerType
): Promise<number> {
  const [existing] = await connection.execute<RowDataPacket[]>(
    'SELECT id FROM owners WHERE label = ? LIMIT 1',
    [ownerLabel]
  );
  if ((existing as RowDataPacket[]).length > 0) {
    return (existing as RowDataPacket[])[0].id as number;
  }
  const [nextRows] = await connection.execute<RowDataPacket[]>(
    'SELECT COALESCE(MAX(id), 0) + 1 AS nextId FROM common_catalogs FOR UPDATE'
  );
  const ownerId = (nextRows as RowDataPacket[])[0].nextId as number;
  await connection.execute<ResultSetHeader>(
    "INSERT INTO common_catalogs (id, category, code, label) VALUES (?, 'FLEET_OWNER', ?, ?)",
    [ownerId, `OWN_U${userId}`, ownerLabel]
  );
  const suite: 'ERP' | 'VIM' = ownerType === 'FLOTILLA' ? 'ERP' : 'VIM';
  await connection.execute<ResultSetHeader>(
    'INSERT INTO owners (id, owner_type, suite, label) VALUES (?, ?, ?, ?)',
    [ownerId, ownerType, suite, ownerLabel]
  );
  return ownerId;
}

type ProfileData =
  | { rfc?: string; razon_social?: string; telefono?: string; especialidades?: string }
  | undefined;
type AddressData =
  | { calle: string; numeroExt: string; numeroInt?: string; neighborhoodId: number }
  | undefined;

/** Inserts owner_profiles row inside an existing transaction (no-op when profile is absent). */
async function insertOwnerProfile(
  connection: PoolConnection,
  ownerId: number,
  roleId: number,
  profile: ProfileData,
  address: AddressData
): Promise<void> {
  if (!profile) return;
  await connection.execute<ResultSetHeader>(
    'INSERT INTO owner_profiles (owner_id, rfc, razon_social, telefono, especialidades, calle, numero_exterior, numero_interior, neighborhood_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      ownerId,
      profile.rfc || null,
      profile.razon_social || null,
      profile.telefono || null,
      roleId === 3 ? profile.especialidades || null : null,
      address?.calle || null,
      address?.numeroExt || null,
      address?.numeroInt || null,
      address?.neighborhoodId || null,
    ]
  );
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

async function resolveSuite(userId: number, roleId: number): Promise<'ERP' | 'VIM' | null> {
  if (roleId === 0) return null;
  const [suiteRows] = await db.execute<RowDataPacket[]>(
    'SELECT o.suite FROM owners o JOIN user_owner_membership uom ON o.id = uom.owner_id WHERE uom.user_id = ? LIMIT 1',
    [userId]
  );
  if (suiteRows.length > 0) return suiteRows[0].suite as 'ERP' | 'VIM';
  return null;
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

        let ownerType: 'FLOTILLA' | 'PRIVATE' | 'CENTER' | null = null;
        if (mapped.roleId === 1) ownerType = 'FLOTILLA';
        else if (mapped.roleId === 3) ownerType = 'CENTER';
        else if (mapped.roleId === 4) ownerType = 'PRIVATE';

        const suite = await resolveSuite(mapped.id, mapped.roleId);

        const token = fastify.jwt.sign({
          id: user.id,
          username: user.username,
          roleId: mapped.roleId,
          roleName: mapped.roleName,
          permissions,
          type: 'access',
          owner_type: ownerType,
          suite,
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
          .send({ success: true, token, user: { ...mapped, permissions, ownerType, suite } });
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
      let ownerType: 'FLOTILLA' | 'PRIVATE' | 'CENTER' | null = null;
      if (mapped.roleId === 1) ownerType = 'FLOTILLA';
      else if (mapped.roleId === 3) ownerType = 'CENTER';
      else if (mapped.roleId === 4) ownerType = 'PRIVATE';

      const suite = await resolveSuite(mapped.id, mapped.roleId);

      const accessToken = fastify.jwt.sign({
        id: user.id,
        username: user.username,
        roleId: mapped.roleId,
        roleName: mapped.roleName,
        permissions,
        type: 'access',
        owner_type: ownerType,
        suite,
      });
      return reply.send({
        success: true,
        token: accessToken,
        user: { ...mapped, permissions, ownerType, suite },
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

  fastify.post('/register', async (request, reply) => {
    const schema = z.object({
      username: z.string().min(3),
      email: z.string().email(),
      password: z
        .string()
        .min(10)
        .regex(/[A-Z]/, 'R3_UPPER')
        .regex(/[a-z]/, 'R3_LOWER')
        .regex(/\d/, 'R3_DIGIT')
        .regex(/[^A-Za-z0-9]/, 'R3_SPECIAL'),
      roleId: z
        .number()
        .int()
        .refine((id) => [1, 3, 4].includes(id), {
          message: 'roleId must be 1 (Flotilla), 3 (Centro) or 4 (Privado)',
        }),
      fullName: z.string().optional(),
      departmentId: z.number().int().optional(),
      employeeNumber: z.string().optional(),
      profile: z
        .object({
          rfc: z.string().min(1).max(20).optional(),
          razon_social: z.string().optional(),
          telefono: z.string().optional(),
          especialidades: z.string().optional(),
        })
        .optional(),
      address: z
        .object({
          neighborhoodId: z.number().int().positive(),
          calle: z.string().min(1).max(200),
          numeroExt: z.string().min(1).max(20),
          numeroInt: z.string().optional(),
        })
        .optional(),
      areas: z.array(z.string().min(1).max(100)).optional(),
    });
    const body = schema.safeParse(request.body);
    if (!body.success) {
      return reply.code(400).send({ error: 'R1' });
    }
    const {
      username,
      email,
      password,
      roleId,
      fullName,
      departmentId,
      employeeNumber,
      profile,
      address,
      areas,
    } = body.data;

    if ([1, 3].includes(roleId) && !profile?.rfc) {
      return reply.code(400).send({ success: false, code: 'MISSING_RFC' });
    }

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
      const hash = await argon2Hash(password);
      const enc = EncryptionService.encrypt(email);

      return await withConnection(async (connection) => {
        await connection.beginTransaction();
        try {
          const [res] = await connection.execute<ResultSetHeader>(
            'INSERT INTO users (username, email, password_hash, role_id, full_name, department_id, employee_number) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [
              username,
              enc,
              hash,
              roleId,
              fullName || '',
              departmentId || null,
              employeeNumber || null,
            ]
          );
          const userId = res.insertId;
          let ownerType: OwnerType;
          if (roleId === 1) ownerType = 'FLOTILLA';
          else if (roleId === 4) ownerType = 'PRIVATE';
          else ownerType = 'CENTER';
          const ownerLabel = fullName || username;

          const ownerId = await resolveOwnerRow(connection, userId, ownerLabel, ownerType);

          await connection.execute<ResultSetHeader>(
            'INSERT IGNORE INTO user_owner_membership (user_id, owner_id) VALUES (?, ?)',
            [userId, ownerId]
          );

          await insertOwnerProfile(connection, ownerId, roleId, profile, address);

          if (roleId === 1 && areas && areas.length > 0) {
            await Promise.all(
              areas.map((areaName) =>
                connection.execute<ResultSetHeader>(
                  'INSERT INTO areas (owner_id, name) VALUES (?, ?)',
                  [ownerId, areaName]
                )
              )
            );
          }

          await connection.commit();
          return reply.code(201).send({ success: true, userId });
        } catch (error) {
          await connection.rollback();
          throw error;
        }
      });
    } catch (e) {
      fastify.log.error(e);
      return reply.code(500).send({ error: 'REG_FAIL' });
    }
  });

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
    preHandler: [requirePermission('user:admin')],
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
        `SELECT uom.owner_id AS ownerId, o.label
         FROM user_owner_membership uom
         JOIN owners o ON o.id = uom.owner_id
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

  // ──────────────────────────────────────────────────────────────────────────
  // Archon Master: create sub-user (Área role_id=2 / Familiar role_id=5)
  // Guard: caller must own the parentOwnerId via user_owner_membership
  // ──────────────────────────────────────────────────────────────────────────
  fastify.post('/sub-users', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.code(401).send({ error: 'Session required' });
    }
    const caller = request.user as { id: number };

    const schema = z.object({
      username: z.string().min(3),
      email: z.string().email(),
      password: z
        .string()
        .min(10)
        .regex(/[A-Z]/, 'R3_UPPER')
        .regex(/[a-z]/, 'R3_LOWER')
        .regex(/\d/, 'R3_DIGIT')
        .regex(/[^A-Za-z0-9]/, 'R3_SPECIAL'),
      roleId: z
        .number()
        .int()
        .refine((id) => [2, 4, 5].includes(id), {
          message: 'roleId must be 2 (Área), 4 (Privado) or 5 (Familiar)',
        }),
      parentOwnerId: z.number().int().positive(),
      areaId: z.number().int().positive().optional(),
      familiarType: z.enum(['PAREJA', 'HIJO_A']).optional(),
      fullName: z.string().optional(),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'SU_VALIDATION', details: parsed.error.format() });
    }
    const { username, email, password, roleId, parentOwnerId, areaId, familiarType, fullName } =
      parsed.data;

    const [callerOwnerRows] = await db.execute<RowDataPacket[]>(
      'SELECT owner_id FROM user_owner_membership WHERE user_id = ?',
      [caller.id]
    );
    const callerOwnerIds = callerOwnerRows.map((r) => r.owner_id as number);
    if (!callerOwnerIds.includes(parentOwnerId)) {
      return reply.code(403).send({ error: 'OWNER_MISMATCH' });
    }

    const [ownerRows] = await db.execute<RowDataPacket[]>(
      'SELECT id, owner_type FROM owners WHERE id = ?',
      [parentOwnerId]
    );
    if (ownerRows.length === 0) {
      return reply.code(400).send({ error: 'OWNER_NOT_FOUND' });
    }
    const ownerType = ownerRows[0].owner_type as string;

    if (roleId === 2 && ownerType !== 'FLOTILLA') {
      return reply.code(400).send({ error: 'ROLE_OWNER_MISMATCH' });
    }
    if (roleId === 4 && ownerType !== 'CENTER') {
      return reply.code(400).send({ error: 'ROLE_OWNER_MISMATCH' });
    }
    if (roleId === 5 && ownerType !== 'PRIVATE') {
      return reply.code(400).send({ error: 'ROLE_OWNER_MISMATCH' });
    }

    if (roleId === 2) {
      if (!areaId) {
        return reply.code(400).send({ error: 'AREA_REQUIRED' });
      }
      const [areaRows] = await db.execute<RowDataPacket[]>(
        'SELECT id FROM areas WHERE id = ? AND owner_id = ? AND is_active = 1',
        [areaId, parentOwnerId]
      );
      if (areaRows.length === 0) {
        return reply.code(400).send({ error: 'AREA_NOT_FOUND' });
      }
    }

    if (roleId === 5 && !familiarType) {
      return reply.code(400).send({ error: 'FAMILIAR_TYPE_REQUIRED' });
    }

    const [existing] = await db.execute<RowDataPacket[]>(
      'SELECT id FROM users WHERE username = ?',
      [username]
    );
    if (existing.length > 0) {
      return reply.code(409).send({ error: 'SU_USERNAME_EXISTS' });
    }

    try {
      const passwordHash = await argon2Hash(password);
      const encEmail = EncryptionService.encrypt(email);

      return await withConnection(async (connection) => {
        await connection.beginTransaction();
        try {
          let membershipOwnerId = parentOwnerId;

          if (roleId === 4) {
            const [nextRows] = await connection.execute<RowDataPacket[]>(
              'SELECT COALESCE(MAX(id), 0) + 1 AS nextId FROM common_catalogs FOR UPDATE'
            );
            const newPrivateOwnerId = (nextRows as RowDataPacket[])[0].nextId as number;
            await connection.execute<ResultSetHeader>(
              "INSERT INTO common_catalogs (id, category, code, label) VALUES (?, 'FLEET_OWNER', ?, ?)",
              [newPrivateOwnerId, `OWN_U${newPrivateOwnerId}`, fullName || username]
            );
            await connection.execute<ResultSetHeader>(
              'INSERT INTO owners (id, owner_type, label, parent_owner_id) VALUES (?, ?, ?, ?)',
              [newPrivateOwnerId, 'PRIVATE', fullName || username, parentOwnerId]
            );
            membershipOwnerId = newPrivateOwnerId;
          }

          const [insertResult] = await connection.execute<ResultSetHeader>(
            'INSERT INTO users (username, email, password_hash, role_id, full_name, is_active) VALUES (?, ?, ?, ?, ?, 1)',
            [username, encEmail, passwordHash, roleId, fullName ?? '']
          );
          const newUserId = insertResult.insertId;

          await connection.execute('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)', [
            newUserId,
            roleId,
          ]);

          await connection.execute(
            'INSERT INTO user_owner_membership (user_id, owner_id, familiar_type, area_id) VALUES (?, ?, ?, ?)',
            [newUserId, membershipOwnerId, familiarType ?? null, areaId ?? null]
          );

          await connection.commit();
          return reply
            .code(201)
            .send({ success: true, data: { id: newUserId, username, roleId, parentOwnerId } });
        } catch (error) {
          await connection.rollback();
          throw error;
        }
      });
    } catch (e) {
      fastify.log.error(e);
      return reply.code(500).send({ error: 'SUB_USER_CREATE_FAIL' });
    }
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
