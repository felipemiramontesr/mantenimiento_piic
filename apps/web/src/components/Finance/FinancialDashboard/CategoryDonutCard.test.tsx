import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CategoryDonutCard } from './CategoryDonutCard';
import { formatMXN } from './helpers';
import { CategoryBreakdown, FinanceCategory } from '../../../types/finance';

// Mock puente: react-apexcharts nunca invoca sus propios formatters en jsdom
// (no renderiza el chart real), asi que este stub invoca los formatters de
// options MANUALMENTE con distintas combinaciones de opts para ejercitar las
// ramas internas de buildDonutPlotOptions/buildDonutLabelFormatters sin
// exportarlas (siguen siendo helpers privados de CategoryDonutCard.tsx).
vi.mock('react-apexcharts', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default: ({ options, series }: { options: any; series: number[] }): React.ReactElement => {
    const donut = options.plotOptions?.pie?.donut;
    const dl = options.dataLabels;
    const tt = options.tooltip;
    const probe = {
      seriesCount: series.length,
      centerValue: donut?.labels?.value?.formatter?.('123.45'),
      centerTotal: donut?.labels?.total?.formatter?.(),
      labelNoOpts: dl?.formatter?.(0, undefined),
      labelIdx0: dl?.formatter?.(0, { seriesIndex: 0, dataPointIndex: 0, w: {} }),
      labelIdx1: dl?.formatter?.(0, { seriesIndex: 1, dataPointIndex: 0, w: {} }),
      labelOutOfRange: dl?.formatter?.(0, { seriesIndex: 99, dataPointIndex: 0, w: {} }),
      tooltipNoOpts: tt?.y?.formatter?.(0, undefined),
      tooltipIdx0: tt?.y?.formatter?.(0, { seriesIndex: 0, dataPointIndex: 0, w: {} }),
      tooltipOutOfRange: tt?.y?.formatter?.(0, { seriesIndex: 99, dataPointIndex: 0, w: {} }),
    };
    return <pre data-testid="apex-donut-mock">{JSON.stringify(probe)}</pre>;
  },
}));

const make = (category: FinanceCategory | 'UNKNOWN_CAT', amount: number): CategoryBreakdown =>
  ({ category, amount } as CategoryBreakdown);

const readProbe = (): Record<string, unknown> =>
  JSON.parse(screen.getByTestId('apex-donut-mock').textContent as string);

describe('CategoryDonutCard', () => {
  it('renders the empty state and no chart when byCategory is empty', () => {
    render(<CategoryDonutCard byCategory={[]} />);
    expect(screen.getByText('Sin egresos en este período')).toBeInTheDocument();
    expect(screen.queryByTestId('apex-donut-mock')).not.toBeInTheDocument();
  });

  it('builds donut options and legend for a mixed known/unknown/below-threshold breakdown', () => {
    const byCategory = [
      make('FUEL', 970), // conocida, slice grande -> realPct>4 true
      make('UNKNOWN_CAT', 20), // desconocida en CATEGORY_LABELS/COLORS -> fallback al valor crudo
      make('LEASE', 10), // conocida, 0<pct<MIN_VISUAL_PCT(2%) -> boost visual
    ];
    render(<CategoryDonutCard byCategory={byCategory} />);

    expect(screen.getByText('Combustible')).toBeInTheDocument();
    expect(screen.getByText('Arrendamiento')).toBeInTheDocument();
    expect(screen.getByText('UNKNOWN_CAT')).toBeInTheDocument();

    const probe = readProbe();
    expect(probe.seriesCount).toBe(3);
    expect(probe.centerTotal).toBe(formatMXN(1000));
    // seriesIndex 0 (FUEL, 97%) supera el umbral de 4% -> etiqueta visible
    expect(probe.labelIdx0).toBe('97.0%');
    // seriesIndex 1 (UNKNOWN_CAT, 2%) no supera 4% -> etiqueta oculta
    expect(probe.labelIdx1).toBe('');
    // sin opts -> fallback de seriesIndex a 0 (mismo resultado que idx0)
    expect(probe.labelNoOpts).toBe('97.0%');
    // seriesIndex fuera de rango -> byCategory[idx] es undefined -> amount cae a 0 -> realPct 0
    expect(probe.labelOutOfRange).toBe('');
    expect(probe.tooltipIdx0).toBe(`${formatMXN(970)} (97.00%)`);
    expect(probe.tooltipNoOpts).toBe(`${formatMXN(970)} (97.00%)`);
    expect(probe.tooltipOutOfRange).toBe(`${formatMXN(0)} (0.00%)`);
  });

  it('falls back donutTotal-dependent formatters and pct display to their zero branch when all amounts are 0', () => {
    const byCategory = [make('FUEL', 0), make('LEASE', 0)];
    render(<CategoryDonutCard byCategory={byCategory} />);

    // displaySeries.length>0 igual renderiza el chart aunque donutTotal sea 0
    expect(screen.getByTestId('apex-donut-mock')).toBeInTheDocument();
    expect(screen.getAllByText('0.0%')).toHaveLength(2);

    const probe = readProbe();
    expect(probe.centerTotal).toBe(formatMXN(0));
    expect(probe.labelIdx0).toBe('');
    expect(probe.tooltipIdx0).toBe(`${formatMXN(0)} (0%)`);
  });

  it('formats the donut center-slice value from a raw string amount', () => {
    const byCategory = [make('FUEL', 500), make('LEASE', 500)];
    render(<CategoryDonutCard byCategory={byCategory} />);
    const probe = readProbe();
    expect(probe.centerValue).toBe(formatMXN(123.45));
  });
});
