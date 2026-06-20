import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { PoolConnection } from 'mysql2/promise';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { hash as argon2Hash } from '@node-rs/argon2';
import { z } from 'zod';
import db from '../services/db';
import EncryptionService from '../services/encryption';
import requirePermission from '../middleware/requirePermission';
import withConnection from '../utils/withConnection';
import FleetService from '../services/fleetService';
import { resolveUniqueHandle } from '../utils/ownerHandle';

type OwnerType = 'FLOTILLA' | 'CENTER' | 'PRIVATE';

const suiteOf = (ownerType: OwnerType): 'ERP' | 'VIM' => (ownerType === 'FLOTILLA' ? 'ERP' : 'VIM');

type RouteGuard = {
  onRequest: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  preHandler: ((request: FastifyRequest, reply: FastifyReply) => Promise<void>)[];
};

const jwtGuard = (permission: string): RouteGuard => ({
  onRequest: async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    try {
      await request.jwtVerify();
    } catch {
      reply.code(401).send({ success: false, code: 'UNAUTHORIZED', message: 'Session required' });
    }
  },
  preHandler: [requirePermission(permission)],
});

const passwordSchema = z
  .string()
  .min(10)
  .regex(/[A-Z]/, 'R3_UPPER')
  .regex(/[a-z]/, 'R3_LOWER')
  .regex(/\d/, 'R3_DIGIT')
  .regex(/[^A-Za-z0-9]/, 'R3_SPECIAL');

const profileSchema = z
  .object({
    rfc: z.string().min(1).max(20).optional(),
    razon_social: z.string().optional(),
    telefono: z.string().optional(),
    especialidades: z.array(z.string().max(20)).max(19).optional(),
  })
  .optional();

const addressSchema = z
  .object({
    neighborhoodId: z.number().int().positive(),
    calle: z.string().min(1).max(200),
    numeroExt: z.string().min(1).max(20),
    numeroInt: z.string().optional(),
  })
  .optional();

async function createOwnerWithUser(
  connection: PoolConnection,
  params: {
    username: string;
    email: string;
    password: string;
    roleId: number;
    ownerType: OwnerType;
    fullName?: string;
    parentOwnerId?: number;
    profile?: z.infer<typeof profileSchema>;
    address?: z.infer<typeof addressSchema>;
    areas?: string[];
  }
): Promise<{ userId: number; ownerId: number }> {
  const {
    username,
    email,
    password,
    roleId,
    ownerType,
    fullName,
    parentOwnerId,
    profile,
    address,
    areas,
  } = params;
  const hash = await argon2Hash(password);
  const enc = EncryptionService.encrypt(email);
  const suite = suiteOf(ownerType);

  const [res] = await connection.execute<ResultSetHeader>(
    'INSERT INTO users (username, email, password_hash, role_id, full_name) VALUES (?, ?, ?, ?, ?)',
    [username, enc, hash, roleId, fullName || '']
  );
  const userId = res.insertId;

  const ownerLabel = fullName || username;
  const [nextRows] = await connection.execute<RowDataPacket[]>(
    'SELECT COALESCE(MAX(id), 0) + 1 AS nextId FROM common_catalogs FOR UPDATE'
  );
  const ownerId = (nextRows as RowDataPacket[])[0].nextId as number;

  await connection.execute<ResultSetHeader>(
    "INSERT INTO common_catalogs (id, category, code, label) VALUES (?, 'FLEET_OWNER', ?, ?)",
    [ownerId, `OWN_U${userId}`, ownerLabel]
  );
  const handle = await resolveUniqueHandle(connection, suite, profile?.rfc, username);
  await connection.execute<ResultSetHeader>(
    'INSERT INTO owners (id, owner_type, suite, label, parent_owner_id, handle) VALUES (?, ?, ?, ?, ?, ?)',
    [ownerId, ownerType, suite, ownerLabel, parentOwnerId ?? null, handle]
  );
  await connection.execute<ResultSetHeader>(
    'INSERT IGNORE INTO user_owner_membership (user_id, owner_id) VALUES (?, ?)',
    [userId, ownerId]
  );
  await connection.execute<ResultSetHeader>(
    'INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)',
    [userId, roleId]
  );

  if (profile) {
    await connection.execute<ResultSetHeader>(
      'INSERT INTO owner_profiles (owner_id, rfc, razon_social, telefono, calle, numero_exterior, numero_interior, neighborhood_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        ownerId,
        profile.rfc || null,
        profile.razon_social || null,
        profile.telefono || null,
        address?.calle || null,
        address?.numeroExt || null,
        address?.numeroInt || null,
        address?.neighborhoodId || null,
      ]
    );
    if (roleId === 3 && profile.especialidades && profile.especialidades.length > 0) {
      await Promise.all(
        profile.especialidades.map((code) =>
          connection.execute<ResultSetHeader>(
            `INSERT IGNORE INTO owner_specialties (owner_id, catalog_id)
             SELECT ?, id FROM common_catalogs WHERE category = 'SPECIALTY' AND code = ? LIMIT 1`,
            [ownerId, code]
          )
        )
      );
    }
  }

  if (roleId === 1 && areas && areas.length > 0) {
    await Promise.all(
      areas.map((areaName) =>
        connection.execute<ResultSetHeader>('INSERT INTO areas (owner_id, name) VALUES (?, ?)', [
          ownerId,
          areaName,
        ])
      )
    );
  }

  return { userId, ownerId };
}

