import React from 'react';
import { Wrench, ShieldCheck } from 'lucide-react';
import { MaintenanceLog } from '../../../types/maintenance';
import { SERVICE_LABELS, SERVICE_MODE_LABELS } from './constants';

/** Banner de contexto del cierre de servicio (FC165 F3 Slice3.3 Lote A, Dual-Gate Isolation). */
function ContextBanner({ log }: { log: MaintenanceLog }): React.JSX.Element {
  return (
    <div className="flex items-start gap-4 px-6 py-5 rounded-[4px] bg-amber-500/10 border border-amber-400/40">
      <div className="w-10 h-10 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0 mt-0.5">
        <Wrench size={18} className="text-amber-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-archon-md font-black text-amber-700 uppercase tracking-[0.15em] mb-1">
          Cerrar Servicio de Taller — {log.unit_id}
        </p>
        <div className="flex flex-wrap gap-x-6 gap-y-1">
          <span className="text-archon-md text-amber-600/80 font-mono">
            MNT-{String(log.id).padStart(5, '0')}
          </span>
          <span className="text-archon-md text-amber-600/80">
            {SERVICE_LABELS[log.service_type]}
          </span>
          <span
            className={`text-archon-md font-black ${
              log.service_mode === 'PARTIAL_EXECUTION' ? 'text-amber-700' : 'text-emerald-700'
            }`}
          >
            {SERVICE_MODE_LABELS[log.service_mode]}
          </span>
        </div>
      </div>
      {log.service_mode === 'FULL_COMPLIANCE' && (
        <ShieldCheck size={20} className="text-emerald-500 shrink-0 mt-1" />
      )}
    </div>
  );
}

export default ContextBanner;
