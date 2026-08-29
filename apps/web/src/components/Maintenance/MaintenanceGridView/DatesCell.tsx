import React from 'react';
import { Calendar } from 'lucide-react';
import { MaintenanceLog } from '../../../types/maintenance';
import AT from '../../../styles/archonTypography';
import { fmtDateTime, daysBetween } from './dateHelpers';

interface DateFieldRowProps {
  label: string;
  children: React.ReactNode;
}

/** Fila "etiqueta / valor" de la celda de fechas (Entrada, Salida, Días). */
function DateFieldRow({ label, children }: DateFieldRowProps): React.JSX.Element {
  return (
    <div className="grid grid-cols-2 items-center gap-2">
      <span className="text-archon-sm font-black text-[#0f2a44]/40 uppercase tracking-[0.1em] text-right">
        {label}
      </span>
      {children}
    </div>
  );
}

interface DateTimeValueProps {
  date: string;
  time: string;
  iconClassName: string;
  timeClassName: string;
}

/** Icono + fecha + hora opcional (Entrada/Salida cuando no está "En curso"). */
function DateTimeValue({
  date,
  time,
  iconClassName,
  timeClassName,
}: DateTimeValueProps): React.JSX.Element {
  return (
    <div className="flex items-center gap-1">
      <Calendar size={9} className={iconClassName} />
      <span className={AT.cellValue}>{date}</span>
      {time && <span className={timeClassName}>{time}</span>}
    </div>
  );
}

interface DatesCellProps {
  log: MaintenanceLog;
  isActive: boolean;
}

/** Celda de fechas: entrada, salida (o "En curso") y días transcurridos (FC165 F2 Slice 2.1B). */
function DatesCell({ log, isActive }: DatesCellProps): React.JSX.Element {
  const entry = fmtDateTime(log.start_at ?? log.service_date);
  const exit = fmtDateTime(log.end_at);

  return (
    <td className="py-4 px-3 text-center">
      <div className="flex flex-col gap-3 w-full items-center">
        <DateFieldRow label="Entrada">
          <DateTimeValue
            date={entry.date}
            time={entry.time}
            iconClassName="text-[#0f2a44]/30 shrink-0"
            timeClassName="text-archon-sm font-mono text-[#0f2a44]/40"
          />
        </DateFieldRow>
        <DateFieldRow label="Salida">
          {isActive ? (
            <span
              className={`${AT.statusBadge} bg-amber-500/10 text-amber-700 border-amber-400/30 justify-self-start`}
            >
              En curso
            </span>
          ) : (
            <DateTimeValue
              date={exit.date}
              time={exit.time}
              iconClassName="text-emerald-500/60 shrink-0"
              timeClassName="text-archon-sm font-mono text-emerald-600/50"
            />
          )}
        </DateFieldRow>
        <DateFieldRow label="Días">
          <span
            className={`${AT.statusBadge} justify-self-start ${
              isActive
                ? 'bg-amber-500/10 text-amber-700 border-amber-400/30'
                : 'bg-[#0f2a44]/5 text-[#0f2a44] border-[#0f2a44]/10'
            }`}
          >
            {daysBetween(log.start_at ?? log.service_date, log.end_at)}d
          </span>
        </DateFieldRow>
      </div>
    </td>
  );
}

export default DatesCell;
