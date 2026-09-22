import React from 'react';
import { Navigate } from 'react-router';
import type { SuperclusterCode } from '@mantenimiento/contracts';
import useCapabilities from '../../hooks/useCapabilities';

/**
 * FC193 F3 — guard de ruta por capacidad: si el Supercúmulo NO está activo en el universo de la sesión,
 * una URL directa (marcador viejo, enlace) se intercepta y redirige al Comando con un aviso amable
 * (`CapabilityNotice` lo muestra). Es UX, no la frontera de seguridad: el API ya responde 403.
 */
interface CapabilityRouteProps {
  readonly supercluster: SuperclusterCode;
  readonly children: React.ReactNode;
}

/** Renderiza `children` si el Supercúmulo está activo; si no, rebota a `/dashboard` con el aviso. */
const CapabilityRoute: React.FC<CapabilityRouteProps> = ({ supercluster, children }) => {
  const { isSuperclusterActive } = useCapabilities();

  if (isSuperclusterActive(supercluster)) return <>{children}</>;
  return <Navigate to="/dashboard" replace state={{ capabilityNotice: supercluster }} />;
};

export default CapabilityRoute;
