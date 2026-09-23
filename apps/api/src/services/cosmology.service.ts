import { randomBytes } from 'node:crypto';
import db from './db';
import * as CosmologyRepository from './cosmology.repository';
import { recordAuditLog } from './auditService';
import { prepareUserLink, linkUserInTx, PreparedUserLink } from './universeUserLinking';
import { assertUniqueUniverseLabel } from './universeManagement.service';
import { NOT_FOUND_TENANT } from './cosmology.queries';
import { UniverseMutationError } from './universeLabel';
import { invalidateUniverseCapabilities } from './universeCapabilities.service';

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

// Listados de solo lectura (listSuperclusters/listClusters/listUniverses/listPendingUsers,
// ListResult/NOT_FOUND_TENANT) viven en cosmology.queries.ts (extraído por el tope de 400 líneas,
// FC193 F4); re-exportados aquí para que `routes/cosmology.ts` (import `* as CosmologyService`) no
// cambie.
export * from './cosmology.queries';

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

/** T1 — ADD_SUPERCLUSTER. Idempotent: reactivates a SUSPENDED row. FC193 F4 (Invariante 4, Scenario 5)
 *  — transaccional: activa el SC Y todos sus clusters del catálogo en la MISMA TX, erradicando la
 *  asimetría histórica con `removeSupercluster` (que sí cascadeaba desde F1 de FC160). */
export async function addSupercluster(
  tenantId: number,
  superclusterCode: string,
  callerId: number
): Promise<MutationResult> {
  const found = await findValidSupercluster(tenantId, superclusterCode);
  if (!('id' in found)) return found;
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await CosmologyRepository.activateSupercluster(tenantId, found.id, callerId, connection);
    await CosmologyRepository.activateClustersUnderSupercluster(
      tenantId,
      found.id,
      callerId,
      connection
    );
    await connection.commit();
  } catch (e) {
    await connection.rollback();
    throw e;
  } finally {
    connection.release();
  }
  invalidateUniverseCapabilities(tenantId);
  await recordAuditLog({
    entity_type: 'supercluster',
    entity_id: `${tenantId}:${superclusterCode}`,
    action: 'UPDATE',
    snapshot_after: { state: 'ACTIVE', cascade: 'clusters_activated' },
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
  invalidateUniverseCapabilities(tenantId);
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
  invalidateUniverseCapabilities(tenantId);
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
  invalidateUniverseCapabilities(tenantId);
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

// ─── Fase 2 — Universe_Create_And_Destroy (Cond.R-160-F2-Impl) ─────────────────

/** Derives a UNIQUE `common_catalogs.code` from the label — collision (near-impossible with a
 *  6-hex suffix) simply fails the INSERT and rolls back the whole T5 transaction. */
function generateUniverseTenantCode(label: string): string {
  const slug = label
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
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

/** F2-I3 — the single TX: (FC192) name uniqueness → mint id → insert tenant → seed SC+Cúmulo
 *  blueprint → (FC177 F3) optionally link an existing quarantined user as MU, same TX (Cond.R-177
 *  R3 "MISMA TX"). La unicidad va DENTRO de la TX (Cond.R-192 A2), antes de acuñar el id. */
async function runCreateUniverseTransaction(
  label: string,
  universeTypeId: number,
  ownerTypeId: number,
  callerId: number,
  userLink?: PreparedUserLink
): Promise<number> {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await assertUniqueUniverseLabel(connection, label);
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
    if (userLink) {
      await linkUserInTx(connection, tenantId, callerId, userLink);
    }
    await connection.commit();
    return tenantId;
  } catch (e) {
    await connection.rollback();
    throw e;
  } finally {
    connection.release();
  }
}

/** T5 — CREATE_UNIVERSE. Single TX: (FC192) unique name → mint id → insert tenant → seed SC+Cúmulo blueprint →
 *  (FC177 F3) optionally link an existing quarantined user as its MU → audit. `linkedUserId`
 *  absent preserves FC160 F1 behavior exactly (truth table row "Ausente"). FC176 F2's
 *  `initialAdmin` (inline user creation) is retired — Cond.R-177 R3 (Bravo). */
export async function createUniverse(
  label: string,
  universeTypeCode: string,
  ownerTypeCode: string,
  callerId: number,
  linkedUserId?: number
): Promise<CreateUniverseResult> {
  const types = await validateUniverseCreateTypes(universeTypeCode, ownerTypeCode);
  if (!('universeTypeId' in types)) return types;

  let userLink: PreparedUserLink | undefined;
  if (linkedUserId !== undefined) {
    const prepared = await prepareUserLink(linkedUserId);
    if (!('muRoleId' in prepared)) return prepared;
    userLink = prepared;
  }

  let tenantId: number;
  try {
    tenantId = await runCreateUniverseTransaction(
      label,
      types.universeTypeId,
      types.ownerTypeId,
      callerId,
      userLink
    );
  } catch (e) {
    // FC192 — 409 UNIVERSE_NAME_ALREADY_EXISTS (nada se persistió: la TX ya hizo ROLLBACK).
    if (e instanceof UniverseMutationError) return { ok: false, ...e.failure };
    throw e;
  }
  await recordAuditLog({
    entity_type: 'universe',
    entity_id: String(tenantId),
    action: 'CREATE',
    snapshot_after: {
      label,
      universeTypeCode,
      ownerTypeCode,
      linkedUserId: userLink ? userLink.userId : null,
    },
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

/** T6 — DESTROY_UNIVERSE. Fail-closed on 10-bucket zero-state (Cond.R-160-F2-R3) before any write.
 *  FC161 R4 — `reason` is optional/backward-compatible: callers that omit it keep the original
 *  fixed audit reason; the UI's type-to-confirm flow can supply one for a richer audit trail. */
export async function destroyUniverse(
  tenantId: number,
  callerId: number,
  reason?: string
): Promise<MutationResult> {
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
  invalidateUniverseCapabilities(tenantId);
  await recordAuditLog({
    entity_type: 'universe',
    entity_id: String(tenantId),
    action: 'DELETE',
    snapshot_before: { label: tenant.label },
    reason: reason ?? 'DESTROY_UNIVERSE (§24.5, zero-state)',
    user_id: callerId,
  });
  return { ok: true };
}
