import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { z } from 'zod';
import db from '../../services/db';
import {
  requireOmega,
  requireMuOrOmega,
  resolveEffectivePermissions,
} from '../../middleware/cosmonautMiddleware';

const createRoleSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  tenantId: z.number().int().positive(),
  permissions: z.array(z.string()).default([]),
});

type CreateRolePayload = z.infer<typeof createRoleSchema>;

// GET /v1/cosmonauts/roles?tenantId=X
// Lists R_global + R_universe roles available in the given Universe.
async function handleListRoles(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<FastifyReply> {
  try {
    await request.jwtVerify();
  } catch {
    return reply.code(401).send({ success: false, code: 'UNAUTHORIZED' });
  }
  const { tenantId } = request.query as { tenantId?: string };
  const tid = tenantId ? Number(tenantId) : null;

  const [rows] = await db.execute<RowDataPacket[]>(
    `SELECT cr.id, cr.tenant_id, cr.name, cr.description, cr.is_system,
            COUNT(crp.permission_id) AS permission_count
     FROM cosmonaut_roles cr
     LEFT JOIN cosmonaut_role_permissions crp ON crp.role_id = cr.id
     WHERE cr.tenant_id IS NULL OR cr.tenant_id = ?
     GROUP BY cr.id
     ORDER BY cr.is_system DESC, cr.name ASC`,
    [tid ?? 0]
  );
  return reply.send({ success: true, data: rows });
}

/** Autenticación + validación + guard MU/Ω + anti-escalación (I8) del POST de
 * creación de rol — extraída de `handleCreateRole` para respetar el cap de 50
 * líneas de Gate 2 (FC166 Track D). Retorna `null` si ya se envió una reply
 * (early-exit: 401/400/403/guard MU-Ω), o el payload validado + el id del
 * caller listos para crear el rol. */
async function authorizeAndValidateRoleCreate(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<{ payload: CreateRolePayload; callerId: number } | null> {
  try {
    await request.jwtVerify();
  } catch {
    await reply.code(401).send({ success: false, code: 'UNAUTHORIZED' });
    return null;
  }

  const parsed = createRoleSchema.safeParse(request.body);
  if (!parsed.success) {
    await reply
      .code(400)
      .send({ success: false, code: 'VALIDATION_ERROR', errors: parsed.error.flatten() });
    return null;
  }
  const payload = parsed.data;

  // MU or Ω required for the target Universe
  await requireMuOrOmega(payload.tenantId)(request, reply);
  if (reply.sent) return null;

  const caller = request.user as { id: number; roleId?: number };

  // I8: anti-escalation — grantor must hold every permission to be assigned to the new role
  const grantorPerms = await resolveEffectivePermissions(caller.id, payload.tenantId);
  const isOmega = caller.roleId === 0;

  if (!isOmega && payload.permissions.length > 0) {
    const missing = payload.permissions.filter((slug) => !grantorPerms.includes(slug));
    if (missing.length > 0) {
      await reply.code(403).send({
        success: false,
        code: 'PRIVILEGE_ESCALATION',
        message: 'Privilege escalation denied',
        details: missing,
      });
      return null;
    }
  }

  return { payload, callerId: caller.id };
}

/** Resuelve los ids de permiso a partir de sus slugs — extraída del mismo
 * motivo (Gate 2). Retorna `null` (tras enviar la reply 400) si algún slug
 * no existe. */
async function resolvePermissionRowsForCreate(
  permissions: string[],
  reply: FastifyReply
): Promise<RowDataPacket[] | null> {
  if (permissions.length === 0) return [];

  const placeholders = permissions.map(() => '?').join(',');
  const [permRows] = await db.execute<RowDataPacket[]>(
    `SELECT id, slug FROM permissions WHERE slug IN (${placeholders})`,
    permissions
  );
  if (permRows.length !== permissions.length) {
    const found = new Set(permRows.map((p) => p.slug as string));
    const unknown = permissions.filter((s) => !found.has(s));
    await reply.code(400).send({ success: false, code: 'UNKNOWN_PERMISSIONS', details: unknown });
    return null;
  }
  return permRows;
}

/** Transacción de inserción del rol + sus permisos — extraída del mismo
 * motivo (Gate 2); mismo comportamiento verbatim. */
async function insertRoleWithPermissions(
  payload: CreateRolePayload,
  callerId: number,
  permRows: RowDataPacket[]
): Promise<number> {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.execute<ResultSetHeader>(
      'INSERT INTO cosmonaut_roles (tenant_id, name, description, is_system, created_by) VALUES (?, ?, ?, 0, ?)',
      [payload.tenantId, payload.name, payload.description ?? null, callerId]
    );
    const roleId = result.insertId;

    if (permRows.length > 0) {
      const permValues = permRows.map((p) => [roleId, p.id as number]);
      await conn.query('INSERT INTO cosmonaut_role_permissions (role_id, permission_id) VALUES ?', [
        permValues,
      ]);
    }

    await conn.commit();
    return roleId;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// POST /v1/cosmonauts/roles — create R_universe custom role (MU only, I9: cannot create R_global)
async function handleCreateRole(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<FastifyReply | undefined> {
  const authResult = await authorizeAndValidateRoleCreate(request, reply);
  if (!authResult) return undefined;
  const { payload, callerId } = authResult;

  const permRows = await resolvePermissionRowsForCreate(payload.permissions, reply);
  if (!permRows) return undefined;

  const roleId = await insertRoleWithPermissions(payload, callerId, permRows);
  return reply.code(201).send({
    success: true,
    data: {
      id: roleId,
      name: payload.name,
      tenantId: payload.tenantId,
      permissions: payload.permissions,
    },
  });
}

// DELETE /v1/cosmonauts/roles/:roleId — I9: Ω for R_global; MU for R_universe
async function handleDeleteRole(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<FastifyReply> {
  try {
    await request.jwtVerify();
  } catch {
    return reply.code(401).send({ success: false, code: 'UNAUTHORIZED' });
  }
  const { roleId } = request.params as { roleId: string };

  const [rows] = await db.execute<RowDataPacket[]>(
    'SELECT id, is_system, tenant_id FROM cosmonaut_roles WHERE id = ? LIMIT 1',
    [Number(roleId)]
  );
  if (rows.length === 0) {
    return reply.code(404).send({ success: false, code: 'NOT_FOUND' });
  }
  const role = rows[0];

  if (role.is_system === 1) {
    // I9: R_global roles are Ω-only
    await requireOmega()(request, reply);
    if (reply.sent) return reply;
    // Ω can delete — but in practice global system roles should not be deleted in prod
  } else {
    // R_universe: MU or Ω of the owning Universe
    await requireMuOrOmega(role.tenant_id as number)(request, reply);
    if (reply.sent) return reply;
  }

  await db.execute('DELETE FROM cosmonaut_roles WHERE id = ?', [Number(roleId)]);
  return reply.send({ success: true });
}

/** Fastify plugin — registra las rutas de gestión de roles de cosmonauta
 * (list/create/delete). */
export default async function cosmonautRolesRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/cosmonauts/roles', handleListRoles);
  fastify.post('/cosmonauts/roles', handleCreateRole);
  fastify.delete('/cosmonauts/roles/:roleId', handleDeleteRole);
}
