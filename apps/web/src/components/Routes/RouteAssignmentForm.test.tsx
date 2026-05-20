import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor, act, render, mockStartRoute } from '../../test/testUtils';
import RouteAssignmentForm from './RouteAssignmentForm';
import api from '../../api/client';

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
});
