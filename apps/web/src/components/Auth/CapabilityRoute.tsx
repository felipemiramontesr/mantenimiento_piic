import React from 'react';
import { Navigate } from 'react-router';
import type { SuperclusterCode } from '@mantenimiento/contracts';
import useCapabilities from '../../hooks/useCapabilities';
import { ARCSIAL_HOME_PATH } from '../../constants/routes';

/**
 * FC193 F3 — guard de ruta por capacidad: si el Supercúmulo NO está activo en el universo de la sesión,
 * una URL directa (marcador viejo, enlace) se intercepta y redirige a Arcsial con un aviso amable
 * (`CapabilityNotice` lo muestra). Es UX, no la frontera de seguridad: el API ya responde 403.
 * FC211 F3: el rebote ya no va al Centro de Comando, que podría no tener datos para esa sesión.
 */
interface CapabilityRouteProps {
  readonly supercluster: SuperclusterCode;
  readonly children: React.ReactNode;
}

/** Renderiza `children` si el Supercúmulo está activo; si no, rebota a Arcsial con el aviso. */
const CapabilityRoute: React.FC<CapabilityRouteProps> = ({ supercluster, children }) => {
  const { isSuperclusterActive } = useCapabilities();

  if (isSuperclusterActive(supercluster)) return <>{children}</>;
  return <Navigate to={ARCSIAL_HOME_PATH} replace state={{ capabilityNotice: supercluster }} />;
};

export default CapabilityRoute;
