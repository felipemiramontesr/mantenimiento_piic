import { Pool, PoolConnection } from 'mysql2/promise';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import db from './db';

/**
 * FC160 F1 — SQL boundary for cosmology mutability (§24.5 `AUTORIDAD_Ω`):
 * activate/suspend Supercúmulos and Cúmulos for a Universo. Operates on
 * `universe_superclusters`/`universe_clusters` (mutability, FC023/FC067) and
 * their read-only catalogs `superclusters_catalog`/`clusters_catalog`.
 */
type Executor = Pool | PoolConnection;

export interface CatalogRow extends RowDataPacket {
  id: number;
  code: string;
  name: string;
}

export interface ClusterCatalogRow extends CatalogRow {
  supercluster_id: number;
}

export interface MutabilityRow extends RowDataPacket {
  state: 'ACTIVE' | 'SUSPENDED' | 'REMOVED';
}

/** True if a Universo (tenant) row exists for tenantId. */
export async function tenantExists(tenantId: number, executor: Executor = db): Promise<boolean> {
  const [rows] = await executor.execute<RowDataPacket[]>('SELECT id FROM tenants WHERE id = ?', [
    tenantId,
  ]);
  return rows.length > 0;
}

export interface TenantRow extends RowDataPacket {
  id: number;
  label: string;
}

/** Minimal tenant snapshot for audit — used before DESTROY_UNIVERSE physically deletes the row. */
export async function findTenantById(
  tenantId: number,
  executor: Executor = db
): Promise<TenantRow | null> {
  const [rows] = await executor.execute<TenantRow[]>('SELECT id, label FROM tenants WHERE id = ?', [
    tenantId,
  ]);
  return rows.length > 0 ? rows[0] : null;
}

/** Catalog lookup — one of the 5 fixed Supercúmulos, or null if the code is invalid. */
export async function findSuperclusterByCode(
  code: string,
  executor: Executor = db
): Promise<CatalogRow | null> {
  const [rows] = await executor.execute<CatalogRow[]>(
    'SELECT id, code, name FROM superclusters_catalog WHERE code = ?',
    [code]
  );
  return rows.length > 0 ? rows[0] : null;
}

/** Catalog lookup — a Cúmulo by code, including its parent supercluster_id. */
export async function findClusterByCode(
  code: string,
  executor: Executor = db
): Promise<ClusterCatalogRow | null> {
  const [rows] = await executor.execute<ClusterCatalogRow[]>(
    'SELECT id, supercluster_id, code, name FROM clusters_catalog WHERE code = ?',
    [code]
  );
  return rows.length > 0 ? rows[0] : null;
}

/** Current mutability row for a (tenant, supercluster) pair, or null if never added. */
export async function findUniverseSupercluster(
  tenantId: number,
  superclusterId: number,
  executor: Executor = db
): Promise<MutabilityRow | null> {
  const [rows] = await executor.execute<MutabilityRow[]>(
    'SELECT state FROM universe_superclusters WHERE tenant_id = ? AND supercluster_id = ?',
    [tenantId, superclusterId]
  );
  return rows.length > 0 ? rows[0] : null;
}

/** T1 — idempotent activate: fresh row or reactivates a SUSPENDED one (clears removed_at). */
export async function activateSupercluster(
  tenantId: number,
  superclusterId: number,
  callerId: number,
  executor: Executor = db
): Promise<void> {
  await executor.execute<ResultSetHeader>(
    `INSERT INTO universe_superclusters (tenant_id, supercluster_id, state, added_by_user_id)
     VALUES (?, ?, 'ACTIVE', ?)
     ON DUPLICATE KEY UPDATE state = 'ACTIVE', removed_at = NULL,
       added_by_user_id = VALUES(added_by_user_id), added_at = NOW()`,
    [tenantId, superclusterId, callerId]
  );
}

