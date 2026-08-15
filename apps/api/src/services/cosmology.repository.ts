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
