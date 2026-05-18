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
  const parts = iso.split('-').map(Number);
  if (parts.length !== 3) return null;
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

// ============================================================================
const ArchonDatePicker: React.FC<ArchonDatePickerProps> = ({
  value,
  onChange,
  placeholder = 'dd / mm / aaaa',
  id,
}): React.ReactElement => {
  const today = new Date();
  const parsed = parseISOParts(value);

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [viewYear, setViewYear] = useState<number>(parsed ? parsed.y : today.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(parsed ? parsed.m - 1 : today.getMonth());
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close on outside click
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

  const handleSelectDay = (day: number): void => {
    const iso = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(
      2,
      '0'
    )}`;
    onChange(iso);
    setIsOpen(false);
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
    ...Array<null>(firstOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_: unknown, i: number): number => i + 1),
  ];

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
      {/* ── Trigger Input ─────────────────────────────────────────────── */}
      <button
        type="button"
        id={id}
        onClick={(): void => setIsOpen((prev) => !prev)}
        className="w-full h-11 bg-[#0f2a44]/5 border-0 border-b-2 border-solid border-[#0f2a44]/10 focus:border-b-[#f2b705] focus:bg-white focus:shadow-[0_4px_12px_rgba(15,42,68,0.05)] px-4 rounded-[4px] text-[13px] font-bold transition-all duration-300 outline-none flex items-center justify-between cursor-pointer text-left"
        style={{
          color: value ? '#0f2a44' : '#94a3b8',
        }}
      >
        <span className="font-sans text-[13px] font-bold">
          {value ? formatDisplay(value) : placeholder}
        </span>
        <Calendar size={16} className="text-[#f2b705] shrink-0 ml-2" />
      </button>

      {/* ── Calendar Popup ────────────────────────────────────────────── */}
      {isOpen && (
        <div className="absolute top-full left-0 w-full mt-2 bg-white border border-[#0f2a44]/10 rounded-[4px] shadow-2xl p-4 z-[500] flex flex-col">
          {/* Header: Month Navigation */}
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#0f2a44]/5">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 hover:bg-[#0f2a44]/5 rounded transition-colors text-[#0f2a44]/60 hover:text-[#0f2a44] flex items-center justify-center cursor-pointer border-none bg-transparent"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-[11px] font-black text-[#0f2a44] uppercase tracking-wider">
              {MONTHS_ES[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 hover:bg-[#0f2a44]/5 rounded transition-colors text-[#0f2a44]/60 hover:text-[#0f2a44] flex items-center justify-center cursor-pointer border-none bg-transparent"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Day Names */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {DAYS_ES.map(
              (d: string): React.ReactElement => (
                <div
                  key={d}
                  className="text-[9px] font-black text-[#0f2a44]/40 uppercase tracking-widest py-1"
                >
                  {d}
                </div>
              )
            )}
          </div>

          {/* Day Cells */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {cells.map(
              (day: number | null, i: number): React.ReactElement => (
                <div key={i}>
                  {day !== null ? (
                    <button
                      type="button"
                      onClick={(): void => handleSelectDay(day)}
                      className={((): string => {
                        const base =
                          'w-full aspect-square flex items-center justify-center text-xs font-bold rounded-[4px] transition-all duration-200 cursor-pointer border-none';
                        if (isSelectedDay(day)) {
                          return `${base} bg-[#f2b705] text-[#0f2a44] font-black shadow-[0_0_8px_rgba(242,183,5,0.4)]`;
                        }
                        if (isTodayDay(day)) {
                          return `${base} bg-[#0f2a44]/5 text-[#f2b705] font-black`;
                        }
                        return `${base} bg-transparent text-[#0f2a44] hover:bg-[#0f2a44]/5 hover:text-[#0f2a44]`;
                      })()}
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

          {/* Clear link */}
          {value && (
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
                onClick={(): void => {
                  onChange('');
                  setIsOpen(false);
                }}
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
          )}
        </div>
      )}
    </div>
  );
};

export default ArchonDatePicker;