/** T2 — suspends the supercluster row (never hard-delete, §24.5 invariante SUSPENDED). */
export async function suspendSupercluster(
  tenantId: number,
  superclusterId: number,
  executor: Executor = db
): Promise<void> {
  await executor.execute<ResultSetHeader>(
    `UPDATE universe_superclusters SET state = 'SUSPENDED', removed_at = NOW()
     WHERE tenant_id = ? AND supercluster_id = ? AND state = 'ACTIVE'`,
    [tenantId, superclusterId]
  );
}

/** T2 cascade (mandatory, Cond.R-160-F1-R3) — suspends every ACTIVE cluster of that supercluster. */
export async function suspendClustersUnderSupercluster(
  tenantId: number,
  superclusterId: number,
  executor: Executor = db
): Promise<void> {
  await executor.execute<ResultSetHeader>(
    `UPDATE universe_clusters uc
     JOIN clusters_catalog cc ON cc.id = uc.cluster_id
     SET uc.state = 'SUSPENDED', uc.removed_at = NOW()
     WHERE uc.tenant_id = ? AND cc.supercluster_id = ? AND uc.state = 'ACTIVE'`,
    [tenantId, superclusterId]
  );
}

/** T3 precondition — is the cluster's parent supercluster ACTIVE for this tenant? */
export async function isSuperclusterActiveForTenant(
  tenantId: number,
  superclusterId: number,
  executor: Executor = db
): Promise<boolean> {
  const row = await findUniverseSupercluster(tenantId, superclusterId, executor);
  return row?.state === 'ACTIVE';
}

/** T3 — idempotent activate (same UPSERT pattern as `activateSupercluster`). */
export async function activateCluster(
  tenantId: number,
  clusterId: number,
  callerId: number,
  executor: Executor = db
): Promise<void> {
  await executor.execute<ResultSetHeader>(
    `INSERT INTO universe_clusters (tenant_id, cluster_id, state, added_by_user_id)
     VALUES (?, ?, 'ACTIVE', ?)
     ON DUPLICATE KEY UPDATE state = 'ACTIVE', removed_at = NULL,
       added_by_user_id = VALUES(added_by_user_id), added_at = NOW()`,
    [tenantId, clusterId, callerId]
  );
}

/** T3b — suspends a single cluster row, no cascade (a Cúmulo has no children, §24.3). */
export async function suspendCluster(
  tenantId: number,
  clusterId: number,
  executor: Executor = db
): Promise<void> {
  await executor.execute<ResultSetHeader>(
    `UPDATE universe_clusters SET state = 'SUSPENDED', removed_at = NOW()
     WHERE tenant_id = ? AND cluster_id = ? AND state = 'ACTIVE'`,
    [tenantId, clusterId]
  );
}

export interface SuperclusterListRow extends RowDataPacket {
  code: string;
  name: string;
  state: 'ACTIVE' | 'SUSPENDED' | 'REMOVED' | null;
}

/** T4 — every catalog SC for the Universo, LEFT JOINed so a never-added row surfaces `state: null`. */
export async function listSuperclustersForTenant(
  tenantId: number,
  executor: Executor = db
): Promise<SuperclusterListRow[]> {
  const [rows] = await executor.execute<SuperclusterListRow[]>(
    `SELECT sc.code, sc.name, us.state
     FROM superclusters_catalog sc
     LEFT JOIN universe_superclusters us ON us.supercluster_id = sc.id AND us.tenant_id = ?
     ORDER BY sc.id`,
    [tenantId]
  );
  return rows;
}

export interface ClusterListRow extends RowDataPacket {
  code: string;
  name: string;
  superclusterCode: string;
  state: 'ACTIVE' | 'SUSPENDED' | 'REMOVED' | null;
}

/** T4 — every catalog Cúmulo for the Universo, optionally filtered by parent SC code. */
export async function listClustersForTenant(
  tenantId: number,
  superclusterCode: string | undefined,
  executor: Executor = db
): Promise<ClusterListRow[]> {
  let q = `
    SELECT cc.code, cc.name, sc.code AS superclusterCode, uc.state
    FROM clusters_catalog cc
    JOIN superclusters_catalog sc ON sc.id = cc.supercluster_id
    LEFT JOIN universe_clusters uc ON uc.cluster_id = cc.id AND uc.tenant_id = ?
  `;
  const params: (string | number)[] = [tenantId];
  if (superclusterCode) {
    q += ' WHERE sc.code = ?';
    params.push(superclusterCode);
  }
  q += ' ORDER BY cc.id';
  const [rows] = await executor.execute<ClusterListRow[]>(q, params);
  return rows;
}

