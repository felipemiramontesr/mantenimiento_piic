import React from 'react';
import { DIAS_CORTOS, getDaysInMonth, getFirstWeekday, getDayCls, toISO } from './dateHelpers';

interface DayGridProps {
  year: number;
  month: number;
  selected: string;
  rangeFrom: string;
  rangeTo: string;
  today: string;
  onDaySelect: (date: string) => void;
}

/** Fila de encabezados de días de la semana (FC163 F2B4 Sub-Batch 4B-2). */
function DayGridHeaders(): React.ReactElement {
  return (
    <div className="grid grid-cols-7 border-l border-t border-slate-200">
      {DIAS_CORTOS.map((d) => (
        <span
          key={d}
          className="h-7 border-r border-b border-slate-200 flex items-center justify-center text-archon-sm font-black uppercase tracking-widest text-pinnacle-navy/30 select-none bg-slate-50/60"
        >
          {d}
        </span>
      ))}
    </div>
  );
}

interface DayCellButtonProps {
  year: number;
  month: number;
  day: number;
  selected: string;
  rangeFrom: string;
  rangeTo: string;
  today: string;
  onDaySelect: (date: string) => void;
}

/** Botón de un día individual dentro de la grilla (FC163 F2B4 Sub-Batch 4B-2). */
function DayCellButton({
  year,
  month,
  day,
  selected,
  rangeFrom,
  rangeTo,
  today,
  onDaySelect,
}: DayCellButtonProps): React.ReactElement {
  const dateStr = toISO(year, month, day);
  return (
    <button
      type="button"
      onClick={(): void => onDaySelect(dateStr)}
      className={`h-8 border-r border-b border-slate-200 text-archon-md flex items-center justify-center transition-all duration-150 cursor-pointer select-none outline-none ${getDayCls(
        dateStr,
        selected,
        rangeFrom,
        rangeTo,
        today
      )}`}
    >
      {day}
    </button>
  );
}

/** Grilla de días del mes (encabezados + celdas) (FC163 F2B4 Sub-Batch 4B-2). */
export function DayGrid({
  year,
  month,
  selected,
  rangeFrom,
  rangeTo,
  today,
  onDaySelect,
}: DayGridProps): React.ReactElement {
  const firstWeekday = getFirstWeekday(year, month);
  const daysInMonth = getDaysInMonth(year, month);
  const emptyCells = Array<null>(firstWeekday).fill(null);
  const dayCells = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <>
      <DayGridHeaders />
      <div className="grid grid-cols-7 border-l border-slate-200">
        {emptyCells.map((_, i) => (
          <span key={`e${i}`} className="h-8 border-r border-b border-slate-200" />
        ))}
        {dayCells.map((day) => (
          <DayCellButton
            key={day}
            year={year}
            month={month}
            day={day}
            selected={selected}
            rangeFrom={rangeFrom}
            rangeTo={rangeTo}
            today={today}
            onDaySelect={onDaySelect}
          />
        ))}
      </div>
    </>
  );
}

export default DayGrid;
