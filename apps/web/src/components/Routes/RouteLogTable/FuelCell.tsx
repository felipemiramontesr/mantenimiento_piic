import React from 'react';
import { Fuel } from 'lucide-react';
import { FleetUnit } from '../../../types/fleet';
import { RouteLog } from './types';

interface FuelCellProps {
  log: RouteLog;
  unit: FleetUnit | undefined;
  className: string;
}

/** Celda de combustible: % de tanque y litros reales al punto de lectura (FC163 F2B4 Sub-Batch 4B-2). */
function FuelCell({ log, unit, className }: FuelCellProps): React.JSX.Element {
  const currentPercent = log.end_time ? log.fuel_level_end : log.fuel_level_start;
  const tankCap = unit?.fuelTankCapacity || 0;
  const realLiters = tankCap > 0 ? (tankCap * (currentPercent || 0)) / 100 : null;

  return (
    <td className={`py-6 ${className}`}>
      <div className="flex flex-col items-center">
        <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-100">
          <Fuel size={14} />
          <span className="text-archon-md font-black tracking-tight">
            {currentPercent?.toLocaleString(undefined, { minimumFractionDigits: 1 })}%
          </span>
        </div>
        {realLiters !== null && (
          <span className="text-archon-base font-black text-[#0f2a44] mt-1 opacity-80">
            {realLiters.toLocaleString(undefined, { minimumFractionDigits: 1 })} L
          </span>
        )}
        <span className="text-archon-xs font-bold text-slate-400 uppercase mt-0.5">
          {log.end_time ? 'LECTURA FINAL' : 'PUNTO PARTIDA'}
        </span>
      </div>
    </td>
  );
}

export default FuelCell;
