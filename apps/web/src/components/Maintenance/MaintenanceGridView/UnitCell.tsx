import React from 'react';
import { MaintenanceLog } from '../../../types/maintenance';
import { FleetUnit } from '../../../types/fleet';
import AT from '../../../styles/archonTypography';

interface UnitCellProps {
  log: MaintenanceLog;
  unit: FleetUnit | undefined;
  isActive: boolean;
}

/** Celda de unidad: miniatura, id, badge "EN TALLER" y marca/modelo (FC165 F2 Slice 2.1B). */
function UnitCell({ log, unit, isActive }: UnitCellProps): React.JSX.Element {
  return (
    <td className="py-4 px-3 text-center">
      <div className="flex flex-col items-center">
        {unit?.images?.[0] ? (
          <img
            src={unit.images[0]}
            className="w-20 h-20 block mx-auto rounded-[4px] shadow-sm object-cover mb-2"
            alt={log.unit_id}
            onError={(e: React.SyntheticEvent<HTMLImageElement, Event>): void => {
              const img = e.currentTarget;
              img.src = '/img/archon-unit-default.png';
            }}
          />
        ) : (
          <div className="w-20 h-20 mx-auto rounded-[4px] bg-slate-50 flex items-center justify-center border border-dashed border-slate-200 mb-2 overflow-hidden">
            <img
              src="/img/archon-unit-default.png"
              alt="Archon Unit — Sin Imagen"
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <span className="text-archon-base font-black text-[#0f2a44] bg-[#0f2a44]/5 px-2 py-0.5 rounded-[4px]">
          {log.unit_id}
        </span>
        <span className={`${AT.idBadge} mt-1`}>MNT-{String(log.id).padStart(5, '0')}</span>
        {isActive && (
          <span
            className={`${AT.statusBadge} bg-amber-500/10 text-amber-700 border-amber-500/20 mt-0.5`}
          >
            EN TALLER
          </span>
        )}
        <span className={AT.cellMeta}>
          {unit?.marca} {unit?.modelo}
        </span>
      </div>
    </td>
  );
}

export default UnitCell;
