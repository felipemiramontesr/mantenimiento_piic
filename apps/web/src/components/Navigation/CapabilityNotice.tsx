import React from 'react';
import { useLocation, useNavigate } from 'react-router';
import type { SuperclusterCode } from '@mantenimiento/contracts';
import ArchonFeedbackBanner from '../ArchonFeedbackBanner';

/** Nombres de catálogo (`superclusters_catalog.name`, migración 151) para el aviso. */
const CAPABILITY_LABELS: Record<SuperclusterCode, string> = {
  CRM: 'Gestión de Relaciones',
  RASTREO: 'Rastreo y Rutas',
  MANTENIMIENTO: 'Mantenimiento de Activos',
  FINANZAS: 'Finanzas y TCO',
  RRHH: 'Recursos Humanos',
};

/**
 * FC193 F3 — aviso amable tras el rebote de `CapabilityRoute`: el guard redirige a `/dashboard` con
 * `state.capabilityNotice`. El aviso se cierra reemplazando el estado de la navegación, así un refresh
 * no lo vuelve a mostrar. Un valor desconocido en el estado se ignora (no muestra nada).
 */
const CapabilityNotice: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const code = (location.state as { capabilityNotice?: string } | null)?.capabilityNotice;

  if (!code || !Object.hasOwn(CAPABILITY_LABELS, code)) return null;

  return (
    <div className="pt-4" data-testid="capability-notice">
      <ArchonFeedbackBanner
        type="info"
        message={`El módulo ${
          CAPABILITY_LABELS[code as SuperclusterCode]
        } no está activo en tu universo.`}
        onClear={(): void => {
          navigate(location.pathname, { replace: true, state: null });
        }}
      />
    </div>
  );
};

export default CapabilityNotice;
