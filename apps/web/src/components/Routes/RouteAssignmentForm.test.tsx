import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor, act, render, mockStartRoute } from '../../test/testUtils';
import RouteAssignmentForm from './RouteAssignmentForm';
import api from '../../api/client';
import { RouteLog } from './RouteLogTable';

// 🔱 Mock API Client (Sovereign Infrastructure)
vi.mock('../../api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

interface MockSelectorProps {
  value?: number;
  onChange: (coloniaId: number | undefined, destinationString: string) => void;
  disabled?: boolean;
}

vi.mock('./RouteAssignment/ArchonGeoSelector', () => ({
  default: ({ onChange, disabled }: MockSelectorProps): React.JSX.Element => (
    <input
      placeholder="Ej: Mina Nivel 400"
      disabled={disabled}
      onChange={(e: React.ChangeEvent<HTMLInputElement>): void => onChange(123, e.target.value)}
    />
  ),
}));

describe('RouteAssignmentForm (Apex Refactor)', () => {
  const mockUnits = [
    {
      id: 'ASM-001',
      marca: 'Nissan',
      modelo: 'March',
      status: 'Disponible',
      odometer: 50000,
      placas: 'ABC-123',
    },
  ];
  const mockUsers = [{ id: 1, fullName: 'Juan Perez', username: 'juan.perez' }];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/fleet') return Promise.resolve({ data: { success: true, data: mockUnits } });
      if (url === '/auth/users')
        return Promise.resolve({ data: { success: true, data: mockUsers } });
      if (url === '/routes') return Promise.resolve({ data: { success: true, data: [] } });
      if (url === '/catalogs/ROUTE_ORIGIN')
        return Promise.resolve({ data: { success: true, data: [{ id: 1, label: 'Base' }] } });
      return Promise.resolve({ data: { success: true, data: [] } });
    });
  });

  it('renders the apex cockpit and loads initial data', async () => {
    render(<RouteAssignmentForm onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/Identidad del Servicio/i)).toBeInTheDocument();
    });
  });

  it('allows selecting a unit and an operator in the atomic panels', async () => {
    render(<RouteAssignmentForm onClose={vi.fn()} />);

    // Wait for hydration
    await waitFor(() => {
      expect(screen.queryByText(/Sincronizando/i)).toBeNull();
    });

    // Open Unit Select (Atomic Identity Panel)
    const unitSelectTrigger = await screen.findByText(/Clave o modelo/i, { exact: false });
    fireEvent.click(unitSelectTrigger);

    // Select ASM-001
    const unitOption = await screen.findByText(/ASM-001/i, { exact: false });
    fireEvent.click(unitOption);

    // Open Operator Select
    const operatorSelectTrigger = await screen.findByText(/Buscar por nombre/i, { exact: false });
    fireEvent.click(operatorSelectTrigger);

    // Select Juan Perez
    const operatorOption = await screen.findByText(/Juan Perez/i, { exact: false });
    fireEvent.click(operatorOption);

    // Fill Destination (Atomic Mission Panel)
    const destinationInput = screen.getByPlaceholderText(/Ej: Mina Nivel 400/i);
    fireEvent.change(destinationInput, { target: { value: 'Base Norte' } });

    // Verify button is enabled and click
    const submitBtn = screen.getByRole('button', { name: /Autorizar Despacho/i });
    expect(submitBtn).not.toBeDisabled();

    vi.mocked(api.post).mockResolvedValueOnce({ data: { success: true } });

    await act(async () => {
      fireEvent.click(submitBtn);
    });

    await waitFor(() => {
      expect(mockStartRoute).toHaveBeenCalledWith(
        expect.objectContaining({
          unitId: 'ASM-001',
          driverId: 1,
          destination: 'Base Norte',
        })
      );
    });
  });

  it('shows an error banner when starting a new route fails', async () => {
    render(<RouteAssignmentForm onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.queryByText(/Sincronizando/i)).toBeNull();
    });

    const unitSelectTrigger = await screen.findByText(/Clave o modelo/i, { exact: false });
    fireEvent.click(unitSelectTrigger);
    fireEvent.click(await screen.findByText(/ASM-001/i, { exact: false }));

    const operatorSelectTrigger = await screen.findByText(/Buscar por nombre/i, { exact: false });
    fireEvent.click(operatorSelectTrigger);
    fireEvent.click(await screen.findByText(/Juan Perez/i, { exact: false }));

    fireEvent.change(screen.getByPlaceholderText(/Ej: Mina Nivel 400/i), {
      target: { value: 'Base Norte' },
    });

    mockStartRoute.mockRejectedValueOnce(new Error('El servidor rechazó el despacho'));

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Autorizar Despacho/i }));
    });

    expect(await screen.findByText('El servidor rechazó el despacho')).toBeInTheDocument();
  });

  it('an isFinished route shows the Sincronizar button/Save icon and falls back start_km to "0,000"', async () => {
    const finishedRoute = {
      id: 'route-2',
      uuid: 'route-2',
      unit_id: 'ASM-001',
      operator_id: '1',
      origin: 'Base',
      destination: 'Mina',
      start_time: '2026-05-01T08:00:00.000Z',
      end_time: '2026-05-01T12:00:00.000Z', // isFinished = true
      start_km: null, // fuerza el fallback '0,000'
      end_km: 50300,
    } as unknown as RouteLog;

    render(<RouteAssignmentForm onClose={vi.fn()} routeToEdit={finishedRoute} />);

    const syncBtn = await screen.findByRole('button', { name: /Sincronizar/i });
    expect(syncBtn).toBeInTheDocument();
    expect(screen.getByText(/0,000/)).toBeInTheDocument();
    // 'Sincronizar' usa el icono Save (lucide-react), no ChevronRight -- distinguible
    // por su clase animate-pulse propia (vs. group-hover:translate-x-1 de ChevronRight).
    expect(syncBtn.querySelector('svg.animate-pulse')).toBeInTheDocument();
  });

  it('shows Transmitiendo... on the submit button while a new-dispatch request is in flight', async () => {
    render(<RouteAssignmentForm onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.queryByText(/Sincronizando/i)).toBeNull();
    });

    fireEvent.click(await screen.findByText(/Clave o modelo/i, { exact: false }));
    fireEvent.click(await screen.findByText(/ASM-001/i, { exact: false }));

    fireEvent.click(await screen.findByText(/Buscar por nombre/i, { exact: false }));
    fireEvent.click(await screen.findByText(/Juan Perez/i, { exact: false }));

    fireEvent.change(screen.getByPlaceholderText(/Ej: Mina Nivel 400/i), {
      target: { value: 'Base Norte' },
    });

    let resolveStart: (v: unknown) => void = () => {};
    mockStartRoute.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveStart = resolve;
        })
    );

    fireEvent.click(screen.getByRole('button', { name: /Autorizar Despacho/i }));

    expect(await screen.findByText('Transmitiendo...')).toBeInTheDocument();

    await act(async () => {
      resolveStart(undefined);
    });
  });

  it('closes the audit justification modal via Cancelar without confirming the deletion', async () => {
    const routeToEdit = {
      id: 'route-1',
      uuid: 'route-1',
      unit_id: 'ASM-001',
      operator_id: '1',
      origin: 'Base',
      destination: 'Mina',
      start_time: '2026-05-01T08:00:00.000Z',
      end_time: null,
      start_km: 50000,
      end_km: null,
    } as unknown as RouteLog;

    render(<RouteAssignmentForm onClose={vi.fn()} routeToEdit={routeToEdit} />);

    const deleteBtn = await screen.findByRole('button', { name: /Eliminar Registro/i });
    fireEvent.click(deleteBtn);

    const cancelBtn = await screen.findByRole('button', { name: /Cancelar/i });
    fireEvent.click(cancelBtn);

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /Cancelar/i })).not.toBeInTheDocument();
    });
  });
});
