import React from 'react';
import { Gauge, CheckCircle2 } from 'lucide-react';
import { RouteLog } from './types';

interface TelemetryCellProps {
  log: RouteLog;
  className: string;
}

/** Celda de telemetría: KM de partida y KM final (FC163 F2B4 Sub-Batch 4B-2). */
function TelemetryCell({ log, className }: TelemetryCellProps): React.JSX.Element {
  return (
    <td className={`py-6 ${className}`}>
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-2 text-slate-400">
          <Gauge size={14} />
          <span className="text-archon-md font-black tracking-tight">
            {log.start_km?.toLocaleString() || '0'} KM
          </span>
        </div>
        {log.end_km !== null && log.end_km !== undefined && (
          <div className="flex items-center gap-2 text-emerald-500">
            <CheckCircle2 size={14} />
            <span className="text-archon-md font-black tracking-tight">
              {log.end_km?.toLocaleString()} KM
            </span>
          </div>
        )}
      </div>
    </td>
  );
}

export default TelemetryCell;
