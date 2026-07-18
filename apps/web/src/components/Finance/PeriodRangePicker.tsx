import React, { useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, Calendar } from 'lucide-react';
import { DateRange } from '../../types/finance';

// ─── Constantes es-MX ─────────────────────────────────────────────────────────

const MESES: readonly string[] = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const DIAS_CORTOS: readonly string[] = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'];

// ─── Helpers puros ────────────────────────────────────────────────────────────

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstWeekday(year: number, month: number): number {
  const raw = new Date(year, month, 1).getDay();
  return (raw + 6) % 7; // Lun=0 … Dom=6
}

function toISO(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function todayISO(): string {
  const n = new Date();
  return toISO(n.getFullYear(), n.getMonth(), n.getDate());
}

function formatLabel(date: string): string {
  if (!date) return '—';
  const [y, m, d] = date.split('-');
  return `${Number(d)} de ${MESES[Number(m) - 1].toLowerCase()} de ${y}`;
}

function parseYMFromDate(date: string): { year: number; month: number } {
  const parts = date.split('-');
  return { year: Number(parts[0]), month: Number(parts[1]) - 1 };
}

function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const d = new Date(year, month + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

// ─── CalendarPanel ────────────────────────────────────────────────────────────

interface PanelProps {
  title: string;
  year: number;
  month: number;
  selected: string;
  rangeFrom: string;
  rangeTo: string;
  today: string;
  onDaySelect: (date: string) => void;
  onPrev: () => void;
  onNext: () => void;
}

function getDayCls(
  dateStr: string,
  selected: string,
  rangeFrom: string,
  rangeTo: string,
  today: string
): string {
  const isSelected = dateStr === selected;
  const isFrom = dateStr === rangeFrom;
  const isTo = dateStr === rangeTo;
  const isInRange =
    Boolean(rangeFrom) && Boolean(rangeTo) && dateStr > rangeFrom && dateStr < rangeTo;
  const isToday = dateStr === today && !isSelected && !isFrom && !isTo;

  if (isSelected || isFrom || isTo) {
    return 'bg-pinnacle-navy text-white rounded-[4px] font-black scale-105 shadow-sm';
  }
  if (isInRange) {
    return 'bg-pinnacle-navy/10 text-pinnacle-navy rounded-[4px]';
  }
  if (isToday) {
    return 'ring-1 ring-yellow-400 rounded-[4px] text-pinnacle-navy font-bold';
  }
  return 'bg-transparent text-pinnacle-navy/70 hover:bg-slate-100 rounded-[4px]';
}

function CalendarPanel({
  title,
  year,
  month,
  selected,
  rangeFrom,
  rangeTo,
  today,
  onDaySelect,
  onPrev,
  onNext,
}: PanelProps): React.ReactElement {
  const firstWeekday = getFirstWeekday(year, month);
  const daysInMonth = getDaysInMonth(year, month);
  const emptyCells = Array<null>(firstWeekday).fill(null);
  const dayCells = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const navBtnCls =
    'w-7 h-7 flex items-center justify-center rounded-[4px] text-pinnacle-navy/50 hover:bg-slate-100 hover:text-pinnacle-navy transition-all duration-200 border-none outline-none cursor-pointer bg-transparent';

  return (
    <div className="flex flex-col gap-3">
      {/* Etiqueta del panel */}
      <span className="text-archon-sm font-black uppercase tracking-[0.25em] text-pinnacle-navy/40">
        {title}
      </span>

      {/* Navegación de mes */}
      <div className="flex items-center justify-between">
        <button onClick={onPrev} className={navBtnCls} title="Mes anterior">
          <ChevronLeft size={14} />
        </button>
        <span className="text-archon-lg font-black text-pinnacle-navy tracking-tight select-none">
          {MESES[month]} {year}
        </span>
        <button onClick={onNext} className={navBtnCls} title="Mes siguiente">
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Encabezados de días */}
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

      {/* Grilla de días */}
      <div className="grid grid-cols-7 border-l border-slate-200">
        {emptyCells.map((_, i) => (
          <span key={`e${i}`} className="h-8 border-r border-b border-slate-200" />
        ))}
        {dayCells.map((day) => {
          const dateStr = toISO(year, month, day);
          return (
            <button
              key={day}
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
        })}
      </div>

      {/* Fecha seleccionada */}
      <p className="text-archon-base font-bold text-pinnacle-navy/50 text-center mt-1 min-h-[16px]">
        {selected ? formatLabel(selected) : ''}
      </p>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

interface PeriodRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

const PeriodRangePicker: React.FC<PeriodRangePickerProps> = ({
  value,
  onChange,
}): React.ReactElement => {
  const today = todayISO();
  const fromYM = parseYMFromDate(value.from);
  const toYM = parseYMFromDate(value.to);

  const [isOpen, setIsOpen] = useState(false);
  const [leftView, setLeftView] = useState({ year: fromYM.year, month: fromYM.month });
  const [rightView, setRightView] = useState({ year: toYM.year, month: toYM.month });
  const [draftFrom, setDraftFrom] = useState(value.from);
  const [draftTo, setDraftTo] = useState(value.to);
  const [error, setError] = useState<string | null>(null);

  const handleToggle = (): void => {
    if (!isOpen) {
      setDraftFrom(value.from);
      setDraftTo(value.to);
      setLeftView(parseYMFromDate(value.from));
      setRightView(parseYMFromDate(value.to));
      setError(null);
    }
    setIsOpen((v) => !v);
  };

  const handleFromSelect = useCallback((date: string): void => {
    setDraftFrom(date);
    setError(null);
  }, []);

  const handleToSelect = useCallback((date: string): void => {
    setDraftTo(date);
    setError(null);
  }, []);

  const handleApply = (): void => {
    if (!draftFrom || !draftTo) {
      setError('Selecciona una fecha de inicio y fin.');
      return;
    }
    if (draftFrom > draftTo) {
      setError('La fecha de inicio debe ser anterior o igual a la fecha de fin.');
      return;
    }
    setError(null);
    onChange({ from: draftFrom, to: draftTo });
    setIsOpen(false);
  };

  const appliedLabel =
    value.from && value.to
      ? `${formatLabel(value.from)} — ${formatLabel(value.to)}`
      : 'Selecciona un rango';

  return (
    <div className="w-full">
      {/* Trigger — col-beta del grid, mismo ancho y alineación que el card
          superior. FC 078 F3 (P1-3): <md apila a 1 columna — el widget se
          recortaba/solapaba a 360px al vivir en media columna. */}
      <div
        data-testid="period-picker-trigger-row"
        className="grid grid-cols-1 md:grid-cols-2 md:gap-10"
      >
        <div className="hidden md:block" />
        <button
          onClick={handleToggle}
          style={{ borderTopColor: '#0f2a44' }}
          className="flex items-center justify-between h-11 px-4 bg-white border border-pinnacle-navy/5 border-t-4 rounded-[4px] shadow-pinnacle hover:shadow-pinnacle-hover hover:bg-slate-50 transition-all duration-200 outline-none cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Calendar size={13} className="text-pinnacle-navy/40 shrink-0" />
            <span className="text-archon-md font-black text-pinnacle-navy tracking-tight">
              {appliedLabel}
            </span>
          </div>
          <ChevronDown
            size={14}
            className={`text-pinnacle-navy/40 transition-transform duration-300 shrink-0 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </button>
      </div>

      {/* Body colapsable */}
      {isOpen && (
        <>
          {/* Paneles de calendario — FC 078 F3 (P1-3): apilados <md */}
          <div
            data-testid="period-picker-panels"
            className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-10 py-4"
          >
            <div className="bg-white border border-slate-100 rounded-[4px] shadow-sm p-6">
              <CalendarPanel
                title="Desde"
                year={leftView.year}
                month={leftView.month}
                selected={draftFrom}
                rangeFrom={draftFrom}
                rangeTo={draftTo}
                today={today}
                onDaySelect={handleFromSelect}
                onPrev={(): void => setLeftView((v) => shiftMonth(v.year, v.month, -1))}
                onNext={(): void => setLeftView((v) => shiftMonth(v.year, v.month, 1))}
              />
            </div>
            <div className="bg-white border border-slate-100 rounded-[4px] shadow-sm p-6">
              <CalendarPanel
                title="Hasta"
                year={rightView.year}
                month={rightView.month}
                selected={draftTo}
                rangeFrom={draftFrom}
                rangeTo={draftTo}
                today={today}
                onDaySelect={handleToSelect}
                onPrev={(): void => setRightView((v) => shiftMonth(v.year, v.month, -1))}
                onNext={(): void => setRightView((v) => shiftMonth(v.year, v.month, 1))}
              />
            </div>
          </div>

          {/* Footer — FC 078 F3 (P1-3): apilado <md */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-10 py-3">
            <div className="flex items-center">
              {error && <p className="text-archon-base font-bold text-sentinel-red">{error}</p>}
            </div>
            <button
              onClick={handleApply}
              className="btn-archon-card-action !bg-pinnacle-navy text-white"
            >
              Aplicar Rango <ChevronRight size={12} className="ml-2" />
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default PeriodRangePicker;
