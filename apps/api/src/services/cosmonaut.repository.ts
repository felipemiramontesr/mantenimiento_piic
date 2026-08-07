import { Pool, PoolConnection } from 'mysql2/promise';
import { RowDataPacket } from 'mysql2';
import db from './db';

/**
 * FC130 F1 — SQL boundary for cosmonaut permission/tenant-assignment resolution.
 * All 11 call-sites previously embedded in cosmonautMiddleware.ts (I3) — same
 * literal queries, only relocated. `executor` follows the FC126 pattern
 * (catalogMapper.ts::resolveCatalogId) so callers may pass a pool or an open
 * transaction connection.
 */
type Executor = Pool | PoolConnection;

/** Union of permission slugs from cosmonaut roles assigned to userId in tenantId (R_global ∪ R_universe). */
export async function findEffectivePermissionSlugs(
  userId: number,
  tenantId: number | null,
  executor: Executor = db
): Promise<string[]> {
  const [rows] = await executor.execute<RowDataPacket[]>(
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

/** `cosmonaut_type` of userId's membership in tenantId, or null if no row exists. */
export async function findCosmonautType(
  userId: number,
  tenantId: number,
  executor: Executor = db
): Promise<string | null> {
  const [rows] = await executor.execute<RowDataPacket[]>(
    `SELECT cosmonaut_type FROM tenant_user_memberships
     WHERE user_id = ? AND owner_id = ? LIMIT 1`,
    [userId, tenantId]
  );
  return rows.length > 0 ? (rows[0].cosmonaut_type as string) : null;
}

/** True if userId has role_id=0 (Ω) — used by antiEscalationGuard's Ω bypass. */
export async function isOmegaUser(userId: number, executor: Executor = db): Promise<boolean> {
  const [rows] = await executor.execute<RowDataPacket[]>(
    'SELECT role_id FROM users WHERE id = ? AND role_id = 0 LIMIT 1',
    [userId]
  );
  return rows.length > 0;
}

/** Permission slugs granted by roleId — used by antiEscalationGuard to detect escalation. */
export async function findRolePermissionSlugs(
  roleId: number,
  executor: Executor = db
): Promise<string[]> {
  const [rows] = await executor.execute<RowDataPacket[]>(
    `SELECT p.slug
     FROM cosmonaut_role_permissions crp
     JOIN permissions p ON p.id = crp.permission_id
     WHERE crp.role_id = ?`,
    [roleId]
  );
  return rows.map((r) => r.slug as string);
}

/** Active universe_lattice schema_definition linking tenantId to another Universe, if any. */
export async function findActiveLatticeSchema(
  tenantId: number,
  executor: Executor = db
): Promise<string | null> {
  const [rows] = await executor.execute<RowDataPacket[]>(
    `SELECT schema_definition FROM universe_lattices
     WHERE (u1_tenant_id = ? OR u2_tenant_id = ?)
       AND status = 'ACTIVE'
     LIMIT 1`,
    [tenantId, tenantId]
  );
  return rows.length > 0 ? (rows[0].schema_definition as string) : null;
}

/** Raw tenant_user_memberships.owner_id rows for userId (§9.1 primary-tenant resolution). */
export async function findTenantMembershipOwnerIds(
  userId: number,
  executor: Executor = db
): Promise<number[]> {
  const [rows] = await executor.execute<RowDataPacket[]>(
    'SELECT owner_id FROM tenant_user_memberships WHERE user_id = ?',
    [userId]
  );
  return rows.map((r) => r.owner_id as number);
}

/** Earliest active cosmonaut_role_assignments.tenant_id for userId (§9.1 priority-2 fallback). */
export async function findEarliestActiveAssignmentTenantId(
  userId: number,
  executor: Executor = db
): Promise<number | null> {
  const [rows] = await executor.execute<RowDataPacket[]>(
    `SELECT tenant_id FROM cosmonaut_role_assignments
     WHERE user_id = ? AND revoked_at IS NULL AND tenant_id IS NOT NULL
     ORDER BY id ASC LIMIT 1`,
    [userId]
  );
  return rows.length > 0 ? (rows[0].tenant_id as number) : null;
}

/** Union of formal membership + active-assignment tenant IDs (switcher candidate list). */
export async function findAvailableTenantIds(
  userId: number,
  executor: Executor = db
): Promise<number[]> {
  const [rows] = await executor.execute<RowDataPacket[]>(
    `SELECT owner_id AS tenantId FROM tenant_user_memberships WHERE user_id = ?
     UNION
     SELECT tenant_id AS tenantId FROM cosmonaut_role_assignments
     WHERE user_id = ? AND revoked_at IS NULL AND tenant_id IS NOT NULL`,
    [userId, userId]
  );
  return rows.map((r) => r.tenantId as number);
}

/** owner_types_catalog.code for tenantId, or null if the tenant has no matching row. */
export async function findOwnerTypeCode(
  tenantId: number,
  executor: Executor = db
): Promise<string | null> {
  const [rows] = await executor.execute<RowDataPacket[]>(
    `SELECT otc.code FROM tenants t
     JOIN owner_types_catalog otc ON otc.id = t.owner_type_id
     WHERE t.id = ?`,
    [tenantId]
  );
  return rows.length > 0 ? (rows[0].code as string) : null;
}

/** True if userId has a formal membership row for tenantId. */
export async function hasTenantMembership(
  userId: number,
  tenantId: number,
  executor: Executor = db
): Promise<boolean> {
  const [rows] = await executor.execute<RowDataPacket[]>(
    'SELECT 1 FROM tenant_user_memberships WHERE user_id = ? AND owner_id = ? LIMIT 1',
    [userId, tenantId]
  );
  return rows.length > 0;
}

/** True if userId has an active (non-revoked) cosmonaut_role_assignments row for tenantId. */
export async function hasActiveAssignment(
  userId: number,
  tenantId: number,
  executor: Executor = db
): Promise<boolean> {
  const [rows] = await executor.execute<RowDataPacket[]>(
    'SELECT 1 FROM cosmonaut_role_assignments WHERE user_id = ? AND tenant_id = ? AND revoked_at IS NULL LIMIT 1',
    [userId, tenantId]
  );
  return rows.length > 0;
}
