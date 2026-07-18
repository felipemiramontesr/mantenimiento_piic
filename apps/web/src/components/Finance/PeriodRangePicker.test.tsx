import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../../test/testUtils';
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
