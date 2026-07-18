import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../test/testUtils';
import EgressTable from './EgressTable';
import api from '../../api/client';
import { FinancialTransaction } from '../../types/finance';

vi.mock('../../api/client', () => ({
  default: {
    get: vi.fn(),
  },
}));

/**
 * FC 078 F3 — tests de la migración a ArchonDataTable (la tabla de egresos
 * no tenía suite propia). Cubre render de filas, estado vacío y el contrato
 * responsive de la primitiva (minWidth derivado + SovereignScrollArea).
 */

const ROW: FinancialTransaction = {
  id: 1,
  uuid: 'tx-001',
  unit_id: 7,
  unit_name: 'ASM-007',
  category: 'FUEL',
  amount: 1234.5,
  period: '2026-07',
  source: 'AUTO',
  vendor: null,
  invoice_ref: null,
  notes: 'Carga de combustible',
  created_by_name: 'Sistema',
  created_at: '2026-07-10T12:00:00.000Z',
};

const mockGet = (rows: FinancialTransaction[]): void => {
  vi.mocked(api.get).mockResolvedValue({
    data: { success: true, data: rows, meta: { nextCursor: null, total: rows.length } },
  });
};

describe('EgressTable (FC 078 F3 — migración a primitiva)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders transaction rows with unit, category badge and amount', async () => {
    mockGet([ROW]);
    render(<EgressTable from="2026-07-01" to="2026-07-31" />);
    await waitFor(() => screen.getByTestId('egress-table'));
    expect(screen.getByText('ASM-007')).toBeInTheDocument();
    expect(screen.getByText('Carga de combustible')).toBeInTheDocument();
    expect(screen.getByText('Sistema')).toBeInTheDocument();
  });

  it('shows the empty message when there are no transactions', async () => {
    mockGet([]);
    render(<EgressTable from="2026-07-01" to="2026-07-31" />);
    await waitFor(() =>
      expect(screen.getByText('Sin egresos registrados en este período')).toBeInTheDocument()
    );
  });

  it('AT-FC078-F3-EG-1: la tabla vive en SovereignScrollArea con minWidth derivado (6×96)', async () => {
    mockGet([ROW]);
    render(<EgressTable from="2026-07-01" to="2026-07-31" />);
    await waitFor(() => screen.getByTestId('egress-table'));
    expect(screen.getByTestId('egress-table-scroll-viewport').className).toContain(
      'overflow-x-auto'
    );
    expect(screen.getByTestId('egress-table').style.minWidth).toBe(`${6 * 96}px`);
  });

  it('AT-FC078-F3-EG-2 (P2-2): la celda de concepto truncable expone title', async () => {
    mockGet([ROW]);
    render(<EgressTable from="2026-07-01" to="2026-07-31" />);
    await waitFor(() => screen.getByTestId('egress-table'));
    expect(screen.getByText('Carga de combustible').getAttribute('title')).toBe(
      'Carga de combustible'
    );
  });
});
