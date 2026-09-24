import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { z } from 'zod';
import db from '../../services/db';
import {
  requireMuOrOmega,
  resolveEffectivePermissions,
  antiEscalationGuard,
  isOmegaCaller,
  ceilEffectivePermissions,
} from '../../middleware/cosmonautMiddleware';

const assignRoleSchema = z.object({
  roleId: z.number().int().positive(),
  tenantId: z.number().int().positive(),
});

const createArcSchema = z.object({
  userId: z.number().int().positive(),
  tenantId: z.number().int().positive(),
  cosmonaut_type: z.enum(['ARC', 'MU']).default('ARC'),
});

/** FC194 (Cond.R-194 R1) — universo válido para el techo de permisos: entero > 0, o null. Sin universo
 *  válido (Arc itinerante, `?tenantId` ausente o no numérico) ⇒ 0 Supercúmulos activos, sin consultar
 *  capacidades: el mismo fail-closed que el gate de FC193 F2. */
function ceilingTenant(tid: number | null): number | null {
  return tid !== null && Number.isInteger(tid) && tid > 0 ? tid : null;
}

/** GET /v1/cosmonauts/me/permissions?tenantId=X — permisos efectivos del caller en ese Universo.
 *  FC194 R1a: el sujeto es el caller. Ω (`isOmegaCaller`) sale sin recorte y sin consultar capacidades;
 *  el resto pasa por el mismo techo que su sesión (FC193 F4). */