// ─── Fase 2 — Universe_Create_And_Destroy (Cond.R-160-F2-Impl) ─────────────────

/** Catalog lookup — a Universo type (today only `FMS` live, migración 164 clean-slate). */
export async function findUniverseTypeByCode(
  code: string,
  executor: Executor = db
): Promise<CatalogRow | null> {
  const [rows] = await executor.execute<CatalogRow[]>(
    'SELECT id, code, name FROM universe_types WHERE code = ?',
    [code]
  );
  return rows.length > 0 ? rows[0] : null;
}

/** Catalog lookup — an Owner type (FLOTILLA/PRIVATE/CENTER/ARCHONAUT, migración 159). */
export async function findOwnerTypeByCode(
  code: string,
  executor: Executor = db
): Promise<CatalogRow | null> {
  const [rows] = await executor.execute<CatalogRow[]>(
    'SELECT id, code, name FROM owner_types_catalog WHERE code = ?',
    [code]
  );
  return rows.length > 0 ? rows[0] : null;
}

/** F2-I3(a) — mints a fresh `tenants.id` (no AUTO_INCREMENT there since migración 107) via the
 *  still-live `common_catalogs` pattern (migración 166 uses it for other categories); category
 *  `UNIVERSE_TENANT` is new, does not reopen the retired `FLEET_OWNER`. */
export async function mintUniverseTenantId(
  code: string,
  label: string,
  executor: Executor = db
): Promise<number> {
  const [result] = await executor.execute<ResultSetHeader>(
    "INSERT INTO common_catalogs (category, code, label) VALUES ('UNIVERSE_TENANT', ?, ?)",
    [code, label]
  );
  return result.insertId;
}

/** F2-I3(b) — `tenants.id` set explicitly to the minted id (not auto-generated here). */
export async function insertTenant(
  tenantId: number,
  label: string,
  universeTypeId: number,
  ownerTypeId: number,
  executor: Executor = db
): Promise<void> {
  await executor.execute<ResultSetHeader>(
    'INSERT INTO tenants (id, label, universe_type_id, owner_type_id) VALUES (?, ?, ?, ?)',
    [tenantId, label, universeTypeId, ownerTypeId]
  );
}

/** F2-I3(c) — seeds the default Supercúmulo blueprint (same pattern as migración 152's backfill). */
export async function seedSuperclusterBlueprint(
  tenantId: number,
  universeTypeId: number,
  callerId: number,
  executor: Executor = db
): Promise<void> {
  await executor.execute<ResultSetHeader>(
    `INSERT INTO universe_superclusters (tenant_id, supercluster_id, state, added_by_user_id)
     SELECT ?, uts.supercluster_id, 'ACTIVE', ?
     FROM universe_type_superclusters uts
     WHERE uts.universe_type_id = ?`,
    [tenantId, callerId, universeTypeId]
  );
}

/** F2-I3(c) / Cond.R-F2-R1b — seeds the default Cúmulo blueprint for whatever SCs were just
 *  activated (same pattern as migración 161's backfill: every cluster whose parent SC is ACTIVE). */
export async function seedClusterBlueprint(
  tenantId: number,
  callerId: number,
  executor: Executor = db
): Promise<void> {
  await executor.execute<ResultSetHeader>(
    `INSERT INTO universe_clusters (tenant_id, cluster_id, state, added_by_user_id)
     SELECT us.tenant_id, cc.id, 'ACTIVE', ?
     FROM universe_superclusters us
     JOIN clusters_catalog cc ON cc.supercluster_id = us.supercluster_id
     WHERE us.tenant_id = ? AND us.state = 'ACTIVE'`,
    [callerId, tenantId]
  );
}

