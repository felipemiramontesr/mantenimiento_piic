import { randomBytes } from 'node:crypto';
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
  | { ok: false; status: number; code: string; message: string; details?: Record<string, number> };

export type CreateUniverseResult =
  | { ok: true; tenantId: number }
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

// ─── Fase 2 — Universe_Create_And_Destroy (Cond.R-160-F2-Impl) ─────────────────

/** Derives a UNIQUE `common_catalogs.code` from the label — collision (near-impossible with a
 *  6-hex suffix) simply fails the INSERT and rolls back the whole T5 transaction. */
function generateUniverseTenantCode(label: string): string {
  const slug = label
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 30);
  const suffix = randomBytes(3).toString('hex').toUpperCase();
  return `UNIV_${slug || 'X'}_${suffix}`;
}

type ValidatedUniverseTypes = { ok: true; universeTypeId: number; ownerTypeId: number };

/** Validates both catalog codes before opening any transaction. */
async function validateUniverseCreateTypes(
  universeTypeCode: string,
  ownerTypeCode: string
): Promise<ValidatedUniverseTypes | CreateUniverseResult> {
  const universeType = await CosmologyRepository.findUniverseTypeByCode(universeTypeCode);
  if (!universeType) {
    return {
      ok: false,
      status: 404,
      code: 'UNIVERSE_TYPE_NOT_FOUND',
      message: 'Tipo de Universo inválido',
    };
  }
  const ownerType = await CosmologyRepository.findOwnerTypeByCode(ownerTypeCode);
  if (!ownerType) {
    return {
      ok: false,
      status: 404,
      code: 'OWNER_TYPE_NOT_FOUND',
      message: 'Tipo de Owner inválido',
    };
  }
  return { ok: true, universeTypeId: universeType.id, ownerTypeId: ownerType.id };
}

/** F2-I3 — the single TX: mint id → insert tenant → seed SC+Cúmulo blueprint. */
async function runCreateUniverseTransaction(
  label: string,
  universeTypeId: number,
  ownerTypeId: number,
  callerId: number
): Promise<number> {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const code = generateUniverseTenantCode(label);
    const tenantId = await CosmologyRepository.mintUniverseTenantId(code, label, connection);
    await CosmologyRepository.insertTenant(
      tenantId,
      label,
      universeTypeId,
      ownerTypeId,
      connection
    );
    await CosmologyRepository.seedSuperclusterBlueprint(
      tenantId,
      universeTypeId,
      callerId,
      connection
    );
    await CosmologyRepository.seedClusterBlueprint(tenantId, callerId, connection);
    await connection.commit();
    return tenantId;
  } catch (e) {
    await connection.rollback();
    throw e;
  } finally {
    connection.release();
  }
}

/** T5 — CREATE_UNIVERSE. Single TX: mint id → insert tenant → seed SC+Cúmulo blueprint → audit. */
export async function createUniverse(
  label: string,
  universeTypeCode: string,
  ownerTypeCode: string,
  callerId: number
): Promise<CreateUniverseResult> {
  const types = await validateUniverseCreateTypes(universeTypeCode, ownerTypeCode);
  if (!('universeTypeId' in types)) return types;
  const tenantId = await runCreateUniverseTransaction(
    label,
    types.universeTypeId,
    types.ownerTypeId,
    callerId
  );
  await recordAuditLog({
    entity_type: 'universe',
    entity_id: String(tenantId),
    action: 'CREATE',
    snapshot_after: { label, universeTypeCode, ownerTypeCode },
    reason: 'CREATE_UNIVERSE (§24.5)',
    user_id: callerId,
  });
  return { ok: true, tenantId };
}

/** F2-I4 — maps zero-state bucket counts to the list of names that are blocking (> 0). */
function blockingBuckets(counts: CosmologyRepository.ZeroStateCounts): Record<string, number> {
  return Object.fromEntries(
    Object.entries(counts).filter(([, count]) => Number(count) > 0)
  ) as Record<string, number>;
}

/** T6 — DESTROY_UNIVERSE. Fail-closed on 10-bucket zero-state (Cond.R-160-F2-R3) before any write. */
export async function destroyUniverse(tenantId: number, callerId: number): Promise<MutationResult> {
  const tenant = await CosmologyRepository.findTenantById(tenantId);
  if (!tenant) return NOT_FOUND_TENANT;
  const counts = await CosmologyRepository.countZeroStateBuckets(tenantId);
  const blockers = blockingBuckets(counts);
  if (Object.keys(blockers).length > 0) {
    return {
      ok: false,
      status: 409,
      code: 'UNIVERSE_NOT_ZERO_STATE',
      message: 'El Universo no está en zero-state — existen dependencias de negocio',
      details: blockers,
    };
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await CosmologyRepository.destroyUniverseRow(tenantId, connection);
    await connection.commit();
  } catch (e) {
    await connection.rollback();
    throw e;
  } finally {
    connection.release();
  }
  await recordAuditLog({
    entity_type: 'universe',
    entity_id: String(tenantId),
    action: 'DELETE',
    snapshot_before: { label: tenant.label },
    reason: 'DESTROY_UNIVERSE (§24.5, zero-state)',
    user_id: callerId,
  });
  return { ok: true };
}

export interface UniverseView {
  id: number;
  label: string;
  universeTypeCode: string;
  activeSuperclusters: number;
  activeClusters: number;
}

/** T7 — lists every Universo with a quick operational census. */
export async function listUniverses(): Promise<ListResult<UniverseView>> {
  const rows = await CosmologyRepository.listUniverses();
  return {
    ok: true,
    data: rows.map((r) => ({
      id: r.id,
      label: r.label,
      universeTypeCode: r.universeTypeCode,
      activeSuperclusters: Number(r.activeSuperclusters),
      activeClusters: Number(r.activeClusters),
    })),
  };
}
