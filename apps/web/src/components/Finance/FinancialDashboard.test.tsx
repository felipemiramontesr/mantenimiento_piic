import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../test/testUtils';
import FinancialDashboard from './FinancialDashboard';
import api from '../../api/client';
import { FinanceDashboardData, DateRange } from '../../types/finance';

/**
 * FC162 F2 — FinancialDashboard.tsx had zero test coverage — every consumer
 * (FinancialHealthModule.callbacks.test.tsx) mocks it out entirely. Covers
 * loading/error states, KPI card actions, empty-state branches for the
 * donut/area charts, and the top-units section.
 */

vi.mock('../../api/client', () => ({ default: { get: vi.fn(), post: vi.fn() } }));
vi.mock('react-apexcharts', () => ({ default: (): null => null }));
vi.mock('./PeriodRangePicker', () => ({
  default: (): React.ReactElement => <div>Period Picker</div>,
}));

const RANGE: DateRange = { from: '2026-01', to: '2026-06' };

const DASHBOARD_DATA: FinanceDashboardData = {
  from: '2026-01',
  to: '2026-06',
  kpis: {
    totalEgresos: 125000,
    totalLease: 50000,
    totalMaintenance: 35000,
    totalFuel: 25000,
    totalInsurance: 15000,
    totalTire: 0,
    totalFine: 0,
    totalRepair: 0,
    totalOther: 0,
    unitCount: 2,
    avgCostPerUnit: 62500,
  },
  byCategory: [
    { category: 'LEASE', amount: 50000 },
    { category: 'MAINTENANCE', amount: 35000 },
  ],
  byMonth: [
    { period: '2026-01', amount: 20000 },
    { period: '2026-06', amount: 25000 },
  ],
  topUnits: [{ unitId: 'ASM-001', amount: 80000 }],
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.post).mockImplementation(async (url: string) => {
    if (url === '/auth/refresh') throw new Error('no session');
    throw new Error(`unmocked: ${url}`);
  });
});

describe('FinancialDashboard', () => {
  it('fetches the dashboard for the given range and renders formatted KPI cards', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: { success: true, data: DASHBOARD_DATA } });
    render(
      <FinancialDashboard
        dateRange={RANGE}
        onDateRangeChange={vi.fn()}
        onNavigateToEgresos={vi.fn()}
      />
    );
    await waitFor(() =>
      expect(api.get).toHaveBeenCalledWith('/finance/dashboard?from=2026-01&to=2026-06')
    );
    expect(await screen.findByText('Total egresos')).toBeInTheDocument();
    expect(screen.getByText('$125,000')).toBeInTheDocument();
  });

  it('shows an error card when the fetch fails', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('network down'));
    render(
      <FinancialDashboard
        dateRange={RANGE}
        onDateRangeChange={vi.fn()}
        onNavigateToEgresos={vi.fn()}
      />
    );
    expect(
      await screen.findByText('No se pudieron cargar los datos financieros.')
    ).toBeInTheDocument();
  });

  it('clicking a category KPI action navigates with that category', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: { success: true, data: DASHBOARD_DATA } });
    const onNavigateToEgresos = vi.fn();
    render(
      <FinancialDashboard
        dateRange={RANGE}
        onDateRangeChange={vi.fn()}
        onNavigateToEgresos={onNavigateToEgresos}
      />
    );
    fireEvent.click(await screen.findByText('Ver mantenimientos'));
    expect(onNavigateToEgresos).toHaveBeenCalledWith('MAINTENANCE');
  });

  it('clicking the totals KPI action navigates without a category filter', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: { success: true, data: DASHBOARD_DATA } });
    const onNavigateToEgresos = vi.fn();
    render(
      <FinancialDashboard
        dateRange={RANGE}
        onDateRangeChange={vi.fn()}
        onNavigateToEgresos={onNavigateToEgresos}
      />
    );
    fireEvent.click(await screen.findByText('Ver todos los egresos'));
    expect(onNavigateToEgresos).toHaveBeenCalledWith();
  });

  it('shows the empty-category message when byCategory is empty', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: { success: true, data: { ...DASHBOARD_DATA, byCategory: [] } },
    });
    render(
      <FinancialDashboard
        dateRange={RANGE}
        onDateRangeChange={vi.fn()}
        onNavigateToEgresos={vi.fn()}
      />
    );
    expect(await screen.findByText('Sin egresos en este período')).toBeInTheDocument();
  });

  it('shows the empty-history message when byMonth is empty', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: { success: true, data: { ...DASHBOARD_DATA, byMonth: [] } },
    });
    render(
      <FinancialDashboard
        dateRange={RANGE}
        onDateRangeChange={vi.fn()}
        onNavigateToEgresos={vi.fn()}
      />
    );
    expect(await screen.findByText('Sin historial disponible')).toBeInTheDocument();
  });

  it('switching the chart window updates the trend label', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: { success: true, data: DASHBOARD_DATA } });
    render(
      <FinancialDashboard
        dateRange={RANGE}
        onDateRangeChange={vi.fn()}
        onNavigateToEgresos={vi.fn()}
      />
    );
    await screen.findByText('Tendencia — Últimos 6M');
    fireEvent.click(screen.getByText('12M'));
    expect(await screen.findByText('Tendencia — Últimos 12M')).toBeInTheDocument();
  });

  it('renders the top-units section when topUnits is non-empty, hides it when empty', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: { success: true, data: DASHBOARD_DATA } });
    const { rerender } = render(
      <FinancialDashboard
        dateRange={RANGE}
        onDateRangeChange={vi.fn()}
        onNavigateToEgresos={vi.fn()}
      />
    );
    expect(await screen.findByText(/Top 5 unidades por costo/)).toBeInTheDocument();

    vi.mocked(api.get).mockResolvedValueOnce({
      data: { success: true, data: { ...DASHBOARD_DATA, topUnits: [] } },
    });
    rerender(
      <FinancialDashboard
        dateRange={{ from: '2026-02', to: '2026-07' }}
        onDateRangeChange={vi.fn()}
        onNavigateToEgresos={vi.fn()}
      />
    );
    await waitFor(() =>
      expect(screen.queryByText(/Top 5 unidades por costo/)).not.toBeInTheDocument()
    );
  });

  it('re-fetches when the dateRange prop changes', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, data: DASHBOARD_DATA } });
    const { rerender } = render(
      <FinancialDashboard
        dateRange={RANGE}
        onDateRangeChange={vi.fn()}
        onNavigateToEgresos={vi.fn()}
      />
    );
    await waitFor(() =>
      expect(api.get).toHaveBeenCalledWith('/finance/dashboard?from=2026-01&to=2026-06')
    );
    rerender(
      <FinancialDashboard
        dateRange={{ from: '2026-02', to: '2026-07' }}
        onDateRangeChange={vi.fn()}
        onNavigateToEgresos={vi.fn()}
      />
    );
    await waitFor(() =>
      expect(api.get).toHaveBeenCalledWith('/finance/dashboard?from=2026-02&to=2026-07')
    );
  });
});
