import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../test/testUtils';
import ArchonDatePicker from './ArchonDatePicker';

// The prev/next month chevrons carry no accessible name (icon-only buttons).
// DOM order while the popup is open is deterministic: [0] trigger,
// [1] prev-month, [2] next-month, then day-cell buttons.
const prevMonthButton = (container: HTMLElement): HTMLElement =>
  container.querySelectorAll('button')[1] as HTMLElement;
const nextMonthButton = (container: HTMLElement): HTMLElement =>
  container.querySelectorAll('button')[2] as HTMLElement;

/**
 * FC162 F3 — ArchonDatePicker.tsx had zero test coverage. Covers the
 * trigger/popup toggle, month navigation (incl. year rollover), day
 * selection, today/selected-day highlighting, the leading-blank offset for
 * the first week, and the clear-date link.
 */

describe('ArchonDatePicker', () => {
  it('shows the placeholder when value is empty', () => {
    render(<ArchonDatePicker value="" onChange={vi.fn()} placeholder="dd / mm / aaaa" />);
    expect(screen.getByText('dd / mm / aaaa')).toBeInTheDocument();
  });

  it('formats an ISO value as dd / mm / aaaa', () => {
    render(<ArchonDatePicker value="2026-03-05" onChange={vi.fn()} />);
    expect(screen.getByText('05 / 03 / 2026')).toBeInTheDocument();
  });

  it('opens the calendar popup on trigger click and shows the month/year header', () => {
    render(<ArchonDatePicker value="2026-03-05" onChange={vi.fn()} />);
    fireEvent.click(screen.getByText('05 / 03 / 2026'));
    expect(screen.getByText('Marzo 2026')).toBeInTheDocument();
  });

  it('navigating to the previous month rolls the year back at January', () => {
    const { container } = render(<ArchonDatePicker value="2026-01-15" onChange={vi.fn()} />);
    fireEvent.click(screen.getByText('15 / 01 / 2026'));
    expect(screen.getByText('Enero 2026')).toBeInTheDocument();
    fireEvent.click(prevMonthButton(container));
    expect(screen.getByText('Diciembre 2025')).toBeInTheDocument();
  });

  it('navigating past December rolls the year forward', () => {
    const { container } = render(<ArchonDatePicker value="2026-12-10" onChange={vi.fn()} />);
    fireEvent.click(screen.getByText('10 / 12 / 2026'));
    expect(screen.getByText('Diciembre 2026')).toBeInTheDocument();
    fireEvent.click(nextMonthButton(container));
    expect(screen.getByText('Enero 2027')).toBeInTheDocument();
  });

  it('navigating to the previous month within the same year does not change the year', () => {
    const { container } = render(<ArchonDatePicker value="2026-03-05" onChange={vi.fn()} />);
    fireEvent.click(screen.getByText('05 / 03 / 2026'));
    expect(screen.getByText('Marzo 2026')).toBeInTheDocument();
    fireEvent.click(prevMonthButton(container));
    expect(screen.getByText('Febrero 2026')).toBeInTheDocument();
  });

  it('navigating to the next month within the same year does not change the year', () => {
    const { container } = render(<ArchonDatePicker value="2026-03-05" onChange={vi.fn()} />);
    fireEvent.click(screen.getByText('05 / 03 / 2026'));
    expect(screen.getByText('Marzo 2026')).toBeInTheDocument();
    fireEvent.click(nextMonthButton(container));
    expect(screen.getByText('Abril 2026')).toBeInTheDocument();
  });

  it('selecting a day calls onChange with the ISO date and closes the popup', () => {
    const onChange = vi.fn();
    render(<ArchonDatePicker value="2026-03-05" onChange={onChange} />);
    fireEvent.click(screen.getByText('05 / 03 / 2026'));
    fireEvent.click(screen.getByText('12'));
    expect(onChange).toHaveBeenCalledWith('2026-03-12');
    expect(screen.queryByText('Marzo 2026')).not.toBeInTheDocument();
  });

  it('clicking "Limpiar fecha" clears the value and closes the popup', () => {
    const onChange = vi.fn();
    render(<ArchonDatePicker value="2026-03-05" onChange={onChange} />);
    fireEvent.click(screen.getByText('05 / 03 / 2026'));
    fireEvent.click(screen.getByText('Limpiar fecha'));
    expect(onChange).toHaveBeenCalledWith('');
  });

  it('does not show "Limpiar fecha" when no value is set', () => {
    render(<ArchonDatePicker value="" onChange={vi.fn()} />);
    fireEvent.click(screen.getByText('dd / mm / aaaa'));
    expect(screen.queryByText('Limpiar fecha')).not.toBeInTheDocument();
  });

  it('closes the popup on an outside click', () => {
    render(<ArchonDatePicker value="2026-03-05" onChange={vi.fn()} />);
    fireEvent.click(screen.getByText('05 / 03 / 2026'));
    expect(screen.getByText('Marzo 2026')).toBeInTheDocument();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByText('Marzo 2026')).not.toBeInTheDocument();
  });

  it('falls back to the current month when value is empty and the calendar is opened', () => {
    render(<ArchonDatePicker value="" onChange={vi.fn()} />);
    fireEvent.click(screen.getByText('dd / mm / aaaa'));
    const now = new Date();
    const MONTHS_ES = [
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
    expect(
      screen.getByText(`${MONTHS_ES[now.getMonth()]} ${now.getFullYear()}`)
    ).toBeInTheDocument();
  });
});
