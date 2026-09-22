import type { ClusterCode, SuperclusterCode } from '@mantenimiento/contracts';
import { useAuth } from '../context/AuthContext';

/**
 * FC193 F3 — módulos disponibles para la sesión, leídos de `activeCapabilities` (payload de sesión del
 * API: misma fuente que el gate del servidor). La UI solo FILTRA (menú y rutas); la frontera de seguridad
 * es `requireUniverseCapability` en el API, que responde 403 CAPABILITY_NOT_ACTIVE.
 *
 * Un payload SIN `activeCapabilities` (API anterior a F3 durante un despliegue escalonado) no oculta
 * nada: mejor un módulo visible que el servidor rechaza con 403 que un menú vacío. Estos guards solo se
 * montan con sesión (`ProtectedRoute`), así que no hay caso "sin usuario".
 */
export default function useCapabilities(): {
  isSuperclusterActive: (code: SuperclusterCode) => boolean;
  isClusterActive: (code: ClusterCode) => boolean;
} {
  const { effectiveUser } = useAuth();
  const active = effectiveUser?.activeCapabilities;

  const isSuperclusterActive = (code: SuperclusterCode): boolean =>
    active === undefined || active.superclusters.includes(code);

  const isClusterActive = (code: ClusterCode): boolean =>
    active === undefined || active.clusters.includes(code);

  return { isSuperclusterActive, isClusterActive };
}
