import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

// ============================================================================
// 📅 ARCHON DATE PICKER (v.7.2.2)
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
        className="archon-input"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          textAlign: 'left',
          width: '100%',
          color: value ? '#0f2a44' : '#94a3b8',
        }}
      >
        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px' }}>
          {value ? formatDisplay(value) : placeholder}
        </span>
        <Calendar size={16} style={{ color: '#f2b705', flexShrink: 0, marginLeft: '8px' }} />
      </button>

      {/* ── Calendar Popup ────────────────────────────────────────────── */}
      {isOpen && (
        <div className="archon-datepicker-popup">
          {/* Header: Month Navigation */}
          <div className="archon-datepicker-header">
            <button type="button" onClick={handlePrevMonth} className="archon-datepicker-nav">
              <ChevronLeft size={16} />
            </button>
            <span className="archon-datepicker-title">
              {MONTHS_ES[viewMonth]} {viewYear}
            </span>
            <button type="button" onClick={handleNextMonth} className="archon-datepicker-nav">
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Day Names */}
          <div className="archon-datepicker-grid">
            {DAYS_ES.map(
              (d: string): React.ReactElement => (
                <div key={d} className="archon-datepicker-dayname">
                  {d}
                </div>
              )
            )}
          </div>

          {/* Day Cells */}
          <div className="archon-datepicker-grid">
            {cells.map(
              (day: number | null, i: number): React.ReactElement => (
                <div key={i}>
                  {day !== null ? (
                    <button
                      type="button"
                      onClick={(): void => handleSelectDay(day)}
                      className={[
                        'archon-datepicker-day',
                        isSelectedDay(day) ? 'archon-datepicker-day--selected' : '',
                        isTodayDay(day) && !isSelectedDay(day)
                          ? 'archon-datepicker-day--today'
                          : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      {day}
                    </button>
                  ) : (
                    <div />
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
