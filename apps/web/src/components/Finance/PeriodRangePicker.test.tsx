import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, within } from '../../test/testUtils';
import PeriodRangePicker from './PeriodRangePicker';

/**
 * FC 078 F3 (P1-3) — el picker de rango se recortaba/solapaba a 360px por
 * vivir en media columna de un grid fijo de 2. Estos tests fijan el contrato
 * responsive: 1 columna <md, 2 columnas md+ (el widget nunca vuelve a caber
 * en 170px).
 */

const VALUE = { from: '2026-07-01', to: '2026-07-31' };

describe('PeriodRangePicker (FC 078 F3 — P1-3 responsive)', () => {
  it('AT-FC078-F3-PK-1: la fila del trigger apila a 1 columna <md', () => {
    render(<PeriodRangePicker value={VALUE} onChange={vi.fn()} />);
    const row = screen.getByTestId('period-picker-trigger-row');
    expect(row.className).toContain('grid-cols-1');
    expect(row.className).toContain('md:grid-cols-2');
  });

  it('AT-FC078-F3-PK-2: los paneles de calendario apilan a 1 columna <md al abrir', () => {
    render(<PeriodRangePicker value={VALUE} onChange={vi.fn()} />);
    fireEvent.click(screen.getByText(/1 de julio de 2026/));
    const panels = screen.getByTestId('period-picker-panels');
    expect(panels.className).toContain('grid-cols-1');
    expect(panels.className).toContain('md:grid-cols-2');
    expect(screen.getByText('Desde')).toBeInTheDocument();
    expect(screen.getByText('Hasta')).toBeInTheDocument();
  });

  it('aplica el rango seleccionado vía onChange (comportamiento intacto)', () => {
    const onChange = vi.fn();
    render(<PeriodRangePicker value={VALUE} onChange={onChange} />);
    fireEvent.click(screen.getByText(/1 de julio de 2026/));
    fireEvent.click(screen.getByText('Aplicar Rango'));
    expect(onChange).toHaveBeenCalledWith({ from: '2026-07-01', to: '2026-07-31' });
  });
});