async function handleGetMyPermissions(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<FastifyReply> {
  try {
    await request.jwtVerify();
  } catch {
    return reply.code(401).send({ success: false, code: 'UNAUTHORIZED' });
  }
  const caller = request.user as { id: number; roleId?: number; permissions?: string[] };
  const { tenantId } = request.query as { tenantId?: string };
  const tid = tenantId ? Number(tenantId) : null;
  const raw = await resolveEffectivePermissions(caller.id, tid);
  const permissions = isOmegaCaller(caller)
    ? raw
    : await ceilEffectivePermissions(raw, ceilingTenant(tid));
  return reply.send({ success: true, data: { permissions } });
}

/** GET /v1/cosmonauts/arcs?tenantId=X — Arcs del Universo (Ax.2: solo el propio) con
 *  `effective_permissions` por Arc (OQ-5). FC194 R1b: el sujeto del techo es CADA Arc, no quien
 *  consulta — se techa siempre contra los Supercúmulos del `tenantId`, consulte un MU o Ω. */
async function handleListArcs(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
  try {
    await request.jwtVerify();
  } catch {
    return reply.code(401).send({ success: false, code: 'UNAUTHORIZED' });
  }
  const { tenantId } = request.query as { tenantId?: string };
  if (!tenantId) {
    return reply
      .code(400)
      .send({ success: false, code: 'VALIDATION_ERROR', message: 'tenantId required' });
  }
  const tid = Number(tenantId);

  // Verify caller is MU or Ω for this Universe
  await requireMuOrOmega(tid)(request, reply);
  if (reply.sent) return reply;

  const [arcs] = await db.execute<RowDataPacket[]>(
    `SELECT u.id, u.username, u.email, tum.cosmonaut_type, tum.owner_id AS tenant_id
     FROM tenant_user_memberships tum
     JOIN users u ON u.id = tum.user_id
     WHERE tum.owner_id = ? AND tum.cosmonaut_type = 'ARC'`,
    [tid]
  );

  // OQ-5: include effective_permissions per Arc
  const arcsWithPerms = await Promise.all(
    arcs.map(async (arc) => {
      const raw = await resolveEffectivePermissions(arc.id as number, tid);
      const permissions = await ceilEffectivePermissions(raw, ceilingTenant(tid));
      return { ...arc, effective_permissions: permissions };
    })
  );

  return reply.send({ success: true, data: arcsWithPerms });
}

/** POST /v1/cosmonauts/arcs — create/admit new Arc in the Universe (MU or Ω).
 *  I2/I3: cosmonaut_type='MU' requires Ω — MU cannot create another MU. */
async function handleCreateArc(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<FastifyReply> {
  try {
    await request.jwtVerify();
  } catch {
    return reply.code(401).send({ success: false, code: 'UNAUTHORIZED' });
  }

  const parsed = createArcSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply
      .code(400)
      .send({ success: false, code: 'VALIDATION_ERROR', errors: parsed.error.flatten() });
  }
  const { userId, tenantId, cosmonaut_type: cosmonautType } = parsed.data;

  // I2/I3: only Ω can create MU in a Universe
  if (cosmonautType === 'MU') {
    const callerUser = request.user as { roleId?: number; permissions?: string[] };
    const isOmega = callerUser.roleId === 0 || (callerUser.permissions ?? []).includes('*');
    if (!isOmega) {
      return reply.code(403).send({
        success: false,
        code: 'FORBIDDEN',
        message: 'Only Ω can create MU',
      });
    }
  } else {
    // ARC creation: MU or Ω of the Universe
    await requireMuOrOmega(tenantId)(request, reply);
    if (reply.sent) return reply;
  }

  // Verify target user exists
  const [userRows] = await db.execute<RowDataPacket[]>(
    'SELECT id FROM users WHERE id = ? LIMIT 1',
    [userId]
  );
  if (userRows.length === 0) {
    return reply.code(404).send({ success: false, code: 'USER_NOT_FOUND' });
  }

  // Insert membership (INSERT IGNORE for idempotency)
  await db.execute<ResultSetHeader>(
    `INSERT IGNORE INTO tenant_user_memberships (user_id, owner_id, cosmonaut_type)
       VALUES (?, ?, ?)`,
    [userId, tenantId, cosmonautType]
  );

  return reply
    .code(201)
    .send({ success: true, data: { userId, tenantId, cosmonaut_type: cosmonautType } });
}

/** POST /v1/cosmonauts/:userId/roles — assign role to Arc (MU or Ω, I8 anti-escalation). */
async function handleAssignRole(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<FastifyReply> {
  try {
    await request.jwtVerify();
  } catch {
    return reply.code(401).send({ success: false, code: 'UNAUTHORIZED' });
  }
  const { userId } = request.params as { userId: string };

  const parsed = assignRoleSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply
      .code(400)
      .send({ success: false, code: 'VALIDATION_ERROR', errors: parsed.error.flatten() });
  }
  const { roleId, tenantId } = parsed.data;

  await requireMuOrOmega(tenantId)(request, reply);
  if (reply.sent) return reply;

  const caller = request.user as { id: number };

  // I8: anti-escalation check
  const allowed = await antiEscalationGuard(caller.id, tenantId, roleId);
  if (!allowed) {
    return reply.code(403).send({
      success: false,
      code: 'PRIVILEGE_ESCALATION',
      message: 'Privilege escalation denied',
    });
  }

  // Verify target user is an Arc in this Universe
  const [memberRows] = await db.execute<RowDataPacket[]>(
    `SELECT cosmonaut_type FROM tenant_user_memberships
       WHERE user_id = ? AND owner_id = ? LIMIT 1`,
    [Number(userId), tenantId]
  );
  if (memberRows.length === 0) {
    return reply.code(404).send({
      success: false,
      code: 'ARC_NOT_FOUND',
      message: 'User is not a member of this Universe',
    });
  }

  await db.execute<ResultSetHeader>(
    `INSERT IGNORE INTO cosmonaut_role_assignments (user_id, role_id, tenant_id, assigned_by)
       VALUES (?, ?, ?, ?)`,
    [Number(userId), roleId, tenantId, caller.id]
  );

  return reply
    .code(201)
    .send({ success: true, data: { userId: Number(userId), roleId, tenantId } });
}

/** DELETE /v1/cosmonauts/:userId/roles/:roleId?tenantId=X — revoke role (MU or Ω). */
async function handleRevokeRole(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<FastifyReply> {
  try {
    await request.jwtVerify();
  } catch {
    return reply.code(401).send({ success: false, code: 'UNAUTHORIZED' });
  }
  const { userId, roleId } = request.params as { userId: string; roleId: string };
  const { tenantId } = request.query as { tenantId?: string };
  if (!tenantId) {
    return reply
      .code(400)
      .send({ success: false, code: 'VALIDATION_ERROR', message: 'tenantId required' });
  }
  const tid = Number(tenantId);

  await requireMuOrOmega(tid)(request, reply);
  if (reply.sent) return reply;

  const caller = request.user as { id: number };

  await db.execute(
    `UPDATE cosmonaut_role_assignments
       SET revoked_at = NOW(), revoked_by = ?
       WHERE user_id = ? AND role_id = ? AND tenant_id = ? AND revoked_at IS NULL`,
    [caller.id, Number(userId), Number(roleId), tid]
  );

  return reply.send({ success: true });
}

/** FC24 FaseC — rutas de asignación de Cosmonautas. FC194: handlers con nombre y registro delgado
 *  (mismo patrón que `auth.ts`/`fleetRoutes.ts`); `handleCreateArc`, `handleAssignRole` y
 *  `handleRevokeRole` se movieron sin cambiar una sola instrucción (extracción forzada por Gate 2:
 *  la función del plugin tenía 160 líneas efectivas y cualquier línea añadida la bloqueaba). */
export default async function cosmonautAssignmentsRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/cosmonauts/me/permissions', handleGetMyPermissions);
  fastify.get('/cosmonauts/arcs', handleListArcs);
  fastify.post('/cosmonauts/arcs', handleCreateArc);
  fastify.post('/cosmonauts/:userId/roles', handleAssignRole);
  fastify.delete('/cosmonauts/:userId/roles/:roleId', handleRevokeRole);
}
