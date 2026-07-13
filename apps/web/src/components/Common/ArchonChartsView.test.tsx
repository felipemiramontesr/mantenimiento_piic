import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ArchonChartsView, { ARCHON_CHART_PALETTE, toApexType } from './ArchonChartsView';
import type { ArchonChartConfig } from './ArchonChartsView';

/**
 * 🔱 FC 041 Fase D — Vista_Graficos_Analiticos
 * Reutiliza apexcharts existente (cond.2 Bravo — cero dependencias nuevas).
 * El mock captura props para verificar tipo, paleta §13.3 y series.
 */

interface CapturedChart {
  type?: string;
  options: Record<string, unknown>;
  series: unknown;
}

const captured: CapturedChart[] = [];

vi.mock('react-apexcharts', () => ({
  default: (props: CapturedChart): React.ReactElement => {
    captured.push(props);
    return <div data-testid="apex-chart-stub" />;
  },
}));

const CHARTS: ArchonChartConfig[] = [
  {
    id: 'trend',
    title: 'Tendencia de Costos',
    kind: 'LINE',
    series: [{ name: 'Costo', data: [10, 20, 30] }],
    categories: ['Ene', 'Feb', 'Mar'],
  },
  {
    id: 'status',
    title: 'Estatus de Flota',
    kind: 'DONUT',
    series: [5, 3, 2],
    labels: ['Activo', 'Taller', 'Baja'],
  },
  {
    id: 'compare',
    title: 'Comparativa por Depto',
    kind: 'BAR',
    series: [{ name: 'Unidades', data: [4, 6] }],
    categories: ['MINA', 'AGENCIA'],
  },
];

describe('toApexType (dominio cerrado)', () => {
  it('maps the three chart kinds to apex types', () => {
    expect(toApexType('LINE')).toBe('line');
    expect(toApexType('DONUT')).toBe('donut');
    expect(toApexType('BAR')).toBe('bar');
  });
});

describe('ArchonChartsView (FC 041 Fase D)', () => {
  it('renders one titled card per chart config', () => {
    captured.length = 0;
    render(<ArchonChartsView charts={CHARTS} />);
    expect(screen.getByText('Tendencia de Costos')).toBeInTheDocument();
    expect(screen.getByText('Estatus de Flota')).toBeInTheDocument();
    expect(screen.getByText('Comparativa por Depto')).toBeInTheDocument();
    expect(screen.getAllByTestId('apex-chart-stub')).toHaveLength(3);
  });

  it('passes the Archon palette (§13.3) to every chart', () => {
    captured.length = 0;
    render(<ArchonChartsView charts={CHARTS} />);
    captured.forEach((chart) => {
      expect(chart.options.colors).toEqual(ARCHON_CHART_PALETTE);
    });
  });

  it('maps kinds to apex chart types and forwards series', () => {
    captured.length = 0;
    render(<ArchonChartsView charts={CHARTS} />);
    expect(captured[0].type).toBe('line');
    expect(captured[1].type).toBe('donut');
    expect(captured[2].type).toBe('bar');
    expect(captured[1].series).toEqual([5, 3, 2]);
  });

  it('forwards donut labels and axis categories', () => {
    captured.length = 0;
    render(<ArchonChartsView charts={CHARTS} />);
    expect(captured[1].options.labels).toEqual(['Activo', 'Taller', 'Baja']);
    expect((captured[0].options.xaxis as { categories: string[] }).categories).toEqual([
      'Ene',
      'Feb',
      'Mar',
    ]);
  });

  it('shows the es-MX empty state when no charts are provided', () => {
    render(<ArchonChartsView charts={[]} />);
    expect(screen.getByText('SIN DATOS PARA GRAFICAR')).toBeInTheDocument();
  });
});
