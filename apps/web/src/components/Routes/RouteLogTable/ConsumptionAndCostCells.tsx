import React from 'react';
import AT from '../../../styles/archonTypography';
import { RouteLog } from './types';

interface ConsumptionCellProps {
  consumedLiters: number | null;
  kmPerLiter: number | null;
  className: string;
}

/** Celda de consumo de combustible en litros + rendimiento KM/L (FC163 F2B4 Sub-Batch 4B-2). */
export function ConsumptionCell({
  consumedLiters,
  kmPerLiter,
  className,
}: ConsumptionCellProps): React.JSX.Element {
  return (
    <td className={`py-6 ${className}`}>
      <div className="flex flex-col items-center">
        {consumedLiters !== null ? (
          <>
            <div className="flex items-center gap-1 text-[#0f2a44] bg-[#0f2a44]/5 px-3 py-1 rounded-full border border-[#0f2a44]/10">
              <span className="text-archon-md font-black tracking-tight">
                {consumedLiters.toFixed(1)}
              </span>
              <span className="text-archon-xs font-bold opacity-60 ml-0.5">L</span>
            </div>
            {kmPerLiter !== null && (
              <span className="text-archon-base font-bold text-slate-400 mt-1 uppercase tracking-tight">
                {kmPerLiter.toFixed(2)} KM/L
              </span>
            )}
          </>
        ) : (
          <span className={AT.cellValueMuted}>---</span>
        )}
      </div>
    </td>
  );
}

interface CostCellProps {
  log: RouteLog;
  costPerKm: number | null;
  className: string;
}

/** Celda de costo total de combustible + costo por kilómetro (FC163 F2B4 Sub-Batch 4B-2). */
export function CostCell({ log, costPerKm, className }: CostCellProps): React.JSX.Element {
  return (
    <td className={`py-6 ${className}`}>
      <div className="flex flex-col items-center">
        {log.end_time ? (
          <>
            <div className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
              <span className="text-archon-base font-black opacity-70">$</span>
              <span className="text-archon-md font-black tracking-tight">
                {Number(log.fuel_amount || 0).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
            {costPerKm !== null && (
              <span className="text-archon-base font-bold text-slate-400 mt-1 uppercase tracking-tight">
                ${costPerKm.toFixed(2)}/KM
              </span>
            )}
          </>
        ) : (
          <span className={AT.cellValueMuted}>---</span>
        )}
      </div>
    </td>
  );
}
