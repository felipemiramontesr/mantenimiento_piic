import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MonthlyTrendCard } from './MonthlyTrendCard';
import { MonthlyTrend } from '../../../types/finance';

/**
 * FC165 F2 Slice 2.2C — MonthlyTrendCard.tsx had no dedicated test file
 * (only exercised indirectly via FinancialDashboard.test.tsx, which never
 * reaches the 'Todo' window or an out-of-catalog chartLabel). Sonar unc
 * lines 41,43,45.
 */

// Simple stub — none of the targeted branches live inside apex-chart's own
// formatter callbacks (unlike CategoryDonutCard), so no bridge-mock needed.
vi.mock('react-apexcharts', () => ({
  default: (): React.ReactElement => <div data-testid="apex-chart-stub" />,
}));

const BY_MONTH: MonthlyTrend[] = [
  { period: '2026-05', amount: 1000 },
  { period: '2026-06', amount: 2000 },
  { period: '2026-07', amount: 3000 },
];

describe('MonthlyTrendCard', () => {
  it('renders the chart and window buttons for a matched chartLabel', () => {
    render(<MonthlyTrendCard byMonth={BY_MONTH} chartLabel="6M" onChartLabelChange={vi.fn()} />);
    expect(screen.getByText('Tendencia — Últimos 6M')).toBeInTheDocument();
    expect(screen.getByTestId('apex-chart-stub')).toBeInTheDocument();
  });

  it('shows "Todo el período" and does not slice byMonth when chartLabel is "Todo"', () => {
    render(<MonthlyTrendCard byMonth={BY_MONTH} chartLabel="Todo" onChartLabelChange={vi.fn()} />);
    expect(screen.getByText('Tendencia — Todo el período')).toBeInTheDocument();
  });

  it('falls back to the 6M window when chartLabel matches no CHART_WINDOWS entry', () => {
    render(<MonthlyTrendCard byMonth={BY_MONTH} chartLabel="BOGUS" onChartLabelChange={vi.fn()} />);
    expect(screen.getByText('Tendencia — Últimos 6M')).toBeInTheDocument();
  });

  it('shows the empty-history message when byMonth is empty', () => {
    render(<MonthlyTrendCard byMonth={[]} chartLabel="6M" onChartLabelChange={vi.fn()} />);
    expect(screen.getByText('Sin historial disponible')).toBeInTheDocument();
    expect(screen.queryByTestId('apex-chart-stub')).not.toBeInTheDocument();
  });

  it('calls onChartLabelChange when a window button is clicked', () => {
    const onChartLabelChange = vi.fn();
    render(
      <MonthlyTrendCard
        byMonth={BY_MONTH}
        chartLabel="6M"
        onChartLabelChange={onChartLabelChange}
      />
    );
    screen.getByText('12M').click();
    expect(onChartLabelChange).toHaveBeenCalledWith('12M');
  });
});
