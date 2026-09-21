import findActiveCapabilities from './universeCapabilities.repository';

/**
 * FC193 F2 — capacidades activas de un universo, con caché EN MEMORIA POR PROCESO (Invariante 5).
 *
 * - TTL corto: acota el desfase entre instancias (una mutación de Cosmología invalida solo la caché
 *   del proceso que la atendió; las demás convergen al vencer el TTL — riesgo R7 de 372_AN).
 * - `invalidateUniverseCapabilities` se llama tras cada mutación de Cosmología (`cosmology.service`).
 * - Fail-closed: un error de DB se propaga (nunca se cachea ni se interpreta como "activo").
 */
export interface UniverseCapabilities {
  readonly superclusters: ReadonlySet<string>;
  readonly clusters: ReadonlySet<string>;
}

const CACHE_TTL_MS = 30_000;

interface CacheEntry {
  readonly value: UniverseCapabilities;
  readonly expiresAt: number;
}

const cache = new Map<number, CacheEntry>();
// Se incrementa en cada invalidación: una lectura que arrancó ANTES de la mutación y termina DESPUÉS
// no debe repoblar la caché con el estado viejo.
let epoch = 0;

/** Capacidades ACTIVAS del universo `tenantId` (SC y clusters), desde la caché o, si venció, la DB. */
export async function getUniverseCapabilities(tenantId: number): Promise<UniverseCapabilities> {
  const now = Date.now();
  const cached = cache.get(tenantId);
  if (cached && cached.expiresAt > now) return cached.value;

  const startEpoch = epoch;
  const rows = await findActiveCapabilities(tenantId);
  const value: UniverseCapabilities = {
    superclusters: new Set(rows.filter((r) => r.kind === 'SUPERCLUSTER').map((r) => r.code)),
    clusters: new Set(rows.filter((r) => r.kind === 'CLUSTER').map((r) => r.code)),
  };
  if (epoch === startEpoch) cache.set(tenantId, { value, expiresAt: now + CACHE_TTL_MS });
  return value;
}

/** Descarta la caché de un universo, o de todos si se omite `tenantId`. */
export function invalidateUniverseCapabilities(tenantId?: number): void {
  epoch += 1;
  if (tenantId === undefined) {
    cache.clear();
    return;
  }
  cache.delete(tenantId);
}
