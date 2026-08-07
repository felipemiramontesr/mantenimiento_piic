import { FastifyRequest, FastifyReply } from 'fastify';
import * as CosmonautRepository from '../services/cosmonaut.repository';

/**
 * FC24 FaseC — Cosmonaut Middleware
 * Implements: resolveEffectivePermissions · requireMuOrOmega · requireOmega · antiEscalationGuard
 * Invariants enforced: I2/I3 (MU unique) · I8 (anti-escalation) · I9 (R_global immutable)
 *
 * FC082 F3b — Auth Cutover (089_AN §9, O✓Alfa/R✓Bravo 1ª+2ª ronda):
 * resolvePrimaryTenant · getAvailableTenants · deriveOwnerType ·
 * isTenantAssignmentActive · resolveAuthContext · resolveAuthContextForRefresh
 *
 * FC130 F1 — zero-SQL (I2): toda persistencia delega a `cosmonaut.repository.ts`
 * (Alfa 130_AN §2, Cond.R-130-E2 — INCLUSIÓN OBLIGATORIA). API pública sin cambio.
 */

/** R2a (Bravo, 2ª ronda) — thrown when a user has >1 row in tenant_user_memberships.
 *  The schema (UNIQUE(user_id,owner_id), migración 109) allows this; the product does not
 *  yet have a defined "multi-home" resolution rule. Fail-closed: HALT, never choose silently.
 */
export class MultiMembershipHaltError extends Error {
  constructor(public readonly userId: number, public readonly tenantIds: number[]) {
    super(
      `R2a HALT: user ${userId} has ${
        tenantIds.length
      } tenant_user_memberships rows (${tenantIds.join(
        ','
      )}) — requires Ω resolution, no silent choice`
    );
    this.name = 'MultiMembershipHaltError';
  }
}

/** Union of all permission slugs from cosmonaut roles assigned to a user in a given Universe.
 *  Includes R_global assignments (tenant_id IS NULL) + R_universe assignments (tenant_id = tenantId).
 *  Returns [] if user has no cosmonaut role assignments.
 */
export async function resolveEffectivePermissions(
  userId: number,
  tenantId: number | null
): Promise<string[]> {
  return CosmonautRepository.findEffectivePermissionSlugs(userId, tenantId);
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

    const cosmonautType = await CosmonautRepository.findCosmonautType(caller.id, tenantId);
    if (cosmonautType !== 'MU') {
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
  if (await CosmonautRepository.isOmegaUser(grantorId)) return true;

  // Get permissions of the role being granted
  const roleSlugs = await CosmonautRepository.findRolePermissionSlugs(roleId);

  // I8: every role permission must be in grantor's effective permissions
  const escalated = roleSlugs.filter((slug) => !grantorPerms.includes(slug));
  if (escalated.length === 0) return true;

  // Lattice exception (OQ-4 AG): check if an active Lattice grants cross-Universe access
  if (tenantId !== null) {
    const schema = await CosmonautRepository.findActiveLatticeSchema(tenantId);
    if (schema !== null) {
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

/** §9.1 (089_AN) — regla determinista de tenant primario, sin columna is_primary.
 *  Prioridad 1: membresía formal en tenant_user_memberships (típico MU, migración 109).
 *  Prioridad 2: la asignación activa de menor id en cosmonaut_role_assignments con
 *  tenant_id no nulo (la primera responsabilidad de Universo que el Arc recibió).
 *  Ninguna de las dos: null (Arc Itinerante puro, K_itinerante §24.15).
 *  R2a: >1 fila en tenant_user_memberships para el mismo user_id → HALT, nunca elegir.
 */
export async function resolvePrimaryTenant(userId: number): Promise<number | null> {
  const ownerIds = await CosmonautRepository.findTenantMembershipOwnerIds(userId);
  if (ownerIds.length > 1) {
    throw new MultiMembershipHaltError(userId, ownerIds);
  }
  if (ownerIds.length === 1) {
    return ownerIds[0];
  }
  return CosmonautRepository.findEarliestActiveAssignmentTenantId(userId);
}

/** Universos disponibles para el switcher (Alfa, Opción B) — unión de la membresía
 *  formal y las asignaciones activas de rol, deduplicada. Base de anti-enumeración
 *  para POST /auth/switch-tenant (Cond.2 Bravo).
 */
export async function getAvailableTenants(userId: number): Promise<number[]> {
  return CosmonautRepository.findAvailableTenantIds(userId);
}

/** §9.3 (089_AN) — ownerType re-derivado (decisión de Alfa) desde el catálogo real,
 *  no del ENUM legacy retirado en migración 159/164. null si no hay tenant (Ω o Arc puro).
 */
export async function deriveOwnerType(tenantId: number | null): Promise<string | null> {
  if (tenantId === null) return null;
  return CosmonautRepository.findOwnerTypeCode(tenantId);
}

/** Verifica que el usuario tenga membresía formal o asignación activa en tenantId —
 *  usado por switch-tenant (Cond.2) y por el fail-safe de refresh (§9.2.1).
 */
export async function isTenantAssignmentActive(userId: number, tenantId: number): Promise<boolean> {
  if (await CosmonautRepository.hasTenantMembership(userId, tenantId)) return true;
  return CosmonautRepository.hasActiveAssignment(userId, tenantId);
}

export interface ResolvedAuthContext {
  tenantId: number | null;
  permissions: string[];
  ownerType: string | null;
  availableTenants: number[];
}

/** Punto único de resolución para /login y /me — Cond.7 "paridad login/me".
 *  Ω (roleId=0) nunca toca resolveEffectivePermissions (§6.4/Cond.1 — cosmonaut_roles
 *  GrayMan tiene 0 filas de permisos, el bypass '*' es intencionalmente runtime).
 */
export async function resolveAuthContext(
  userId: number,
  roleId: number
): Promise<ResolvedAuthContext> {
  if (roleId === 0) {
    return { tenantId: null, permissions: ['*'], ownerType: null, availableTenants: [] };
  }
  const tenantId = await resolvePrimaryTenant(userId);
  const [permissions, ownerType, availableTenants] = await Promise.all([
    resolveEffectivePermissions(userId, tenantId),
    deriveOwnerType(tenantId),
    getAvailableTenants(userId),
  ]);
  return { tenantId, permissions, ownerType, availableTenants };
}

/** §9.2.1 (089_AN) — fail-safe de /refresh: si el refresh token trae un tenant_id
 *  (cutover) y la asignación sigue activa, se re-firma CON ESE tenant, sin recalcular
 *  el primario (evita revertir un switch-tenant en silencio). Si el token es legacy
 *  (sin claim, R2c) o la asignación fue revocada, cae a resolveAuthContext desde cero.
 */
export async function resolveAuthContextForRefresh(
  userId: number,
  roleId: number,
  claimedTenantId: number | null | undefined
): Promise<ResolvedAuthContext> {
  if (roleId === 0) {
    return { tenantId: null, permissions: ['*'], ownerType: null, availableTenants: [] };
  }
  if (claimedTenantId !== undefined && claimedTenantId !== null) {
    const stillActive = await isTenantAssignmentActive(userId, claimedTenantId);
    if (stillActive) {
      const [permissions, ownerType, availableTenants] = await Promise.all([
        resolveEffectivePermissions(userId, claimedTenantId),
        deriveOwnerType(claimedTenantId),
        getAvailableTenants(userId),
      ]);
      return { tenantId: claimedTenantId, permissions, ownerType, availableTenants };
    }
  }
  return resolveAuthContext(userId, roleId);
}
