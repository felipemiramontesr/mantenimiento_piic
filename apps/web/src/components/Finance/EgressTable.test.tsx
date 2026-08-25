import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent } from '@testing-library/react';
import type { ReactElement } from 'react';
import { render, screen, waitFor } from '../../test/testUtils';
import EgressTable from './EgressTable';
import api from '../../api/client';
import { FinancialTransaction } from '../../types/finance';

vi.mock('../../api/client', () => ({
  default: {
    get: vi.fn(),
    // testUtils' AllTheProviders wraps every render with a real AuthProvider,
    // which calls api.post('/auth/refresh') on mount — without this, the
    // call throws synchronously (api.post undefined) and the resulting
    // state update can land outside any act() boundary in later tests.
    post: vi.fn().mockRejectedValue(new Error('no session')),
  },
}));

// No other test in this file exercises EgressRegistrationModal's own form
// internals (out of scope here) — a lightweight stand-in lets the "+"
// button / onSuccess wiring in EgressTable itself get covered directly.
vi.mock('./EgressRegistrationModal', () => ({
  default: ({
    onClose,
    onSuccess,
  }: {
    onClose: () => void;
    onSuccess: () => void;
  }): ReactElement => (
    <div data-testid="egress-modal-stub">
      <button onClick={onClose}>stub-close</button>
      <button onClick={onSuccess}>stub-success</button>
    </div>
  ),
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

  it('falls back to an empty row list when the fetch rejects (207_AN Bravo reopen)', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('network down'));
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

/**
 * FC162 R4-B (100% mandatorio, 202_AN/203_AN Bravo) — cuarto archivo P0
 * (51 unc Sonar). cleanConcept manual/vendor/notes/—, autocomplete de
 * unidad, filtro de categoría, paginación, export CSV y el modal nunca
 * tenían cobertura directa.
 */
describe('EgressTable — cleanConcept fallbacks (manual entries)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses vendor when the entry is manual and vendor is set', async () => {
    mockGet([{ ...ROW, source: 'MANUAL', vendor: 'Gasolinera del Norte', notes: null }]);
    render(<EgressTable from="2026-07-01" to="2026-07-31" />);
    await waitFor(() => screen.getByTestId('egress-table'));
    expect(screen.getByText('Gasolinera del Norte')).toBeInTheDocument();
  });

  it('falls back to notes when the entry is manual and vendor is absent', async () => {
    mockGet([{ ...ROW, source: 'MANUAL', vendor: null, notes: 'Pago directo' }]);
    render(<EgressTable from="2026-07-01" to="2026-07-31" />);
    await waitFor(() => screen.getByTestId('egress-table'));
    expect(screen.getByText('Pago directo')).toBeInTheDocument();
  });

  it('falls back to em-dash when the manual entry has neither vendor nor notes', async () => {
    mockGet([{ ...ROW, source: 'MANUAL', vendor: null, notes: null }]);
    render(<EgressTable from="2026-07-01" to="2026-07-31" />);
    await waitFor(() => screen.getByTestId('egress-table'));
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  it('shows the invoice_ref line for a manual entry that has one', async () => {
    mockGet([{ ...ROW, source: 'MANUAL', vendor: 'Taller X', invoice_ref: 'FAC-0099' }]);
    render(<EgressTable from="2026-07-01" to="2026-07-31" />);
    await waitFor(() => screen.getByTestId('egress-table'));
    expect(screen.getByText('FAC-0099')).toBeInTheDocument();
  });
});

describe('EgressTable — unit autocomplete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('opens suggestions on focus/typing and selects a unit', async () => {
    mockGet([ROW, { ...ROW, id: 2, uuid: 'tx-002', unit_name: 'ASM-020' }]);
    render(<EgressTable from="2026-07-01" to="2026-07-31" />);
    await waitFor(() => screen.getByTestId('egress-table'));

    const input = screen.getByPlaceholderText('Buscar unidad...') as HTMLInputElement;
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'asm' } });

    // "ASM-007" matches both the suggestion <span> and the table cell — the
    // suggestion renders first in DOM order (toolbar precedes the table).
    const matches = screen.getAllByText('ASM-007');
    expect(matches.length).toBeGreaterThan(1);
    fireEvent.click(matches[0]);
    expect(input.value).toBe('ASM-007');
  });

  it('closes the dropdown on Escape and clears the filter via the X button', async () => {
    mockGet([ROW]);
    const { container } = render(<EgressTable from="2026-07-01" to="2026-07-31" />);
    await waitFor(() => screen.getByTestId('egress-table'));

    const input = screen.getByPlaceholderText('Buscar unidad...') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'asm' } });
    fireEvent.keyDown(input, { key: 'Escape' });

    const clearButton = container.querySelector('button.text-slate-400') as HTMLButtonElement;
    expect(clearButton).not.toBeNull();
    fireEvent.click(clearButton);
    expect(input.value).toBe('');
  });

  it('Enter key on a suggestion selects it (UnitSuggestionItem keyboard path, FC163 F1-REG Gate3)', async () => {
    mockGet([ROW, { ...ROW, id: 2, uuid: 'tx-002', unit_name: 'ASM-020' }]);
    render(<EgressTable from="2026-07-01" to="2026-07-31" />);
    await waitFor(() => screen.getByTestId('egress-table'));

    const input = screen.getByPlaceholderText('Buscar unidad...') as HTMLInputElement;
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'asm' } });

    const matches = screen.getAllByText('ASM-007');
    expect(matches.length).toBeGreaterThan(1);
    fireEvent.keyDown(matches[0], { key: 'Enter' });
    expect(input.value).toBe('ASM-007');
  });

  it('closes the suggestions dropdown on an outside click', async () => {
    mockGet([ROW]);
    render(<EgressTable from="2026-07-01" to="2026-07-31" />);
    await waitFor(() => screen.getByTestId('egress-table'));

    const input = screen.getByPlaceholderText('Buscar unidad...');
    fireEvent.change(input, { target: { value: 'asm' } });
    // Two matches while open: the suggestion <span> + the table cell.
    expect(screen.getAllByText('ASM-007')).toHaveLength(2);

    fireEvent.mouseDown(document.body);
    // Only the table cell remains once the dropdown closes.
    expect(screen.getAllByText('ASM-007')).toHaveLength(1);
  });
});

