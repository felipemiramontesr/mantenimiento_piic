import * as CosmologyRepository from './cosmology.repository';
import { findPendingUsers } from './universeUserLinking.repository';
import EncryptionService from './encryption';

/**
 * Listados de solo lectura de Cosmología — extraído de `cosmology.service.ts` (rozaba el tope de 400
 * líneas al llegar FC193 F4) sin cambio de comportamiento; `cosmology.service.ts` importa `ListResult`/
 * `NOT_FOUND_TENANT` de AQUÍ (hoja del grafo, sin ciclo) y re-exporta este módulo entero, así que
 * `routes/cosmology.ts` (import `* as CosmologyService`) no cambia.
 */

export type ListResult<T> =
  | { ok: true; data: T[] }
  | { ok: false; status: number; code: string; message: string };

export const NOT_FOUND_TENANT = {
  ok: false as const,
  status: 404,
  code: 'TENANT_NOT_FOUND',
  message: 'Universo no encontrado',
};

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

export interface PendingUserView {
  id: number;
  username: string;
  fullName: string;
  email: string;
  rfc: string;
  razonSocial: string;
}

/** No `ok`-union like `ListResult<T>`/`CreateUniverseResult` — unlike its siblings, this read has
 *  no failure path of its own (auth is `requireOmega()` at the route guard, before this ever
 *  runs); a manufactured `ok: false` branch would just be permanently dead code under Zenith's
 *  100% coverage invariant. */
export interface PendingUsersListResult {
  data: PendingUserView[];
  total: number;
}

/** FC177 F3 — the candidate pool for `linkedUserId`: quarantined users with a billing snapshot
 *  and no tenant yet. Email is decrypted here (Ω-only listing) so GrayMan can identify who's
 *  who — the encrypted column alone isn't human-readable. FC179 adds `total`: the queue has no
 *  natural ceiling (unlike a fixed catalog), so Ω needs to know if 200 rows is everyone or a
 *  truncated view of a larger backlog. */
export async function listPendingUsers(): Promise<PendingUsersListResult> {
  const { rows, total } = await findPendingUsers();
  return {
    data: rows.map((r) => ({
      id: r.id,
      username: r.username,
      fullName: r.full_name,
      // FC189 — mismo guard que authSession/authUserManagement: `r.email` NULL no debe tronar.
      email: r.email ? EncryptionService.decrypt(r.email) : '',
      rfc: r.rfc,
      razonSocial: r.razon_social,
    })),
    total,
  };
}
