import React from 'react';
import AT from '../../../styles/archonTypography';
import { RouteLog } from './types';

interface DeltaValueProps {
  startKm: number;
  endKm: number;
}

/** Valor de delta de kilómetros con signo y color según polaridad (FC163 F2B4 Sub-Batch 4B-2). */
function DeltaValue({ startKm, endKm }: DeltaValueProps): React.JSX.Element {
  const delta = endKm - startKm;
  const isNegative = delta < 0;
  return (
    <div
      className={`flex items-center gap-1 px-3 py-1 rounded-full ${
        isNegative ? 'text-rose-600 bg-rose-50' : 'text-emerald-600 bg-emerald-50'
      }`}
    >
      {!isNegative && <span className="text-archon-base font-black tracking-widest">+</span>}
      <span className="text-archon-md font-black tracking-tight">{delta.toLocaleString()}</span>
      <span className="text-archon-xs font-bold opacity-60 ml-0.5">KM</span>
    </div>
  );
}

interface DeltaCellProps {
  log: RouteLog;
  className: string;
}

/** Celda de delta de kilómetros recorridos (FC163 F2B4 Sub-Batch 4B-2). */
function DeltaCell({ log, className }: DeltaCellProps): React.JSX.Element {
  return (
    <td className={`py-6 ${className}`}>
      <div className="flex flex-col items-center">
        {log.end_km !== null && log.end_km !== undefined ? (
          <DeltaValue startKm={log.start_km} endKm={log.end_km} />
        ) : (
          <span className={AT.cellValueMuted}>---</span>
        )}
      </div>
    </td>
  );
}

export default DeltaCell;
