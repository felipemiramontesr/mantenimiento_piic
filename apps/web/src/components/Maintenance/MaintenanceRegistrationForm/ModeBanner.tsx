import React from 'react';
import { Warehouse, Wrench } from 'lucide-react';

interface ModeBannerProps {
  readonly selectedUnit: string;
  readonly isInProgress: boolean;
}

/** Banner de modo de registro automático (In Situ / Taller)
 * (FC165 F3 Slice3.3 Lote A, Dual-Gate Isolation — sub-split de MaintenanceRegistrationForm). */
function ModeBanner({ selectedUnit, isInProgress }: ModeBannerProps): React.JSX.Element | null {
  if (!selectedUnit) return null;
  return (
    <div
      className={`flex items-center gap-3 px-5 py-3.5 rounded-[4px] border ${
        isInProgress
          ? 'bg-amber-500/10 border-amber-400/40'
          : 'bg-emerald-500/10 border-emerald-400/30'
      }`}
    >
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
          isInProgress ? 'bg-amber-500/15' : 'bg-emerald-500/15'
        }`}
      >
        {isInProgress ? (
          <Warehouse size={14} className="text-amber-600" />
        ) : (
          <Wrench size={14} className="text-emerald-600" />
        )}
      </div>
      <div>
        <p
          className={`text-archon-md font-black uppercase tracking-[0.15em] ${
            isInProgress ? 'text-amber-700' : 'text-emerald-700'
          }`}
        >
          {isInProgress ? 'Ingreso a Taller — Downtime' : 'In Situ — Registro Inmediato'}
        </p>
        <p
          className={`text-archon-base mt-0.5 ${
            isInProgress ? 'text-amber-600/70' : 'text-emerald-600/70'
          }`}
        >
          {isInProgress
            ? 'La unidad entrará en Downtime. Cierre el servicio cuando esté listo.'
            : 'Servicio en campo. La unidad regresa a Disponible al guardar.'}
        </p>
      </div>
    </div>
  );
}

export default ModeBanner;
