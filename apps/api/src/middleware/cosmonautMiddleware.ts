import { FastifyRequest, FastifyReply } from 'fastify';
import { RowDataPacket } from 'mysql2';
import db from '../services/db';

/**
 * FC24 FaseC — Cosmonaut Middleware
 * Implements: resolveEffectivePermissions · requireMuOrOmega · requireOmega · antiEscalationGuard
 * Invariants enforced: I2/I3 (MU unique) · I8 (anti-escalation) · I9 (R_global immutable)
 */

/** Union of all permission slugs from cosmonaut roles assigned to a user in a given Universe.
 *  Includes R_global assignments (tenant_id IS NULL) + R_universe assignments (tenant_id = tenantId).
 *  Returns [] if user has no cosmonaut role assignments.
 */
export async function resolveEffectivePermissions(
  userId: number,
  tenantId: number | null
): Promise<string[]> {
  const [rows] = await db.execute<RowDataPacket[]>(
    `SELECT DISTINCT p.slug
     FROM cosmonaut_role_assignments cra
     JOIN cosmonaut_roles cr          ON cr.id  = cra.role_id
     JOIN cosmonaut_role_permissions crp ON crp.role_id = cr.id
     JOIN permissions p               ON p.id   = crp.permission_id
     WHERE cra.user_id = ?
       AND cra.revoked_at IS NULL
       AND (cra.tenant_id = ? OR cra.tenant_id IS NULL)`,
    [userId, tenantId]
  );
  return rows.map((r) => r.slug as string);
}

/** Prehandler: caller must be Ω (roleId=0) OR have cosmonaut_type='MU' in the given Universe.
 *  Used to protect MU-only operations scoped to a specific tenant.
 *  tenantId maps to tenant_user_memberships.owner_id (column not renamed in migration 149).
 */
export function requireMuOrOmega(
  tenantId: number
): (request: FastifyRequest, reply: FastifyReply) => Promise<void> {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const caller = request.user as { id: number; roleId?: number; permissions?: string[] };

    // Ω bypass — roleId=0 or wildcard permissions
    if (caller.roleId === 0 || (caller.permissions ?? []).includes('*')) return;

    const [rows] = await db.execute<RowDataPacket[]>(
      `SELECT cosmonaut_type FROM tenant_user_memberships
       WHERE user_id = ? AND owner_id = ? LIMIT 1`,
      [caller.id, tenantId]
    );
    if (rows.length === 0 || (rows[0].cosmonaut_type as string) !== 'MU') {
      reply.code(403).send({
        success: false,
        code: 'FORBIDDEN',
        message: 'MU or Ω required for this operation',
      });
    }
  };
}

/** Prehandler: caller must be Ω (roleId=0). Protects R_global mutations and MU creation. */
export function requireOmega(): (request: FastifyRequest, reply: FastifyReply) => Promise<void> {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const caller = request.user as { roleId?: number; permissions?: string[] };
    if (caller.roleId === 0 || (caller.permissions ?? []).includes('*')) return;
    reply.code(403).send({
      success: false,
      code: 'FORBIDDEN',
      message: 'Only Ω can perform this operation',
    });
  };
}

/** I8 — Anti-escalation guard.
 *  Verifies that every permission in the target role is already held by the grantor in the Universe.
 *  Lattice exception: cross-Universe grants are allowed if an active universe_lattice links the
 *  grantor's Universe to the target Universe with JSON_CONTAINS on schema_definition.
 *  Returns true if grant is allowed, false if escalation detected.
 */
export async function antiEscalationGuard(
  grantorId: number,
  tenantId: number | null,
  roleId: number
): Promise<boolean> {
  const grantorPerms = await resolveEffectivePermissions(grantorId, tenantId);

  // Ω holds '*' via legacy permissions — full bypass
  const [omegaCheck] = await db.execute<RowDataPacket[]>(
    'SELECT role_id FROM users WHERE id = ? AND role_id = 0 LIMIT 1',
    [grantorId]
  );
  if (omegaCheck.length > 0) return true;

  // Get permissions of the role being granted
  const [rolePerms] = await db.execute<RowDataPacket[]>(
    `SELECT p.slug
     FROM cosmonaut_role_permissions crp
     JOIN permissions p ON p.id = crp.permission_id
     WHERE crp.role_id = ?`,
    [roleId]
  );
  const roleSlugs = rolePerms.map((r) => r.slug as string);

  // I8: every role permission must be in grantor's effective permissions
  const escalated = roleSlugs.filter((slug) => !grantorPerms.includes(slug));
  if (escalated.length === 0) return true;

  // Lattice exception (OQ-4 AG): check if an active Lattice grants cross-Universe access
  if (tenantId !== null) {
    const [lattices] = await db.execute<RowDataPacket[]>(
      `SELECT schema_definition FROM universe_lattices
       WHERE (u1_tenant_id = ? OR u2_tenant_id = ?)
         AND status = 'ACTIVE'
       LIMIT 1`,
      [tenantId, tenantId]
    );
    if (lattices.length > 0) {
      const schema = lattices[0].schema_definition as string;
      const allowed = escalated.every((slug) => {
        try {
          return JSON.parse(schema)?.cross_permissions?.includes(slug) === true;
        } catch {
          return false;
        }
      });
      if (allowed) return true;
    }
  }

  return false;
}