// ── R4-C Fc162 — Sonar unc lines 56-57,95-96,98,163,220-221,225-226,235-236,296-297,310-311 ──
describe('PeriodRangePicker (R4-C — getDayCls branches, day selection, error, month nav)', () => {
  const openPicker = (): void => {
    fireEvent.click(within(screen.getByTestId('period-picker-trigger-row')).getByRole('button'));
  };

  const panelOf = (title: 'Desde' | 'Hasta'): HTMLElement =>
    screen.getByText(title).parentElement as HTMLElement;

  afterEach(() => {
    vi.useRealTimers();
  });

  it('AT-PRP-DAYCLS-1: día "hoy" muestra el anillo distintivo y un día fuera de rango usa el estilo por defecto', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-05T12:00:00.000Z'));

    render(
      <PeriodRangePicker value={{ from: '2026-07-10', to: '2026-07-20' }} onChange={vi.fn()} />
    );
    openPicker();

    const desde = panelOf('Desde');
    const todayCell = within(desde).getByText('5');
    expect(todayCell.className).toContain('ring-yellow-400');

    const plainCell = within(desde).getByText('3');
    expect(plainCell.className).toContain('hover:bg-slate-100');
    expect(plainCell.className).not.toContain('ring-yellow-400');
  });

  it('AT-PRP-DAYSEL-1: clic en un día del panel "Desde" invoca handleFromSelect y actualiza la fecha mostrada', () => {
    render(
      <PeriodRangePicker value={{ from: '2026-07-10', to: '2026-07-20' }} onChange={vi.fn()} />
    );
    openPicker();

    fireEvent.click(within(panelOf('Desde')).getByText('12'));
    expect(within(panelOf('Desde')).getByText(/12 de julio de 2026/)).toBeInTheDocument();
  });

  it('AT-PRP-DAYSEL-2: clic en un día del panel "Hasta" invoca handleToSelect y actualiza la fecha mostrada', () => {
    render(
      <PeriodRangePicker value={{ from: '2026-07-10', to: '2026-07-20' }} onChange={vi.fn()} />
    );
    openPicker();

    fireEvent.click(within(panelOf('Hasta')).getByText('18'));
    expect(within(panelOf('Hasta')).getByText(/18 de julio de 2026/)).toBeInTheDocument();
  });

  it('AT-PRP-ERR-1: si la fecha "Desde" queda después de "Hasta", muestra el error y no llama onChange', () => {
    const onChange = vi.fn();
    render(
      <PeriodRangePicker value={{ from: '2026-07-05', to: '2026-07-10' }} onChange={onChange} />
    );
    openPicker();

    fireEvent.click(within(panelOf('Desde')).getByText('20'));
    fireEvent.click(screen.getByText('Aplicar Rango'));

    expect(
      screen.getByText('La fecha de inicio debe ser anterior o igual a la fecha de fin.')
    ).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('AT-PRP-NAV-1: los botones Mes anterior/Mes siguiente de ambos paneles navegan el mes visible', () => {
    render(
      <PeriodRangePicker value={{ from: '2026-06-15', to: '2026-08-15' }} onChange={vi.fn()} />
    );
    openPicker();

    const desde = panelOf('Desde');
    const hasta = panelOf('Hasta');

    expect(within(desde).getByText('Junio 2026')).toBeInTheDocument();
    expect(within(hasta).getByText('Agosto 2026')).toBeInTheDocument();

    fireEvent.click(within(desde).getByTitle('Mes anterior'));
    expect(within(desde).getByText('Mayo 2026')).toBeInTheDocument();

    fireEvent.click(within(desde).getByTitle('Mes siguiente'));
    expect(within(desde).getByText('Junio 2026')).toBeInTheDocument();

    fireEvent.click(within(hasta).getByTitle('Mes anterior'));
    expect(within(hasta).getByText('Julio 2026')).toBeInTheDocument();

    fireEvent.click(within(hasta).getByTitle('Mes siguiente'));
    expect(within(hasta).getByText('Agosto 2026')).toBeInTheDocument();
  });
});

// ── FC164 F1 — parseYMFromDate NaN fix (rango vacío no crashea) ──
describe('PeriodRangePicker (FC164 F1 — parseYMFromDate empty/invalid fallback)', () => {
  const openPicker = (): void => {
    fireEvent.click(within(screen.getByTestId('period-picker-trigger-row')).getByRole('button'));
  };

  afterEach(() => {
    vi.useRealTimers();
  });

  it('FC164-R1-1: value={from:"",to:""} abre sin crashear y muestra el mes actual en ambos paneles', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-15T12:00:00.000Z'));

    render(<PeriodRangePicker value={{ from: '', to: '' }} onChange={vi.fn()} />);

    expect(() => openPicker()).not.toThrow();
    expect(screen.getByText('Desde')).toBeInTheDocument();
    expect(screen.getByText('Hasta')).toBeInTheDocument();
    expect(screen.getAllByText('Septiembre 2026').length).toBe(2);
  });

  it('FC164-R1-3: aplicar sin seleccionar fecha (tras abrir con rango vacío) muestra el error de campos requeridos', () => {
    const onChange = vi.fn();
    render(<PeriodRangePicker value={{ from: '', to: '' }} onChange={onChange} />);

    openPicker();
    fireEvent.click(screen.getByText('Aplicar Rango'));

    expect(screen.getByText('Selecciona una fecha de inicio y fin.')).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('R4-C Fc165 F2 2.2C: clicking the trigger again while open closes it without resetting the draft', () => {
    render(<PeriodRangePicker value={{ from: '', to: '' }} onChange={vi.fn()} />);
    openPicker();
    expect(screen.getByText('Desde')).toBeInTheDocument();

    // Toggling closed (isOpen was already true) takes the `if(!isOpen)` false
    // branch — the draft-reset call is skipped, not that its effect is
    // observable here, but the panel must actually close without crashing.
    openPicker();
    expect(screen.queryByText('Desde')).not.toBeInTheDocument();
  });

  it('FC164-R1-2: rango previamente aplicado sigue mostrando su propio mes (regresión)', () => {
    render(
      <PeriodRangePicker value={{ from: '2026-05-01', to: '2026-05-31' }} onChange={vi.fn()} />
    );

    openPicker();

    expect(screen.getAllByText('Mayo 2026').length).toBe(2);
  });
});
