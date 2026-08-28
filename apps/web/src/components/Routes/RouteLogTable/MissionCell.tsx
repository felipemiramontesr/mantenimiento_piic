import React from 'react';
import { Clock, ArrowRight } from 'lucide-react';
import { formatDateTime, calculateDuration } from '../../../utils/dateUtils';
import { RouteLog } from './types';

interface DepartureRecordProps {
  log: RouteLog;
  sede: string;
}

/** Registro de salida: hora, sede origen y destino (FC163 F2B4 Sub-Batch 4B-2). */
function DepartureRecord({ log, sede }: DepartureRecordProps): React.JSX.Element {
  return (
    <div className="w-full flex flex-col items-center gap-1">
      <div className="flex items-center gap-2 whitespace-nowrap">
        <span className="text-archon-base font-black text-emerald-500 uppercase tracking-tighter w-[45px]">
          Salida:
        </span>
        <div className="flex items-center gap-2">
          <Clock size={10} className="text-[#0f2a44] opacity-30" />
          <span className="text-archon-base font-bold text-[#0f2a44]">
            {formatDateTime(log.start_time)}
          </span>
          <span className="text-archon-base font-black text-[#0f2a44] opacity-40">—</span>
          <span className="text-archon-base font-black text-[#0f2a44] uppercase tracking-tighter">
            {sede}
          </span>
        </div>
      </div>
      <div className="flex items-start gap-2 pl-[53px] w-full">
        <ArrowRight size={10} className="text-emerald-500 mt-0.5 shrink-0 opacity-40" />
        <span className="text-archon-base font-bold text-emerald-600 uppercase tracking-tighter break-words text-left leading-relaxed w-full pr-4">
          {log.destination}
        </span>
      </div>
    </div>
  );
}

interface ArrivalRecordProps {
  log: RouteLog;
  sede: string;
}

/** Registro de llegada: hora, sede, destino y tiempo total (FC163 F2B4 Sub-Batch 4B-2). */
function ArrivalRecord({ log, sede }: ArrivalRecordProps): React.JSX.Element | null {
  if (!log.end_time) return null;
  return (
    <>
      <div className="w-full flex flex-col items-center gap-1 mt-1.5 border-t border-[#0f2a44]/5 pt-1.5">
        <div className="flex items-center gap-2 whitespace-nowrap">
          <span className="text-archon-base font-black text-blue-500 uppercase tracking-tighter w-[45px]">
            Llegada:
          </span>
          <div className="flex items-center gap-2">
            <Clock size={10} className="text-[#0f2a44] opacity-30" />
            <span className="text-archon-base font-bold text-[#0f2a44]">
              {formatDateTime(log.end_time)}
            </span>
            <span className="text-archon-base font-black text-[#0f2a44] opacity-40">—</span>
            <span className="text-archon-base font-black text-[#0f2a44] uppercase tracking-tighter opacity-70">
              {sede}
            </span>
          </div>
        </div>
        <div className="flex items-start gap-2 pl-[53px] w-full">
          <ArrowRight size={10} className="text-blue-500 mt-0.5 shrink-0 opacity-40 rotate-180" />
          <span className="text-archon-base font-bold text-[#0f2a44] uppercase tracking-tighter opacity-80 break-words text-left leading-relaxed w-full pr-4">
            {log.destination}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-2 pl-[53px]">
        <span className="text-archon-sm font-black text-[#0f2a44] uppercase tracking-widest opacity-40">
          Tiempo Total:
        </span>
        <span className="text-archon-base font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
          {calculateDuration(log.start_time, log.end_time)}
        </span>
      </div>
    </>
  );
}

interface MissionCellProps {
  log: RouteLog;
  sede: string;
  className: string;
}

/** Celda de misión: registros de salida y llegada del trayecto (FC163 F2B4 Sub-Batch 4B-2). */
function MissionCell({ log, sede, className }: MissionCellProps): React.JSX.Element {
  return (
    <td className={`py-6 text-center ${className}`}>
      <div className="flex flex-col items-center gap-1 px-4">
        <DepartureRecord log={log} sede={sede} />
        <ArrivalRecord log={log} sede={sede} />
      </div>
    </td>
  );
}

export default MissionCell;
