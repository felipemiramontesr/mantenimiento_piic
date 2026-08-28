import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

// ============================================================================
// 📅 ARCHON DATE PICKER (v.8.1.0)
// Sovereign calendar component — Navy/Yellow design system
// ============================================================================

interface ArchonDatePickerProps {
  value: string;
  onChange: (newDate: string) => void;
  placeholder?: string;
  id?: string;
}

const MONTHS_ES: string[] = [
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

const DAYS_ES: string[] = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];

const parseISOParts = (iso: string): { y: number; m: number; d: number } | null => {
  if (!iso) return null;
  const parts = iso.slice(0, 10).split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
  return { y: parts[0], m: parts[1], d: parts[2] };
};

const getDaysInMonth = (year: number, month: number): number =>
  new Date(year, month + 1, 0).getDate();

// Monday-based offset (0 = Monday, 6 = Sunday)
const getFirstDayOffset = (year: number, month: number): number => {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
};

const formatDisplay = (iso: string): string => {
  const parts = parseISOParts(iso);
  if (!parts) return '';
  return `${String(parts.d).padStart(2, '0')} / ${String(parts.m).padStart(2, '0')} / ${parts.y}`;
};

/** Clase Tailwind de una celda de día según su estado (seleccionado/hoy/normal) (FC165 F1, split). */
function getDayButtonClassName(isSelected: boolean, isToday: boolean): string {
  const base =
    'w-full aspect-square flex items-center justify-center text-xs font-bold rounded-[4px] transition-all duration-200 cursor-pointer border-none';
  if (isSelected) {
    return `${base} bg-[#f2b705] text-[#0f2a44] font-black shadow-[0_0_8px_rgba(242,183,5,0.4)]`;
  }
  if (isToday) {
    return `${base} bg-[#0f2a44]/5 text-[#f2b705] font-black`;
  }
  return `${base} bg-transparent text-[#0f2a44] hover:bg-[#0f2a44]/5 hover:text-[#0f2a44]`;
}

interface DatePickerState {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  viewYear: number;
  viewMonth: number;
  wrapperRef: React.RefObject<HTMLDivElement>;
  handlePrevMonth: () => void;
  handleNextMonth: () => void;
  handleSelectDay: (day: number) => void;
  isSelectedDay: (day: number) => boolean;
  isTodayDay: (day: number) => boolean;
  cells: (number | null)[];
}

interface CalendarViewState {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  viewYear: number;
  viewMonth: number;
  wrapperRef: React.RefObject<HTMLDivElement>;
  handlePrevMonth: () => void;
  handleNextMonth: () => void;
}

/** Apertura/cierre + mes visible + cierre-al-click-afuera del calendario (FC165 F1, split). */
function useCalendarViewState(initialYear: number, initialMonth: number): CalendarViewState {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [viewYear, setViewYear] = useState<number>(initialYear);
  const [viewMonth, setViewMonth] = useState<number>(initialMonth);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOut = (e: MouseEvent): void => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOut);
    return (): void => {
      document.removeEventListener('mousedown', handleOut);
    };
  }, []);

  const handlePrevMonth = (): void => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = (): void => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  return { isOpen, setIsOpen, viewYear, viewMonth, wrapperRef, handlePrevMonth, handleNextMonth };
}

interface CalendarSelection {
  handleSelectDay: (day: number) => void;
  isSelectedDay: (day: number) => boolean;
  isTodayDay: (day: number) => boolean;
  cells: (number | null)[];
}