export interface ZeroStateCounts extends RowDataPacket {
  fleet_units: number;
  memberships: number;
  role_assignments: number;
  custom_roles: number;
  areas: number;
  service_links: number;
  lattices: number;
  social_posts: number;
  social_reviews: number;
}

/** F2-I4 — the 10-bucket zero-state check (Cond.R-160-F2-R3), single round trip. Bucket 10 from
 *  the dictamen (`user_owner_membership`) is not a separate query — it is a read/write-compatible
 *  VIEW over `tenant_user_memberships` (migración 149), already covered by `memberships`. */
export async function countZeroStateBuckets(
  tenantId: number,
  executor: Executor = db
): Promise<ZeroStateCounts> {
  const [rows] = await executor.execute<ZeroStateCounts[]>(
    `SELECT
       (SELECT COUNT(*) FROM fleet_units WHERE ownerId = ?) AS fleet_units,
       (SELECT COUNT(*) FROM tenant_user_memberships WHERE owner_id = ?) AS memberships,
       (SELECT COUNT(*) FROM cosmonaut_role_assignments WHERE tenant_id = ?) AS role_assignments,
       (SELECT COUNT(*) FROM cosmonaut_roles WHERE tenant_id = ?) AS custom_roles,
       (SELECT COUNT(*) FROM areas WHERE owner_id = ?) AS areas,
       (SELECT COUNT(*) FROM tenant_service_links
          WHERE privado_owner_id = ? OR centro_owner_id = ?) AS service_links,
       (SELECT COUNT(*) FROM universe_lattices
          WHERE u1_tenant_id = ? OR u2_tenant_id = ?) AS lattices,
       (SELECT COUNT(*) FROM social_posts WHERE owner_id = ?) AS social_posts,
       (SELECT COUNT(*) FROM social_reviews WHERE taller_owner_id = ?) AS social_reviews`,
    [
      tenantId, // fleet_units
      tenantId, // memberships
      tenantId, // role_assignments
      tenantId, // custom_roles
      tenantId, // areas
      tenantId, // service_links.privado_owner_id
      tenantId, // service_links.centro_owner_id
      tenantId, // lattices.u1_tenant_id
      tenantId, // lattices.u2_tenant_id
      tenantId, // social_posts
      tenantId, // social_reviews
    ]
  );
  return rows[0];
}

/** F2-I5 — physical DELETE of the Universo (cascades SC/Cúmulo blueprint via existing FK) and
 *  cleanup of the `common_catalogs` row minted for it (scope-guarded to `UNIVERSE_TENANT`, F2-I7). */
export async function destroyUniverseRow(tenantId: number, executor: Executor = db): Promise<void> {
  await executor.execute<ResultSetHeader>('DELETE FROM tenants WHERE id = ?', [tenantId]);
  await executor.execute<ResultSetHeader>(
    "DELETE FROM common_catalogs WHERE id = ? AND category = 'UNIVERSE_TENANT'",
    [tenantId]
  );
}

export interface UniverseListRow extends RowDataPacket {
  id: number;
  label: string;
  universeTypeCode: string;
  activeSuperclusters: number;
  activeClusters: number;
}

/** T7 — every Universo with its type and a quick census of active SC/Cúmulo counts. */
export async function listUniverses(executor: Executor = db): Promise<UniverseListRow[]> {
  const [rows] = await executor.execute<UniverseListRow[]>(
    `SELECT t.id, t.label, ut.code AS universeTypeCode,
       (SELECT COUNT(*) FROM universe_superclusters us
          WHERE us.tenant_id = t.id AND us.state = 'ACTIVE') AS activeSuperclusters,
       (SELECT COUNT(*) FROM universe_clusters uc
          WHERE uc.tenant_id = t.id AND uc.state = 'ACTIVE') AS activeClusters
     FROM tenants t
     JOIN universe_types ut ON ut.id = t.universe_type_id
     ORDER BY t.id`
  );
  return rows;
}
