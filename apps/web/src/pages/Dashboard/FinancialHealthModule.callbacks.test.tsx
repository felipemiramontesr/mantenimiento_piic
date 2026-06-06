import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../test/testUtils';
import FinancialHealthModule from './FinancialHealthModule';
import type { DateRange, FinanceCategory } from '../../types/finance';

vi.mock('react-apexcharts', () => ({ default: (): null => null }));

let capturedOnDateRangeChange: ((r: DateRange) => void) | undefined;
let capturedOnNavigateToEgresos: ((c?: FinanceCategory) => void) | undefined;

vi.mock('../../components/Finance/FinancialDashboard', () => ({
  default: (props: {
    onDateRangeChange: (r: DateRange) => void;
    onNavigateToEgresos: (c?: FinanceCategory) => void;
  }): React.JSX.Element => {
    capturedOnDateRangeChange = props.onDateRangeChange;
    capturedOnNavigateToEgresos = props.onNavigateToEgresos;
    return <div data-testid="financial-dashboard-mock">Dashboard</div>;
  },
}));

vi.mock('../../components/Finance/EgressTable', () => ({
  default: (): React.JSX.Element => <div data-testid="egress-table-mock">Egresos</div>,
}));

describe('FinancialHealthModule — callback coverage', () => {
  beforeEach(() => {
    localStorage.clear();
    capturedOnDateRangeChange = undefined;
    capturedOnNavigateToEgresos = undefined;
  });

  it('onDateRangeChange calls saveDateRange and persists to localStorage', async () => {
    render(<FinancialHealthModule />);
    await waitFor(() => expect(screen.getByTestId('financial-dashboard-mock')).toBeInTheDocument());

    const range: DateRange = { from: '2026-01-01', to: '2026-06-01' };
    capturedOnDateRangeChange!(range);

    const stored = JSON.parse(localStorage.getItem('archon_finance_date_range') ?? 'null');
    expect(stored).toEqual(range);
  });

  it('saveDateRange catch branch — silently ignores localStorage quota errors', async () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce((): void => {
      throw new Error('QuotaExceededError');
    });

    render(<FinancialHealthModule />);
    await waitFor(() => expect(screen.getByTestId('financial-dashboard-mock')).toBeInTheDocument());

    expect(() => {
      capturedOnDateRangeChange!({ from: '2026-01-01', to: '2026-06-01' });
    }).not.toThrow();

    setItemSpy.mockRestore();
  });

  it('onNavigateToEgresos with category switches panel to EGRESOS', async () => {
    render(<FinancialHealthModule />);
    await waitFor(() => expect(screen.getByTestId('financial-dashboard-mock')).toBeInTheDocument());

    capturedOnNavigateToEgresos!('FUEL' as FinanceCategory);

    await waitFor(() => expect(screen.getByTestId('egress-table-mock')).toBeInTheDocument());
  });

  it('onNavigateToEgresos without category switches panel to EGRESOS with empty category', async () => {
    render(<FinancialHealthModule />);
    await waitFor(() => expect(screen.getByTestId('financial-dashboard-mock')).toBeInTheDocument());

    capturedOnNavigateToEgresos!();

    await waitFor(() => expect(screen.getByTestId('egress-table-mock')).toBeInTheDocument());
  });
});
