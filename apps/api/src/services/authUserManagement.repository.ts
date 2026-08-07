import { Pool, PoolConnection } from 'mysql2/promise';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import db from './db';

/**
 * FC130 F1 — SQL boundary for user administration: list/update/delete users,
 * owner-membership management, GrayMan cosmonaut sync, and the `/users/:uuid/node`
 * profile view. `SELECT owner_id FROM user_owner_membership WHERE user_id = ?`
 * was a byte-identical literal repeated 4× in the pre-migration route file —
 * consolidated here into `findOwnerMembershipIdsByUserId`.
 */
type Executor = Pool | PoolConnection;
type DynamicFieldValue = string | number | boolean;

/** Owner IDs a user belongs to — reused by scope checks, GET/PUT owners, and the node view. */
export async function findOwnerMembershipIdsByUserId(
  userId: string | number,
  executor: Executor = db
): Promise<number[]> {
  const [rows] = await executor.execute<RowDataPacket[]>(
    'SELECT owner_id FROM user_owner_membership WHERE user_id = ?',
    [userId]
  );
  return rows.map((r) => r.owner_id as number);
}

/** Dynamic user listing — optional owner-scope JOIN (BOLA filter) + optional role filter. */
export async function findUsersByFilters(
  ownerScope: number[] | null,
  role: string | undefined,
  executor: Executor = db
): Promise<RowDataPacket[]> {
  // FC 082 F3c3 (Cond.5 grep CI) — `roles` eliminada. El INNER JOIN previo
  // era además un bug real preexistente: excluía en silencio del Directorio
  // a cualquier usuario con role_id != 0 (roles solo tiene la fila 0 desde
  // mig.164) — nunca visible porque PROD sigue zero-state.
  let q = `
    SELECT DISTINCT u.*, (CASE WHEN u.role_id = 0 THEN 'GrayMan' ELSE NULL END) as role_name, cat.label as department_name
    FROM users u
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
  const [rows] = await executor.execute<RowDataPacket[]>(q, p);
  return rows;
}

/** Row-locked user fetch — used before UPDATE/DELETE to snapshot + serialize concurrent writers. */
export async function findUserForUpdateById(
  id: string,
  executor: Executor = db
): Promise<RowDataPacket | null> {
  const [rows] = await executor.execute<RowDataPacket[]>(
    'SELECT * FROM users WHERE id = ? FOR UPDATE',
    [id]
  );
  return rows.length > 0 ? rows[0] : null;
}

/** Unlocked user fetch — used for the post-update "snapshot after" audit-log read. */
export async function findUserById(
  id: string,
  executor: Executor = db
): Promise<RowDataPacket | null> {
  const [rows] = await executor.execute<RowDataPacket[]>('SELECT * FROM users WHERE id = ?', [id]);
  return rows.length > 0 ? rows[0] : null;
}

/** Applies a dynamic SET clause (fixed col=? fragments, built by the caller) to `users`. */
export async function updateUserFields(
  id: string,
  setClause: string,
  values: DynamicFieldValue[],
  executor: Executor = db
): Promise<void> {
  await executor.execute(`UPDATE users SET ${setClause} WHERE id = ?`, [...values, id]);
}

/** Deletes the user row by id. */
export async function deleteUserById(id: string, executor: Executor = db): Promise<void> {
  await executor.execute('DELETE FROM users WHERE id = ?', [id]);
}

/** Owner label/handle/type for every owner a user belongs to — GET /users/:id/owners. */
export async function findOwnerDetailsByUserId(
  userId: string,
  executor: Executor = db
): Promise<RowDataPacket[]> {
  const [rows] = await executor.execute<RowDataPacket[]>(
    `SELECT uom.owner_id AS ownerId, o.label, o.handle, otc.code AS ownerType
     FROM user_owner_membership uom
     JOIN owners o ON o.id = uom.owner_id
     JOIN owner_types_catalog otc ON otc.id = o.owner_type_id
     WHERE uom.user_id = ?`,
    [userId]
  );
  return rows;
}

/** True if a row-lockable user exists for id — PUT /users/:id/owners existence check. */
export async function existsUserForUpdate(id: string, executor: Executor = db): Promise<boolean> {
  const [rows] = await executor.execute<RowDataPacket[]>(
    'SELECT id FROM users WHERE id = ? FOR UPDATE',
    [id]
  );
  return rows.length > 0;
}

/** Subset of ownerIds that actually exist in `owners` — validates PUT /users/:id/owners payload. */
export async function findExistingOwnerIds(
  ownerIds: number[],
  executor: Executor = db
): Promise<number[]> {
  const [rows] = await executor.execute<RowDataPacket[]>(
    `SELECT id FROM owners WHERE id IN (${ownerIds.map(() => '?').join(',')})`,
    ownerIds
  );
  return rows.map((r) => r.id as number);
}

/** Deletes every owner-membership row for userId — first half of a PUT /users/:id/owners replace. */
export async function deleteOwnerMembershipsByUserId(
  userId: string,
  executor: Executor = db
): Promise<void> {
  await executor.execute<ResultSetHeader>('DELETE FROM user_owner_membership WHERE user_id = ?', [
    userId,
  ]);
}

/** Inserts (userId, ownerId) rows for the replaced owner set — second half of the PUT replace. */
export async function insertOwnerMemberships(
  userId: string,
  ownerIds: number[],
  executor: Executor = db
): Promise<void> {
  if (ownerIds.length === 0) return;
  await executor.execute<ResultSetHeader>(
    `INSERT INTO user_owner_membership (user_id, owner_id) VALUES ${ownerIds
      .map(() => '(?,?)')
      .join(',')}`,
    ownerIds.flatMap((ownerId) => [Number(userId), ownerId])
  );
}

/** User + department (no role_name join) by uuid — GET /users/:uuid/node's base row. */
export async function findUserWithDepartmentByUuid(
  uuid: string,
  executor: Executor = db
): Promise<RowDataPacket | null> {
  const [rows] = await executor.execute<RowDataPacket[]>(
    `SELECT u.*, cat.label AS department_name
     FROM users u
     LEFT JOIN common_catalogs cat ON u.department_id = cat.id AND cat.category = 'DEPARTMENT'
     WHERE u.uuid = ?`,
    [uuid]
  );
  return rows.length > 0 ? rows[0] : null;
}

/** Permission slug+description pairs for a user in a tenant — node view's permission list. */
export async function findPermissionDetailsForUserInTenant(
  userId: number,
  tenantId: number | null,
  executor: Executor = db
): Promise<RowDataPacket[]> {
  const [rows] = await executor.execute<RowDataPacket[]>(
    `SELECT DISTINCT p.slug, p.description
     FROM cosmonaut_role_assignments cra
     JOIN cosmonaut_roles cr ON cr.id = cra.role_id
     JOIN cosmonaut_role_permissions crp ON crp.role_id = cr.id
     JOIN permissions p ON p.id = crp.permission_id
     WHERE cra.user_id = ?
       AND cra.revoked_at IS NULL
       AND (cra.tenant_id = ? OR cra.tenant_id IS NULL)
     ORDER BY p.slug`,
    [userId, tenantId]
  );
  return rows;
}

/** Name of the earliest active cosmonaut role assigned to userId — node view's display role. */
export async function findPrimaryCosmonautRoleName(
  userId: number,
  executor: Executor = db
): Promise<string | null> {
  const [rows] = await executor.execute<RowDataPacket[]>(
    `SELECT cr.name FROM cosmonaut_role_assignments cra
     JOIN cosmonaut_roles cr ON cr.id = cra.role_id
     WHERE cra.user_id = ? AND cra.revoked_at IS NULL
     ORDER BY cra.id ASC LIMIT 1`,
    [userId]
  );
  return rows.length > 0 ? (rows[0].name as string) : null;
}

/** Last 5 route movements driven by userId — node view's recent-activity panel. */
export async function findRecentRoutesByDriverId(
  userId: number,
  executor: Executor = db
): Promise<RowDataPacket[]> {
  const [rows] = await executor.execute<RowDataPacket[]>(
    `SELECT fm.uuid, fm.unit_id, fre.destination, fm.status,
            fm.start_at, fm.end_at
     FROM fleet_movements fm
     JOIN fleet_route_extensions fre ON fre.movement_id = fm.id
     WHERE fre.driver_id = ? AND fm.movement_type = 'ROUTE'
     ORDER BY fm.created_at DESC LIMIT 5`,
    [userId]
  );
  return rows;
}

/** cosmonaut_roles.id for the tenant-global 'GrayMan' role, or null if absent. */
export async function findGrayManCosmonautRoleId(executor: Executor = db): Promise<number | null> {
  const [rows] = await executor.execute<RowDataPacket[]>(
    "SELECT id FROM cosmonaut_roles WHERE tenant_id IS NULL AND name = 'GrayMan' LIMIT 1",
    []
  );
  return rows.length > 0 ? (rows[0].id as number) : null;
}

/** Revokes any active R_global (tenant_id IS NULL) cosmonaut assignment for targetUserId. */
export async function revokeGlobalCosmonautAssignments(
  targetUserId: string,
  revokedBy: number,
  executor: Executor = db
): Promise<void> {
  await executor.execute(
    `UPDATE cosmonaut_role_assignments
     SET revoked_at = NOW(), revoked_by = ?
     WHERE user_id = ? AND tenant_id IS NULL AND revoked_at IS NULL`,
    [revokedBy, Number(targetUserId)]
  );
}

/** Grants the GrayMan cosmonaut role to targetUserId, NULL-safe against duplicate active grants. */
export async function insertGrayManCosmonautAssignmentIfAbsent(
  targetUserId: string,
  grayManRoleId: number,
  assignedBy: number,
  executor: Executor = db
): Promise<void> {
  // Hallazgo soft Bravo (auditoría F3c1, 2026-08-01) — mismo footgun que
  // mig.155: UNIQUE(user_id, role_id, tenant_id) no protege nada cuando
  // tenant_id IS NULL (MySQL trata NULL≠NULL), así que INSERT IGNORE nunca
  // detectaría un duplicado real. WHERE NOT EXISTS sí es NULL-safe.
  await executor.execute(
    `INSERT INTO cosmonaut_role_assignments (user_id, role_id, tenant_id, assigned_by)
     SELECT ?, ?, NULL, ?
     WHERE NOT EXISTS (
       SELECT 1 FROM cosmonaut_role_assignments
       WHERE user_id = ? AND role_id = ? AND tenant_id IS NULL AND revoked_at IS NULL
     )`,
    [Number(targetUserId), grayManRoleId, assignedBy, Number(targetUserId), grayManRoleId]
  );
}
