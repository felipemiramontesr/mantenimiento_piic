import api from '../../../api/client';

/**
 * FC208 F1 (T1) — cliente de las capacidades de un Universo sobre la API viva de FC160
 * (`/v1/cosmology/universes/:tenantId/...`, solo Ω). Las listas salen de `response.data.data`; el POST
 * lleva el código en el cuerpo y el DELETE lo lleva en la ruta.
 */

export type CapabilityState = 'ACTIVE' | 'SUSPENDED' | 'REMOVED' | 'NEVER_ACTIVATED';

export interface SuperclusterView {
  readonly code: string;
  readonly name: string;
  readonly state: CapabilityState;
}

export interface ClusterView {
  readonly code: string;
  readonly name: string;
  readonly superclusterCode: string;
  readonly state: CapabilityState;
}

/** Ruta base de las capacidades de un Universo. */
function universePath(tenantId: number): string {
  return `/cosmology/universes/${tenantId}`;
}

/** `GET .../superclusters` — los 5 Supercúmulos del catálogo con su estado en este Universo. */
export async function fetchUniverseSuperclusters(tenantId: number): Promise<SuperclusterView[]> {
  const res = await api.get<{ data: SuperclusterView[] }>(
    `${universePath(tenantId)}/superclusters`
  );
  return res.data.data;
}

/** `GET .../clusters` — los Cúmulos del catálogo con su estado en este Universo. */
export async function fetchUniverseClusters(tenantId: number): Promise<ClusterView[]> {
  const res = await api.get<{ data: ClusterView[] }>(`${universePath(tenantId)}/clusters`);
  return res.data.data;
}

/** `POST .../superclusters { superclusterCode }` — activa el Supercúmulo y sus Cúmulos. */
export async function activateSupercluster(
  tenantId: number,
  superclusterCode: string
): Promise<void> {
  await api.post(`${universePath(tenantId)}/superclusters`, { superclusterCode });
}

/** `DELETE .../superclusters/:superclusterCode` — suspende el Supercúmulo y sus Cúmulos. */
export async function suspendSupercluster(
  tenantId: number,
  superclusterCode: string
): Promise<void> {
  await api.delete(
    `${universePath(tenantId)}/superclusters/${encodeURIComponent(superclusterCode)}`
  );
}

/** `POST .../clusters { clusterCode }` — activa un Cúmulo (el padre debe estar activo). */
export async function activateCluster(tenantId: number, clusterCode: string): Promise<void> {
  await api.post(`${universePath(tenantId)}/clusters`, { clusterCode });
}

/** `DELETE .../clusters/:clusterCode` — suspende un Cúmulo. */
export async function suspendCluster(tenantId: number, clusterCode: string): Promise<void> {
  await api.delete(`${universePath(tenantId)}/clusters/${encodeURIComponent(clusterCode)}`);
}

const ERROR_MESSAGES: Record<string, string> = {
  SUPERCLUSTER_NOT_ACTIVE: 'El Supercúmulo padre debe estar activo (§24.5).',
  SUPERCLUSTER_NOT_FOUND: 'El Supercúmulo no existe en el catálogo.',
  CLUSTER_NOT_FOUND: 'El Cúmulo no existe en el catálogo.',
  FORBIDDEN: 'Acción exclusiva de GrayMan.',
};

/** Mensaje en español para el error de una consulta o mutación de capacidades. */
export function describeCapabilityError(err: unknown): string {
  const data = (err as { response?: { data?: { code?: string; error?: string } } })?.response?.data;
  const code = data?.code ?? data?.error;
  return (code && ERROR_MESSAGES[code]) || 'No se pudo completar la operación. Intenta de nuevo.';
}
