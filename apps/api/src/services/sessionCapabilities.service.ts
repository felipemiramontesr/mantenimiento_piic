import { CAPABILITIES_MANIFEST } from '@mantenimiento/contracts';
import { isOmegaCaller } from '../middleware/cosmonautMiddleware';
import { getUniverseCapabilities } from './universeCapabilities.service';

/**
 * FC193 F3 — capacidades activas que viajan en el payload de sesión (`activeCapabilities` en login,
 * refresh, switch-tenant y `/auth/me`). MISMA fuente y mismo caché que el gate del API
 * (`getUniverseCapabilities`): el menú y las rutas de la web nunca pueden discrepar del servidor.
 * La UI solo filtra (UX); la frontera de seguridad sigue siendo `requireUniverseCapability`.
 */
export interface SessionCapabilities {
  superclusters: string[];
  clusters: string[];
}

/** Ω (`isOmegaCaller`) ve el catálogo completo del manifiesto (§24.10: omnipresente, sin universo). */
function allCapabilities(): SessionCapabilities {
  const superclusters = Object.keys(CAPABILITIES_MANIFEST);
  const clusters = Object.values(CAPABILITIES_MANIFEST).flatMap((entry) => [...entry.clusters]);
  return { superclusters, clusters };
}

/**
 * - Ω → todas las capacidades del manifiesto.
 * - `tenantId` null/inválido y no Ω (Arc itinerante, D3) → ninguna: sus únicas rutas son BUILTIN.
 * - Cualquier otro → las ACTIVE de su universo, ordenadas (payload estable). Un error de DB se
 *   propaga: un login/refresh/me nunca anuncia capacidades que no pudo confirmar.
 */
export async function resolveSessionCapabilities(
  caller: { roleId?: number; permissions?: string[] },
  tenantId: number | null
): Promise<SessionCapabilities> {
  if (isOmegaCaller(caller)) return allCapabilities();
  if (typeof tenantId !== 'number' || !Number.isInteger(tenantId) || tenantId <= 0) {
    return { superclusters: [], clusters: [] };
  }
  const active = await getUniverseCapabilities(tenantId);
  return {
    superclusters: [...active.superclusters].sort((a, b) => a.localeCompare(b)),
    clusters: [...active.clusters].sort((a, b) => a.localeCompare(b)),
  };
}
