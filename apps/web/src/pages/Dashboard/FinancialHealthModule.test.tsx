import { describe, it, expect, vi, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { render, screen, fireEvent, waitFor } from '../../test/testUtils';
import server from '../../test/server';
import FinancialHealthModule from './FinancialHealthModule';

// ApexCharts no renderiza SVG en JSDOM; se sustituye por un noop.
vi.mock('react-apexcharts', () => ({ default: (): null => null }));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const DASHBOARD_FIXTURE = {
  from: '2026-01-01',
  to: '2026-06-01',
  kpis: {
    totalEgresos: 500000,
    totalLease: 100000,
    totalMaintenance: 150000,
    totalFuel: 80000,
    totalInsurance: 70000,
    totalTire: 30000,
    totalFine: 10000,
    totalRepair: 50000,
    totalOther: 10000,
    unitCount: 23,
    avgCostPerUnit: 21739,
  },
  byCategory: [
    { category: 'MAINTENANCE', amount: 150000 },
    { category: 'LEASE', amount: 100000 },
    { category: 'FUEL', amount: 80000 },
    { category: 'INSURANCE', amount: 70000 },
    { category: 'REPAIR', amount: 50000 },
    { category: 'TIRE', amount: 30000 },
    { category: 'OTHER', amount: 10000 },
    { category: 'FINE', amount: 10000 },
  ],
  byMonth: [
    { period: '2026-01', amount: 85000 },
    { period: '2026-02', amount: 90000 },
    { period: '2026-03', amount: 82000 },
    { period: '2026-04', amount: 88000 },
    { period: '2026-05', amount: 95000 },
    { period: '2026-06', amount: 60000 },
  ],
  topUnits: [
    { unitId: 1, unitName: 'ASM-001', amount: 45000 },
    { unitId: 2, unitName: 'ASM-002', amount: 38000 },
  ],
};

const TRANSACTIONS_RESPONSE = {
  success: true,
  data: [],
  meta: { nextCursor: null, total: 0 },
};

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('FinancialHealthModule (Sovereign Finance)', () => {
  beforeEach((): void => {
    server.use(
      http.get('*/finance/dashboard', () =>
        HttpResponse.json({ success: true, data: DASHBOARD_FIXTURE })
      ),
      http.get('*/finance/transactions', () => HttpResponse.json(TRANSACTIONS_RESPONSE))
    );
  });

  const renderModule = (): void => {
    render(<FinancialHealthModule />);
  };

  it('renders KPI cards when dashboard data loads successfully', async (): Promise<void> => {
    renderModule();
    // 'Total egresos' aparece una sola vez (KPI card)
    expect(await screen.findByText('Total egresos')).toBeInTheDocument();
    // 'Mantenimiento' aparece en KPI card + leyenda del donut
    expect(screen.getAllByText('Mantenimiento').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Combustible').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Seguro').length).toBeGreaterThanOrEqual(1);
  });

  it('transitions between DASHBOARD and EGRESOS panels', async (): Promise<void> => {
    renderModule();

    const verEgresosBtn = await screen.findByRole('button', { name: /ver egresos/i });
    expect(verEgresosBtn).toBeInTheDocument();

    fireEvent.click(verEgresosBtn);

    await waitFor((): void => {
      expect(screen.getByRole('button', { name: /ver dashboard/i })).toBeInTheDocument();
    });
  });

  it('sets correct layout section metadata', async (): Promise<void> => {
    renderModule();

    expect(await screen.findByTestId('layout-title')).toHaveTextContent('Finanzas');
    expect(screen.getByTestId('layout-description')).toHaveTextContent(
      'Control de Egresos y Salud Financiera de la Flotilla'
    );
    expect(screen.getByText('Dashboard Financiero')).toBeInTheDocument();
  });
});