export default async function onboardingRoutes(fastify: FastifyInstance): Promise<void> {
  // ─── POST /onboarding/universe — Archon only ──────────────────────────────
  // Creates a top-level universe (ERP: P.Flotilla / VIM: Centro Especializado)
  // with its root admin user in a single transaction.
  fastify.post('/onboarding/universe', jwtGuard('*'), async (request, reply) => {
    const schema = z.object({
      username: z.string().min(3),
      email: z.string().email(),
      password: passwordSchema,
      roleId: z
        .number()
        .int()
        .refine((id) => [1, 3].includes(id), {
          message: 'roleId must be 1 (Flotilla/ERP) or 3 (Centro/VIM)',
        }),
      fullName: z.string().optional(),
      profile: profileSchema,
      address: addressSchema,
      areas: z.array(z.string()).optional(),
    });

    const body = schema.safeParse(request.body);
    if (!body.success) {
      return reply
        .code(400)
        .send({ success: false, code: 'VALIDATION_ERROR', message: body.error.issues[0]?.message });
    }
    const { username, email, password, roleId, fullName, profile, address, areas } = body.data;

    if (!profile?.rfc) {
      return reply.code(400).send({ success: false, code: 'MISSING_RFC' });
    }

    const [existing] = await db.execute<RowDataPacket[]>(
      'SELECT id FROM users WHERE username = ?',
      [username]
    );
    if (existing.length > 0) {
      return reply
        .code(409)
        .send({ success: false, code: 'CONFLICT', message: 'Username already exists' });
    }

    const ownerType: OwnerType = roleId === 1 ? 'FLOTILLA' : 'CENTER';

    return withConnection(async (connection) => {
      await connection.beginTransaction();
      try {
        const { userId, ownerId } = await createOwnerWithUser(connection, {
          username,
          email,
          password,
          roleId,
          ownerType,
          fullName,
          profile,
          address,
          areas,
        });
        await connection.commit();
        return reply.code(201).send({ success: true, userId, ownerId, suite: suiteOf(ownerType) });
      } catch (error) {
        await connection.rollback();
        throw error;
      }
    });
  });

  // ─── POST /onboarding/client — Centro Especializado ───────────────────────
  // Creates a P.Privado (roleId=4, new child owner) or Familiar (roleId=5,
  // under an existing P.Privado owner) within the caller's VIM universe.
  // Anti-IDOR: parentOwnerId is derived from the caller's scope, not user input.
  fastify.post('/onboarding/client', jwtGuard('user:admin'), async (request, reply) => {
    const { id: callerId, roleId: callerRoleId } = request.user as { id: number; roleId: number };

    if (callerRoleId !== 3) {
      return reply.code(403).send({
        success: false,
        code: 'FORBIDDEN',
        message: 'Only Centro Especializado can onboard clients',
      });
    }

    const schema = z.object({
      username: z.string().min(3),
      email: z.string().email(),
      password: passwordSchema,
      roleId: z
        .number()
        .int()
        .refine((id) => [4, 5].includes(id), {
          message: 'roleId must be 4 (Privado) or 5 (Familiar)',
        }),
      targetOwnerId: z.number().int().positive().optional(),
      fullName: z.string().optional(),
      profile: profileSchema,
      address: addressSchema,
    });

    const body = schema.safeParse(request.body);
    if (!body.success) {
      return reply
        .code(400)
        .send({ success: false, code: 'VALIDATION_ERROR', message: body.error.issues[0]?.message });
    }
    const { username, email, password, roleId, targetOwnerId, fullName, profile, address } =
      body.data;

    const callerOwnerIds = await FleetService.getUserOwnerIds(callerId);
    if (callerOwnerIds.length === 0) {
      return reply.code(400).send({ success: false, code: 'OWNER_NOT_FOUND' });
    }
    const callerOwnerId = callerOwnerIds[0];

    if (roleId === 5) {
      if (!targetOwnerId) {
        return reply.code(400).send({
          success: false,
          code: 'VALIDATION_ERROR',
          message: 'targetOwnerId required for Familiar',
        });
      }
      // Anti-IDOR: verify targetOwnerId is a direct child of callerOwnerId
      const [childRows] = await db.execute<RowDataPacket[]>(
        'SELECT id FROM owners WHERE id = ? AND parent_owner_id = ?',
        [targetOwnerId, callerOwnerId]
      );
      if (childRows.length === 0) {
        return reply.code(403).send({
          success: false,
          code: 'FORBIDDEN',
          message: 'Target owner outside your universe',
        });
      }
    }

    const [existing] = await db.execute<RowDataPacket[]>(
      'SELECT id FROM users WHERE username = ?',
      [username]
    );
    if (existing.length > 0) {
      return reply
        .code(409)
        .send({ success: false, code: 'CONFLICT', message: 'Username already exists' });
    }

    return withConnection(async (connection) => {
      await connection.beginTransaction();
      try {
        if (roleId === 4) {
          const { userId, ownerId } = await createOwnerWithUser(connection, {
            username,
            email,
            password,
            roleId,
            ownerType: 'PRIVATE',
            fullName,
            parentOwnerId: callerOwnerId,
            profile,
            address,
          });
          await connection.commit();
          return reply.code(201).send({ success: true, userId, ownerId });
        }
        // Familiar: share existing P.Privado owner — no new owner row
        // targetOwnerId is guaranteed defined: validated in the roleId===5 guard above
        const confirmedOwnerId = targetOwnerId as number;
        const hash = await argon2Hash(password);
        const enc = EncryptionService.encrypt(email);
        const [res] = await connection.execute<ResultSetHeader>(
          'INSERT INTO users (username, email, password_hash, role_id, full_name) VALUES (?, ?, ?, ?, ?)',
          [username, enc, hash, roleId, fullName || '']
        );
        const userId = res.insertId;
        await connection.execute<ResultSetHeader>(
          'INSERT IGNORE INTO user_owner_membership (user_id, owner_id) VALUES (?, ?)',
          [userId, confirmedOwnerId]
        );
        await connection.execute<ResultSetHeader>(
          'INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)',
          [userId, roleId]
        );
        await connection.commit();
        return reply.code(201).send({ success: true, userId, ownerId: confirmedOwnerId });
      } catch (error) {
        await connection.rollback();
        throw error;
      }
    });
  });

  // ─── GET /onboarding/universes — Archon only ─────────────────────────────
  // Returns all top-level universe roots (FLOTILLA + CENTER) with their root
  // user and profile data. Only callable by Archon (permission '*').
  fastify.get('/onboarding/universes', jwtGuard('*'), async (_request, reply) => {
    try {
      const [rows] = await db.execute<RowDataPacket[]>(
        `SELECT
           o.id          AS owner_id,
           o.owner_type,
           o.suite,
           o.label,
           u.id          AS user_id,
           u.username,
           u.full_name,
           u.is_active,
           op.rfc,
           op.razon_social,
           op.telefono,
           (SELECT JSON_ARRAYAGG(cc.code)
            FROM owner_specialties os
            JOIN common_catalogs cc ON cc.id = os.catalog_id
            WHERE os.owner_id = o.id) AS especialidades
         FROM owners o
         JOIN user_owner_membership m ON m.owner_id = o.id
         JOIN users u ON u.id = m.user_id
         LEFT JOIN owner_profiles op ON op.owner_id = o.id
         WHERE o.owner_type IN ('FLOTILLA', 'CENTER')
           AND o.parent_owner_id IS NULL
         ORDER BY o.id DESC`,
        []
      );
      return reply.send({ success: true, data: rows });
    } catch (e) {
      fastify.log.error(e);
      return reply.code(500).send({ success: false, code: 'UNIVERSES_FETCH_FAIL' });
    }
  });

  // ─── POST /onboarding/member — Propietario de Flotilla ────────────────────
  // Creates an Área member (roleId=2) under the caller's ERP universe owner.
  // Anti-IDOR: owner is always the caller's own owner — no input to hijack.
  fastify.post('/onboarding/member', jwtGuard('user:admin'), async (request, reply) => {
    const { id: callerId, roleId: callerRoleId } = request.user as { id: number; roleId: number };

    if (callerRoleId !== 1) {
      return reply.code(403).send({
        success: false,
        code: 'FORBIDDEN',
        message: 'Only Propietario de Flotilla can onboard members',
      });
    }

    const schema = z.object({
      username: z.string().min(3),
      email: z.string().email(),
      password: passwordSchema,
      fullName: z.string().optional(),
    });

    const body = schema.safeParse(request.body);
    if (!body.success) {
      return reply
        .code(400)
        .send({ success: false, code: 'VALIDATION_ERROR', message: body.error.issues[0]?.message });
    }
    const { username, email, password, fullName } = body.data;

    const callerOwnerIds = await FleetService.getUserOwnerIds(callerId);
    if (callerOwnerIds.length === 0) {
      return reply.code(400).send({ success: false, code: 'OWNER_NOT_FOUND' });
    }
    const callerOwnerId = callerOwnerIds[0];

    const [existing] = await db.execute<RowDataPacket[]>(
      'SELECT id FROM users WHERE username = ?',
      [username]
    );
    if (existing.length > 0) {
      return reply
        .code(409)
        .send({ success: false, code: 'CONFLICT', message: 'Username already exists' });
    }

    return withConnection(async (connection) => {
      await connection.beginTransaction();
      try {
        const hash = await argon2Hash(password);
        const enc = EncryptionService.encrypt(email);
        const [res] = await connection.execute<ResultSetHeader>(
          'INSERT INTO users (username, email, password_hash, role_id, full_name) VALUES (?, ?, ?, ?, ?)',
          [username, enc, hash, 2, fullName || '']
        );
        const userId = res.insertId;
        await connection.execute<ResultSetHeader>(
          'INSERT IGNORE INTO user_owner_membership (user_id, owner_id) VALUES (?, ?)',
          [userId, callerOwnerId]
        );
        await connection.execute<ResultSetHeader>(
          'INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)',
          [userId, 2]
        );
        await connection.commit();
        return reply.code(201).send({ success: true, userId, ownerId: callerOwnerId });
      } catch (error) {
        await connection.rollback();
        throw error;
      }
    });
  });
}
