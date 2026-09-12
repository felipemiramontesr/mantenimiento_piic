import React, { useState } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { archonCache } from '../../../utils/archonCache';

function handleRepair(): void {
  archonCache.clear();
  window.location.reload();
}

interface RepairConfirmProps {
  readonly onCancel: () => void;
}

/** Confirmación explícita (FC171 Cond. D3 Opción A) — extraída para mantener
 *  `CacheRepairSection` bajo presupuesto (Gate 2). */
function RepairConfirm({ onCancel }: RepairConfirmProps): React.JSX.Element {
  return (
    <div className="space-y-2" data-testid="cache-repair-confirm">
      <p className="text-xs text-[#0f2a44]/70 flex items-center gap-2">
        <AlertTriangle size={14} className="text-amber-500 shrink-0" />
        Se cerrará tu sesión de caché local y la página se recargará. ¿Confirmar?
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center justify-center h-11 px-4 text-xs font-bold uppercase tracking-widest text-[#0f2a44]/50 hover:text-[#0f2a44]"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleRepair}
          data-testid="cache-repair-confirm-button"
          className="btn-sentinel-amber-static text-xs"
        >
          Sí, reparar
        </button>
      </div>
    </div>
  );
}

/**
 * FC171 F1, Cond. D3 Opción A — botón acotado de auto-reparación de caché
 * local para usuarios no-Ω: limpia únicamente la caché versionada de Archon
 * (`archonCache.clear()`, prefijo por versión — no el `archon_*` amplio del
 * panel forense de `ArchonDoctor`) y recarga, sin exponer datos de red ni de
 * flota. Requiere confirmación explícita antes de ejecutar.
 */
export default function CacheRepairSection(): React.JSX.Element {
  const [confirming, setConfirming] = useState(false);

  return (
    <div
      className="card-archon-sovereign bg-white p-6 space-y-3 [--card-accent:#0f2a44]"
      data-testid="cache-repair-section"
    >
      <div className="archon-card-header-pro">
        <RefreshCw size={20} className="text-[#0f2a44]" />
        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-[#0f2a44]">
          Mantenimiento Local
        </h3>
      </div>
      {confirming ? (
        <RepairConfirm onCancel={(): void => setConfirming(false)} />
      ) : (
        <button
          type="button"
          onClick={(): void => setConfirming(true)}
          data-testid="cache-repair-trigger"
          className="inline-flex items-center h-11 text-sm font-bold text-[#0f2a44]/60 hover:text-[#0f2a44] underline underline-offset-2"
        >
          Reparar Caché Local
        </button>
      )}
    </div>
  );
}