describe('EgressTable — category filter, pagination and export', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('refetches with the category param when the filter changes', async () => {
    mockGet([ROW]);
    render(<EgressTable from="2026-07-01" to="2026-07-31" />);
    await waitFor(() => screen.getByTestId('egress-table'));

    fireEvent.change(screen.getByDisplayValue('Todas las categorías'), {
      target: { value: 'FUEL' },
    });

    await waitFor(() => {
      const lastCallUrl = vi.mocked(api.get).mock.calls.at(-1)?.[0] as string;
      expect(lastCallUrl).toContain('category=FUEL');
    });
  });

  it('loads more rows when nextCursor is present', async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce({
        data: { success: true, data: [ROW], meta: { nextCursor: 'cursor-2', total: 2 } },
      })
      .mockResolvedValueOnce({
        data: {
          success: true,
          data: [{ ...ROW, id: 2, uuid: 'tx-002', unit_name: 'ASM-020' }],
          meta: { nextCursor: null, total: 2 },
        },
      });
    render(<EgressTable from="2026-07-01" to="2026-07-31" />);
    await waitFor(() => screen.getByTestId('egress-table'));

    fireEvent.click(screen.getByText('Cargar más'));
    await waitFor(() => expect(screen.getByText('ASM-020')).toBeInTheDocument());
  });

  it('exports a CSV blob via the download button', async () => {
    mockGet([ROW]);
    const createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL });

    render(<EgressTable from="2026-07-01" to="2026-07-31" />);
    await waitFor(() => screen.getByTestId('egress-table'));

    vi.mocked(api.get).mockResolvedValueOnce({ data: new Blob(['csv']) });
    fireEvent.click(screen.getByTitle('Exportar CSV'));

    // Wait for handleExport's finally { setExporting(false) } to land too,
    // not just the createObjectURL call, so no state update escapes act().
    await waitFor(() => expect(screen.getByTitle('Exportar CSV')).not.toBeDisabled());
    expect(createObjectURL).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');

    vi.unstubAllGlobals();
  });

  it('opens the registration modal and refetches on success', async () => {
    mockGet([ROW]);
    render(<EgressTable from="2026-07-01" to="2026-07-31" />);
    await waitFor(() => screen.getByTestId('egress-table'));

    fireEvent.click(screen.getByTitle('Registrar egreso'));
    expect(screen.getByTestId('egress-modal-stub')).toBeInTheDocument();

    const callsBefore = vi.mocked(api.get).mock.calls.length;
    fireEvent.click(screen.getByText('stub-success'));

    expect(screen.queryByTestId('egress-modal-stub')).not.toBeInTheDocument();
    await waitFor(() => expect(vi.mocked(api.get).mock.calls.length).toBeGreaterThan(callsBefore));
  });

  it('closes the registration modal without refetching', async () => {
    mockGet([ROW]);
    render(<EgressTable from="2026-07-01" to="2026-07-31" />);
    await waitFor(() => screen.getByTestId('egress-table'));

    fireEvent.click(screen.getByTitle('Registrar egreso'));
    fireEvent.click(screen.getByText('stub-close'));
    expect(screen.queryByTestId('egress-modal-stub')).not.toBeInTheDocument();
  });
});
