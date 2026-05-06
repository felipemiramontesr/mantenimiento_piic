import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import RouteAssignmentForm from './RouteAssignmentForm';
import { FleetProvider } from '../../context/FleetContext';
import { UserProvider } from '../../context/UserContext';
import api from '../../api/client';

vi.mock('../../api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('RouteAssignmentForm (Cockpit Standard)', () => {
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
      return Promise.resolve({ data: { success: true, data: [] } });
    });
  });

  it('renders the cockpit and loads initial data', async () => {
    await act(async () => {
      render(
        <UserProvider>
          <FleetProvider>
            <RouteAssignmentForm onClose={vi.fn()} />
          </FleetProvider>
        </UserProvider>
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/Identidad del Servicio/i)).toBeDefined();
    });
  });

  it('allows selecting a unit and an operator', async () => {
    await act(async () => {
      render(
        <UserProvider>
          <FleetProvider>
            <RouteAssignmentForm onClose={vi.fn()} />
          </FleetProvider>
        </UserProvider>
      );
    });

    // Wait for hydration
    await waitFor(() => {
      expect(screen.queryByText(/Sincronizando/i)).toBeNull();
    });

    // Open Unit Select
    const unitSelectTrigger = await screen.findByText(
      /Clave o modelo/i,
      { exact: false },
      { timeout: 5000 }
    );
    fireEvent.click(unitSelectTrigger);

    // Select ASM-001
    const unitOption = await screen.findByText(/ASM-001/i, { exact: false }, { timeout: 3000 });
    fireEvent.click(unitOption);

    // Open Operator Select
    const operatorSelectTrigger = await screen.findByText(
      /Buscar por nombre/i,
      { exact: false },
      { timeout: 3000 }
    );
    fireEvent.click(operatorSelectTrigger);

    // Select Juan Perez
    const operatorOption = await screen.findByText(
      /Juan Perez/i,
      { exact: false },
      { timeout: 3000 }
    );
    fireEvent.click(operatorOption);

    // Fill Destination
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
      expect(api.post).toHaveBeenCalledWith(
        '/routes/start',
        expect.objectContaining({
          unitId: 'ASM-001',
          driverId: 1,
          destination: 'Base Norte',
        })
      );
    });
  });
});
