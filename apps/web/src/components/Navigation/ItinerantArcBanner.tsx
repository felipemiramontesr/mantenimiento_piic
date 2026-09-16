import React from 'react';
import { Compass } from 'lucide-react';
import usePermissions from '../../hooks/usePermissions';

/**
 * FC182 F2 — the "banner informativo soberano" the FC calls for, same self-contained
 * conditional-render shape as `ArchonNetworkBanner` (returns `null` when not applicable).
 * Shown for an Arconauta Itinerante (`tenantId: null`, Modelo B) on every page they can reach —
 * the only page they *can* reach is Arcsial, but the banner lives in the shared layout shell so
 * it stays visible regardless of which allowed sub-view they're on.
 */
const ItinerantArcBanner: React.FC = () => {
  const { isItinerantArc } = usePermissions();

  if (!isItinerantArc()) {
    return null;
  }

  return (
    <div className="w-full bg-[#0f2a44] text-white px-4 py-2 flex items-center justify-center gap-2 shadow-sm">
      <Compass size={16} className="text-[#f2b705]" />
      <span className="text-sm font-medium font-['Inter']">
        Arconauta Itinerante — Acceso exclusivo a Arcsial. En espera de asignación o vinculación de
        Universo.
      </span>
    </div>
  );
};

export default ItinerantArcBanner;
