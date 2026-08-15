import db from './db';
import * as CosmologyRepository from './cosmology.repository';
import { recordAuditLog } from './auditService';

/**
 * FC160 F1 — orchestration for cosmology mutability endpoints (I2 zero-SQL,
 * zero FastifyReply — Cond.R-160-F1-R1). Every mutation is Ω-only at the
 * route layer (`omegaGuard`); this layer only enforces the business
 * invariants of §24.5 (cascade on supercluster suspension, cluster requires
 * an ACTIVE parent supercluster).
 */

export type MutationResult =
  | { ok: true }
  | { ok: false; status: number; code: string; message: string };

export type ListResult<T> =
  | { ok: true; data: T[] }
  | { ok: false; status: number; code: string; message: string };

const NOT_FOUND_TENANT = {
  ok: false as const,
  status: 404,
  code: 'TENANT_NOT_FOUND',
  message: 'Universo no encontrado',
};

async function findValidSupercluster(
  tenantId: number,
  code: string
): Promise<{ ok: true; id: number } | MutationResult> {
  if (!(await CosmologyRepository.tenantExists(tenantId))) return NOT_FOUND_TENANT;
  const sc = await CosmologyRepository.findSuperclusterByCode(code);
  if (!sc) {
    return {
      ok: false,
      status: 404,
      code: 'SUPERCLUSTER_NOT_FOUND',
      message: 'Supercúmulo inválido',
    };
  }
  return { ok: true, id: sc.id };
}

async function findValidCluster(
  tenantId: number,
  code: string
): Promise<{ ok: true; id: number; superclusterId: number } | MutationResult> {
  if (!(await CosmologyRepository.tenantExists(tenantId))) return NOT_FOUND_TENANT;
  const cluster = await CosmologyRepository.findClusterByCode(code);
  if (!cluster) {
    return { ok: false, status: 404, code: 'CLUSTER_NOT_FOUND', message: 'Cúmulo inválido' };
  }
  return { ok: true, id: cluster.id, superclusterId: cluster.supercluster_id };
}

/** T1 — ADD_SUPERCLUSTER. Idempotent: reactivates a SUSPENDED row. */
export async function addSupercluster(
  tenantId: number,
  superclusterCode: string,
  callerId: number
): Promise<MutationResult> {
  const found = await findValidSupercluster(tenantId, superclusterCode);
  if (!('id' in found)) return found;
  await CosmologyRepository.activateSupercluster(tenantId, found.id, callerId);
  await recordAuditLog({
    entity_type: 'supercluster',
    entity_id: `${tenantId}:${superclusterCode}`,
    action: 'UPDATE',
    snapshot_after: { state: 'ACTIVE' },
    reason: 'ADD_SUPERCLUSTER (§24.5)',
    user_id: callerId,
  });
  return { ok: true };
}

/** T2 — REMOVE_SUPERCLUSTER. Transactional cascade: SC + its ACTIVE clusters both → SUSPENDED. */
export async function removeSupercluster(
  tenantId: number,
  superclusterCode: string,
  callerId: number
): Promise<MutationResult> {
  const found = await findValidSupercluster(tenantId, superclusterCode);
  if (!('id' in found)) return found;
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await CosmologyRepository.suspendSupercluster(tenantId, found.id, connection);
    await CosmologyRepository.suspendClustersUnderSupercluster(tenantId, found.id, connection);
    await connection.commit();
  } catch (e) {
    await connection.rollback();
    throw e;
  } finally {
    connection.release();
  }
  await recordAuditLog({
    entity_type: 'supercluster',
    entity_id: `${tenantId}:${superclusterCode}`,
    action: 'UPDATE',
    snapshot_after: { state: 'SUSPENDED', cascade: 'clusters_suspended' },
    reason: 'REMOVE_SUPERCLUSTER (§24.5)',
    user_id: callerId,
  });
  return { ok: true };
}

/** T3 — add Cúmulo to Supercúmulo. Fails 409 if the parent SC isn't ACTIVE for this Universo. */
export async function addCluster(
  tenantId: number,
  clusterCode: string,
  callerId: number
): Promise<MutationResult> {
  const found = await findValidCluster(tenantId, clusterCode);
  if (!('id' in found)) return found;
  const parentActive = await CosmologyRepository.isSuperclusterActiveForTenant(
    tenantId,
    found.superclusterId
  );
  if (!parentActive) {
    return {
      ok: false,
      status: 409,
      code: 'SUPERCLUSTER_NOT_ACTIVE',
      message: 'El Supercúmulo padre no está activo en este Universo',
    };
  }
  await CosmologyRepository.activateCluster(tenantId, found.id, callerId);
  await recordAuditLog({
    entity_type: 'cluster',
    entity_id: `${tenantId}:${clusterCode}`,
    action: 'UPDATE',
    snapshot_after: { state: 'ACTIVE' },
    reason: 'ADD_CLUSTER (§24.5)',
    user_id: callerId,
  });
  return { ok: true };
}

/** T3b — suspend a single Cúmulo, no cascade (a Cúmulo has no children, §24.3). */
export async function removeCluster(
  tenantId: number,
  clusterCode: string,
  callerId: number
): Promise<MutationResult> {
  const found = await findValidCluster(tenantId, clusterCode);
  if (!('id' in found)) return found;
  await CosmologyRepository.suspendCluster(tenantId, found.id);
  await recordAuditLog({
    entity_type: 'cluster',
    entity_id: `${tenantId}:${clusterCode}`,
    action: 'UPDATE',
    snapshot_after: { state: 'SUSPENDED' },
    reason: 'REMOVE_CLUSTER (§24.5)',
    user_id: callerId,
  });
  return { ok: true };
}

export interface SuperclusterView {
  code: string;
  name: string;
  state: 'ACTIVE' | 'SUSPENDED' | 'REMOVED' | 'NEVER_ACTIVATED';
}

/** T4 — lists the 5 catalog SCs with their mutability state for this Universo. */
export async function listSuperclusters(tenantId: number): Promise<ListResult<SuperclusterView>> {
  if (!(await CosmologyRepository.tenantExists(tenantId))) return NOT_FOUND_TENANT;
  const rows = await CosmologyRepository.listSuperclustersForTenant(tenantId);
  return {
    ok: true,
    data: rows.map((r) => ({ code: r.code, name: r.name, state: r.state ?? 'NEVER_ACTIVATED' })),
  };
}

export interface ClusterView {
  code: string;
  name: string;
  superclusterCode: string;
  state: 'ACTIVE' | 'SUSPENDED' | 'REMOVED' | 'NEVER_ACTIVATED';
}

/** T4 — lists catalog Cúmulos with their mutability state, optionally scoped to one Supercúmulo. */
export async function listClusters(
  tenantId: number,
  superclusterCode: string | undefined
): Promise<ListResult<ClusterView>> {
  if (!(await CosmologyRepository.tenantExists(tenantId))) return NOT_FOUND_TENANT;
  const rows = await CosmologyRepository.listClustersForTenant(tenantId, superclusterCode);
  return {
    ok: true,
    data: rows.map((r) => ({
      code: r.code,
      name: r.name,
      superclusterCode: r.superclusterCode,
      state: r.state ?? 'NEVER_ACTIVATED',
    })),
  };
}
