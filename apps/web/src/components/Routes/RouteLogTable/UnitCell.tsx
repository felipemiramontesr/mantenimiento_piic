import React from 'react';
import AT from '../../../styles/archonTypography';
import { FleetUnit } from '../../../types/fleet';
import { RouteLog } from './types';

interface UnitCellProps {
  log: RouteLog;
  unit: FleetUnit | undefined;
  className: string;
}

/** Celda de activo: imagen, ID de unidad, folio de ruta, marca/modelo (FC163 F2B4 Sub-Batch 4B-2). */
function UnitCell({ log, unit, className }: UnitCellProps): React.JSX.Element {
  return (
    <td className={`py-4 ${className}`}>
      <div className="flex flex-col items-center">
        {unit?.images?.[0] ? (
          <img
            src={unit.images[0]}
            className="w-20 h-20 block mx-auto rounded-[4px] shadow-sm object-cover mb-2"
            alt={log.unit_id}
            onError={(e: React.SyntheticEvent<HTMLImageElement, Event>): void => {
              const imgElement = e.currentTarget;
              imgElement.src = '/img/archon-unit-default.png';
            }}
          />
        ) : (
          <div className="w-20 h-20 mx-auto rounded-[4px] bg-slate-50 flex items-center justify-center border border-dashed border-slate-200 mb-2 overflow-hidden">
            <img
              src="/img/archon-unit-default.png"
              alt="Archon Unit Avatar"
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <span className="text-archon-base font-black text-[#0f2a44] bg-[#0f2a44]/5 px-2 py-0.5 rounded-[4px]">
          {log.unit_id}
        </span>
        <span className={`${AT.idBadge} mt-1`}>RT-{String(log.id).padStart(5, '0')}</span>
        <span className={AT.cellMeta}>
          {unit?.marca} {unit?.modelo}
        </span>
      </div>
    </td>
  );
}

export default UnitCell;