/** Selección de día + celdas del mes visible (FC165 F1, split de ArchonDatePicker). */
function useCalendarSelection(
  value: string,
  viewYear: number,
  viewMonth: number,
  onChange: (newDate: string) => void,
  closeCalendar: () => void
): CalendarSelection {
  const today = new Date();
  const parsed = parseISOParts(value);

  const handleSelectDay = (day: number): void => {
    const iso = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(
      2,
      '0'
    )}`;
    onChange(iso);
    closeCalendar();
  };

  const isSelectedDay = (day: number): boolean => {
    if (!parsed) return false;
    return parsed.y === viewYear && parsed.m - 1 === viewMonth && parsed.d === day;
  };

  const isTodayDay = (day: number): boolean =>
    today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === day;

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstOffset = getFirstDayOffset(viewYear, viewMonth);
  const cells: (number | null)[] = [
    ...new Array<null>(firstOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_: unknown, i: number): number => i + 1),
  ];

  return { handleSelectDay, isSelectedDay, isTodayDay, cells };
}

/** Estado + navegación + selección del calendario (FC165 F1, split de ArchonDatePicker). */
function useDatePickerState(value: string, onChange: (newDate: string) => void): DatePickerState {
  const today = new Date();
  const parsed = parseISOParts(value);
  const view = useCalendarViewState(
    parsed ? parsed.y : today.getFullYear(),
    parsed ? parsed.m - 1 : today.getMonth()
  );
  const selection = useCalendarSelection(value, view.viewYear, view.viewMonth, onChange, () =>
    view.setIsOpen(false)
  );

  return { ...view, ...selection };
}

interface DatePickerTriggerProps {
  id?: string;
  value: string;
  placeholder: string;
  onClick: () => void;
}

/** Input-botón que abre/cierra el calendario (FC165 F1, split). */
function DatePickerTrigger({
  id,
  value,
  placeholder: fieldPlaceholder,
  onClick,
}: DatePickerTriggerProps): React.JSX.Element {
  return (
    <button
      type="button"
      id={id}
      onClick={onClick}
      className="w-full h-11 bg-[#0f2a44]/5 border-0 border-b-2 border-solid border-[#0f2a44]/10 focus:border-b-[#f2b705] focus:bg-white focus:shadow-[0_4px_12px_rgba(15,42,68,0.05)] px-4 rounded-[4px] text-archon-lg font-bold transition-all duration-300 outline-none flex items-center justify-between cursor-pointer text-left"
      style={{
        color: value ? '#0f2a44' : 'rgba(15, 42, 68, 0.3)',
      }}
    >
      <span className="font-sans text-archon-lg font-bold">
        {value ? formatDisplay(value) : fieldPlaceholder}
      </span>
      <Calendar size={16} className="text-[#f2b705] shrink-0 ml-2" />
    </button>
  );
}

interface CalendarMonthHeaderProps {
  viewMonth: number;
  viewYear: number;
  onPrev: () => void;
  onNext: () => void;
}

/** Fila de navegación de mes (anterior/nombre-de-mes/siguiente) (FC165 F1, split). */
function CalendarMonthHeader({
  viewMonth,
  viewYear,
  onPrev,
  onNext,
}: CalendarMonthHeaderProps): React.JSX.Element {
  return (
    <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#0f2a44]/5">
      <button
        type="button"
        onClick={onPrev}
        className="p-1 hover:bg-[#0f2a44]/5 rounded transition-colors text-[#0f2a44]/60 hover:text-[#0f2a44] flex items-center justify-center cursor-pointer border-none bg-transparent"
      >
        <ChevronLeft size={16} />
      </button>
      <span className="text-archon-md font-black text-[#0f2a44] uppercase tracking-wider">
        {MONTHS_ES[viewMonth]} {viewYear}
      </span>
      <button
        type="button"
        onClick={onNext}
        className="p-1 hover:bg-[#0f2a44]/5 rounded transition-colors text-[#0f2a44]/60 hover:text-[#0f2a44] flex items-center justify-center cursor-pointer border-none bg-transparent"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}

/** Fila estática de iniciales de día (Lu/Ma/.../Do) (FC165 F1, split). */
function DayNamesRow(): React.JSX.Element {
  return (
    <div className="grid grid-cols-7 gap-1 text-center mb-1">
      {DAYS_ES.map(
        (d: string): React.ReactElement => (
          <div
            key={d}
            className="text-archon-sm font-black text-[#0f2a44]/40 uppercase tracking-widest py-1"
          >
            {d}
          </div>
        )
      )}
    </div>
  );
}

interface CalendarDaysGridProps {
  cells: (number | null)[];
  isSelectedDay: (day: number) => boolean;
  isTodayDay: (day: number) => boolean;
  onSelectDay: (day: number) => void;
}

/** Cuadrícula de celdas de día (7 columnas, huecos + botones seleccionables) (FC165 F1, split). */
function CalendarDaysGrid({
  cells,
  isSelectedDay,
  isTodayDay,
  onSelectDay,
}: CalendarDaysGridProps): React.JSX.Element {
  return (
    <div className="grid grid-cols-7 gap-1 text-center">
      {cells.map(
        (day: number | null, i: number): React.ReactElement => (
          <div key={i}>
            {day !== null ? (
              <button
                type="button"
                onClick={(): void => onSelectDay(day)}
                className={getDayButtonClassName(isSelectedDay(day), isTodayDay(day))}
              >
                {day}
              </button>
            ) : (
              <div className="w-full aspect-square" />
            )}
          </div>
        )
      )}
    </div>
  );
}

interface ClearDateButtonProps {
  onClear: () => void;
}

/** Enlace "Limpiar fecha" bajo el calendario, visible solo con valor seleccionado (FC165 F1, split). */
function ClearDateButton({ onClear }: ClearDateButtonProps): React.JSX.Element {
  return (
    <div
      style={{
        textAlign: 'center',
        marginTop: '8px',
        borderTop: '1px solid rgba(15,42,68,0.07)',
        paddingTop: '8px',
      }}
    >
      <button
        type="button"
        onClick={onClear}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: '11px',
          fontWeight: 700,
          color: '#94a3b8',
          fontFamily: 'Inter, sans-serif',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
        }}
      >
        Limpiar fecha
      </button>
    </div>
  );
}

// ============================================================================
/** Selector de fecha soberano (input-botón + calendario desplegable) (FC165 F1, JSDoc). */
const ArchonDatePicker: React.FC<ArchonDatePickerProps> = ({
  value,
  onChange,
  placeholder: fieldPlaceholder = 'dd / mm / aaaa',
  id,
}): React.ReactElement => {
  const state = useDatePickerState(value, onChange);

  return (
    <div ref={state.wrapperRef} style={{ position: 'relative', width: '100%' }}>
      <DatePickerTrigger
        id={id}
        value={value}
        placeholder={fieldPlaceholder}
        onClick={(): void => state.setIsOpen((prev) => !prev)}
      />
      {state.isOpen && (
        <div className="absolute top-full left-0 w-full mt-2 bg-white border border-[#0f2a44]/10 rounded-[4px] shadow-2xl p-4 z-[500] flex flex-col">
          <CalendarMonthHeader
            viewMonth={state.viewMonth}
            viewYear={state.viewYear}
            onPrev={state.handlePrevMonth}
            onNext={state.handleNextMonth}
          />
          <DayNamesRow />
          <CalendarDaysGrid
            cells={state.cells}
            isSelectedDay={state.isSelectedDay}
            isTodayDay={state.isTodayDay}
            onSelectDay={state.handleSelectDay}
          />
          {value && (
            <ClearDateButton
              onClear={(): void => {
                onChange('');
                state.setIsOpen(false);
              }}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default ArchonDatePicker;
