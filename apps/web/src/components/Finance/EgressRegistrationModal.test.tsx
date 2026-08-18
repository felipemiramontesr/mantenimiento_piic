import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../test/testUtils';
import EgressRegistrationModal from './EgressRegistrationModal';
import api from '../../api/client';
import { FleetUnit } from '../../types/fleet';

/**
 * FC162 F2 — EgressRegistrationModal.tsx had zero test coverage (excluded
 * from Vitest, no dedicated test). Covers unit load, client-side validation
 * (unit/category/amount), successful submit, and server-error surfacing.
 */

vi.mock('../../api/client', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

const UNITS = [{ id: 'ASM-001', marca: 'Toyota', modelo: 'Hilux' } as FleetUnit];

const submitButton = (): HTMLElement =>
  screen.getByText('Registrar Egreso', { selector: 'button' });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.get).mockResolvedValue({ data: { success: true, data: UNITS } });
  // AuthProvider (real, unmocked via testUtils) fires POST /auth/refresh on
  // mount — reject it distinctly so it never consumes a test's queued
  // mockResolvedValueOnce/mockRejectedValueOnce meant for the transaction POST.
  vi.mocked(api.post).mockImplementation(async (url: string) => {
    if (url === '/auth/refresh') throw new Error('no session');
    throw new Error(`unmocked: ${url}`);
  });
});

async function fillValidForm(): Promise<void> {
  fireEvent.change(screen.getByDisplayValue('Seleccionar unidad...'), {
    target: { value: 'ASM-001' },
  });
  fireEvent.change(screen.getByDisplayValue('Seleccionar categoría...'), {
    target: { value: 'FUEL' },
  });
  fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '500' } });
}

describe('EgressRegistrationModal', () => {
  it('loads fleet units on mount and lists them in the Unidad select', async () => {
    render(<EgressRegistrationModal onClose={vi.fn()} onSuccess={vi.fn()} />);
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/fleet'));
    expect(await screen.findByText('ASM-001 — Toyota Hilux')).toBeInTheDocument();
  });

  it('blocks submit and shows a field error when no unit is selected', async () => {
    render(<EgressRegistrationModal onClose={vi.fn()} onSuccess={vi.fn()} />);
    await waitFor(() => expect(api.get).toHaveBeenCalled());
    fireEvent.click(submitButton());
    expect(await screen.findByText('Selecciona una unidad')).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalledWith('/finance/transactions', expect.anything());
  });

  it('blocks submit and shows a field error when the amount is zero or invalid', async () => {
    render(<EgressRegistrationModal onClose={vi.fn()} onSuccess={vi.fn()} />);
    await waitFor(() => expect(api.get).toHaveBeenCalled());
    fireEvent.change(screen.getByDisplayValue('Seleccionar unidad...'), {
      target: { value: 'ASM-001' },
    });
    fireEvent.change(screen.getByDisplayValue('Seleccionar categoría...'), {
      target: { value: 'FUEL' },
    });
    fireEvent.click(submitButton());
    expect(await screen.findByText('El monto debe ser mayor a $0')).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalledWith('/finance/transactions', expect.anything());
  });

  it('submits a valid payload and calls onSuccess', async () => {
    const onSuccess = vi.fn();
    render(<EgressRegistrationModal onClose={vi.fn()} onSuccess={onSuccess} />);
    await waitFor(() => expect(api.get).toHaveBeenCalled());
    await fillValidForm();
    fireEvent.change(screen.getByPlaceholderText('Nombre del proveedor'), {
      target: { value: 'Gasolinera XYZ' },
    });

    vi.mocked(api.post).mockResolvedValueOnce({ data: { success: true } });
    fireEvent.click(submitButton());

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/finance/transactions', {
        unitId: 'ASM-001',
        category: 'FUEL',
        amount: 500,
        vendor: 'Gasolinera XYZ',
        invoiceRef: null,
        notes: null,
      })
    );
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });

  it('surfaces a server-side field error and clears it once that field changes', async () => {
    render(<EgressRegistrationModal onClose={vi.fn()} onSuccess={vi.fn()} />);
    await waitFor(() => expect(api.get).toHaveBeenCalled());
    await fillValidForm();

    vi.mocked(api.post).mockRejectedValueOnce({
      response: { data: { field: 'amount', message: 'Monto excede el límite mensual' } },
    });
    fireEvent.click(submitButton());

    expect(await screen.findByText('Monto excede el límite mensual')).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '100' } });
    expect(screen.queryByText('Monto excede el límite mensual')).not.toBeInTheDocument();
  });

  it('surfaces a generic error banner when the server error has no known field', async () => {
    render(<EgressRegistrationModal onClose={vi.fn()} onSuccess={vi.fn()} />);
    await waitFor(() => expect(api.get).toHaveBeenCalled());
    await fillValidForm();

    vi.mocked(api.post).mockRejectedValueOnce(new Error('network down'));
    fireEvent.click(submitButton());

    expect(await screen.findByText('Error al registrar el egreso')).toBeInTheDocument();
  });

  it('calls onClose when Cancelar is clicked', async () => {
    const onClose = vi.fn();
    render(<EgressRegistrationModal onClose={onClose} onSuccess={vi.fn()} />);
    await waitFor(() => expect(api.get).toHaveBeenCalled());
    fireEvent.click(screen.getByText('Cancelar'));
    expect(onClose).toHaveBeenCalled();
  });

  it('falls back to an empty unit list when the fleet fetch fails', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('fetch failed'));
    render(<EgressRegistrationModal onClose={vi.fn()} onSuccess={vi.fn()} />);
    await waitFor(() => expect(api.get).toHaveBeenCalled());
    expect(screen.getByText('Seleccionar unidad...')).toBeInTheDocument();
    expect(screen.queryByText('ASM-001 — Toyota Hilux')).not.toBeInTheDocument();
  });
});
