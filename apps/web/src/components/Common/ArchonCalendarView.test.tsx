import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ArchonCalendarView, { buildMonthMatrix } from './ArchonCalendarView';

/**
 * 🔱 FC 041 Fase C — Vista_Calendario_Temporal
 * Cuadrícula mensual nativa (sin dependencias nuevas), eventos por fecha,
 * navegación de mes, dominio-seguro ante fechas nulas/corruptas (lección FC 071).
 */

interface Job {
  id: number;
  title: string;
  date: string | null;
}

const JOBS: Job[] = [
  { id: 1, title: 'Servicio PIIC-101', date: '2026-07-15' },
  { id: 2, title: 'Servicio PIIC-201', date: '2026-07-15' },
  { id: 3, title: 'Servicio PIIC-301', date: '2026-07-28' },
  { id: 4, title: 'Sin fecha', date: null },
  { id: 5, title: 'Fecha corrupta', date: 'MEDIUM' },
];

const renderCalendar = (props?: { onEventClick?: (item: Job) => void }): void => {
  render(
    <ArchonCalendarView<Job>
      items={JOBS}
      keyExtractor={(j): number => j.id}
      dateExtractor={(j): string | null => j.date}
      renderEvent={(j): React.ReactNode => <span>{j.title}</span>}
      onEventClick={props?.onEventClick}
      initialMonth="2026-07"
    />
  );
};

describe('buildMonthMatrix (helper puro)', () => {
  it('produces 42 cells (6 weeks) with the month days flagged', () => {
    const matrix = buildMonthMatrix(2026, 7);
    expect(matrix).toHaveLength(42);
    expect(matrix.filter((c) => c.inMonth)).toHaveLength(31);
    expect(matrix.find((c) => c.iso === '2026-07-01')?.inMonth).toBe(true);
    expect(matrix.find((c) => c.iso === '2026-07-31')?.inMonth).toBe(true);
  });

  it('aligns July 1st 2026 to Wednesday (lunes-primera columna)', () => {
    const matrix = buildMonthMatrix(2026, 7);
    const firstOfMonthIndex = matrix.findIndex((c) => c.iso === '2026-07-01');
    expect(firstOfMonthIndex).toBe(2); // Lu Ma [Mi] — 2026-07-01 es miércoles
  });
});

describe('ArchonCalendarView (FC 041 Fase C)', () => {
  it('renders the month title in es-MX with year', () => {
    renderCalendar();
    expect(screen.getByTestId('calendar-title').textContent?.toLowerCase()).toContain('julio');
    expect(screen.getByTestId('calendar-title').textContent).toContain('2026');
  });

  it('renders 7 weekday headers', () => {
    renderCalendar();
    expect(screen.getAllByTestId('calendar-weekday')).toHaveLength(7);
  });

  it('places events on their day cell, stacking same-day events', () => {
    renderCalendar();
    const day15 = screen.getByTestId('calendar-day-2026-07-15');
    expect(day15.textContent).toContain('Servicio PIIC-101');
    expect(day15.textContent).toContain('Servicio PIIC-201');
    const day28 = screen.getByTestId('calendar-day-2026-07-28');
    expect(day28.textContent).toContain('Servicio PIIC-301');
  });

  it('ignores items with null or out-of-domain dates without crashing', () => {
    renderCalendar();
    expect(screen.queryByText('Sin fecha')).not.toBeInTheDocument();
    expect(screen.queryByText('Fecha corrupta')).not.toBeInTheDocument();
  });

  it('fires onEventClick with the clicked item (button real)', () => {
    const onEventClick = vi.fn();
    renderCalendar({ onEventClick });
    const chip = screen.getByText('Servicio PIIC-301').closest('button');
    expect(chip).not.toBeNull();
    fireEvent.click(chip as HTMLElement);
    expect(onEventClick).toHaveBeenCalledWith(JOBS[2]);
  });

  it('renders event chips as non-buttons when no handler is provided', () => {
    renderCalendar();
    expect(screen.getByText('Servicio PIIC-301').closest('button')).toBeNull();
  });

  it('navigates to previous and next month updating the title', () => {
    renderCalendar();
    fireEvent.click(screen.getByTestId('calendar-prev'));
    expect(screen.getByTestId('calendar-title').textContent?.toLowerCase()).toContain('junio');
    fireEvent.click(screen.getByTestId('calendar-next'));
    fireEvent.click(screen.getByTestId('calendar-next'));
    expect(screen.getByTestId('calendar-title').textContent?.toLowerCase()).toContain('agosto');
  });

  it('events outside the visible month are not rendered', () => {
    renderCalendar();
    fireEvent.click(screen.getByTestId('calendar-next')); // agosto
    expect(screen.queryByText('Servicio PIIC-101')).not.toBeInTheDocument();
  });
});
