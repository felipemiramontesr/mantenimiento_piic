import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * 🔱 Archon Component: ArchonCalendarView (FC 041 Fase C)
 * Cuadrícula mensual nativa para ArchonAdaptiveView — cero dependencias nuevas.
 *
 * Genérico y sin lógica de negocio: el anfitrión provee items, keyExtractor,
 * dateExtractor y renderEvent. Fechas date-only se parsean por componentes
 * (split manual) — jamás vía Date('YYYY-MM-DD') que interpreta UTC y produce
 * el clásico corrimiento de un día (§22.1). Items con fecha nula o fuera de
 * dominio se excluyen sin crashear (fail-safe — lección FC 071).
 */

export interface CalendarCell {
  iso: string; // YYYY-MM-DD
  day: number;
  inMonth: boolean;
}

export interface ArchonCalendarViewProps<T> {
  items: T[];
  keyExtractor: (item: T) => string | number;
  dateExtractor: (item: T) => string | Date | null;
  renderEvent: (item: T) => React.ReactNode;
  onEventClick?: (item: T) => void;
  /** 'YYYY-MM' — mes inicial determinista (tests); default: mes actual. */
  initialMonth?: string;
}

const WEEKDAYS_ES = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})/;

const pad = (n: number): string => String(n).padStart(2, '0');

/** Matriz fija de 6 semanas (42 celdas), lunes como primera columna. */
export function buildMonthMatrix(year: number, month: number): CalendarCell[] {
  const firstWeekday = new Date(year, month - 1, 1).getDay(); // 0=Do
  const leading = (firstWeekday + 6) % 7; // desplazamiento con lunes inicial
  const cells: CalendarCell[] = [];
  const start = new Date(year, month - 1, 1 - leading);
  for (let i = 0; i < 42; i += 1) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    cells.push({
      iso: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
      day: d.getDate(),
      inMonth: d.getMonth() === month - 1 && d.getFullYear() === year,
    });
  }
  return cells;
}

export function toIsoDay(value: string | Date | null): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
  }
  if (typeof value === 'string') {
    const match = ISO_DATE.exec(value);
    if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  }
  return null; // nulo o fuera de dominio → excluido sin crashear
}

function parseInitialMonth(initialMonth?: string): { year: number; month: number } {
  const match = initialMonth ? /^(\d{4})-(\d{2})$/.exec(initialMonth) : null;
  if (match) return { year: Number(match[1]), month: Number(match[2]) };
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

function ArchonCalendarView<T>({
  items,
  keyExtractor,
  dateExtractor,
  renderEvent,
  onEventClick,
  initialMonth,
}: ArchonCalendarViewProps<T>): React.ReactElement {
  const [{ year, month }, setPeriod] = useState(() => parseInitialMonth(initialMonth));

  const shiftMonth = (delta: number): void => {
    setPeriod((prev) => {
      const d = new Date(prev.year, prev.month - 1 + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() + 1 };
    });
  };

  const eventsByDay = new Map<string, T[]>();
  items.forEach((item) => {
    const iso = toIsoDay(dateExtractor(item));
    if (iso === null) return;
    eventsByDay.set(iso, [...(eventsByDay.get(iso) ?? []), item]);
  });

  const title = new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric' }).format(
    new Date(year, month - 1, 1)
  );

  const chipClasses =
    'block w-full min-w-0 overflow-hidden text-left truncate rounded-[4px] px-1.5 py-0.5 ' +
    'text-[11px] font-bold bg-pinnacle-navy/10 text-pinnacle-navy';

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <button
          type="button"
          data-testid="calendar-prev"
          aria-label="Mes anterior"
          onClick={(): void => shiftMonth(-1)}
          className="flex items-center justify-center w-9 h-9 rounded-[4px] bg-pinnacle-navy/5 text-pinnacle-navy hover:bg-pinnacle-navy/10 transition-all"
        >
          <ChevronLeft size={16} strokeWidth={2.5} />
        </button>
        <h3
          data-testid="calendar-title"
          className="font-display font-black text-archon-lg text-pinnacle-navy uppercase tracking-[0.15em]"
        >
          {title}
        </h3>
        <button
          type="button"
          data-testid="calendar-next"
          aria-label="Mes siguiente"
          onClick={(): void => shiftMonth(1)}
          className="flex items-center justify-center w-9 h-9 rounded-[4px] bg-pinnacle-navy/5 text-pinnacle-navy hover:bg-pinnacle-navy/10 transition-all"
        >
          <ChevronRight size={16} strokeWidth={2.5} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS_ES.map((wd) => (
          <div
            key={wd}
            data-testid="calendar-weekday"
            className="text-center text-archon-sm font-black uppercase tracking-widest text-pinnacle-navy/40 py-1"
          >
            {wd}
          </div>
        ))}
        {buildMonthMatrix(year, month).map((cell) => (
          <div
            key={cell.iso}
            data-testid={`calendar-day-${cell.iso}`}
            className={`min-h-[72px] min-w-0 rounded-[4px] border p-1 flex flex-col gap-1 ${
              cell.inMonth
                ? 'bg-white border-pinnacle-navy/10'
                : 'bg-pinnacle-navy/[0.02] border-transparent'
            }`}
          >
            <span
              className={`text-archon-sm font-black ${
                cell.inMonth ? 'text-pinnacle-navy/70' : 'text-pinnacle-navy/20'
              }`}
            >
              {cell.day}
            </span>
            {cell.inMonth &&
              (eventsByDay.get(cell.iso) ?? []).map((item) =>
                onEventClick ? (
                  <button
                    key={keyExtractor(item)}
                    type="button"
                    onClick={(): void => onEventClick(item)}
                    className={`${chipClasses} hover:bg-pinnacle-yellow/30 cursor-pointer transition-all`}
                  >
                    {renderEvent(item)}
                  </button>
                ) : (
                  <span key={keyExtractor(item)} className={chipClasses}>
                    {renderEvent(item)}
                  </span>
                )
              )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default ArchonCalendarView;
