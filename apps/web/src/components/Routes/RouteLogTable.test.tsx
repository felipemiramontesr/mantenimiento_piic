import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import RouteLogTable from './RouteLogTable';
import { FleetProvider } from '../../context/FleetContext';
import { UserProvider } from '../../context/UserContext';
import api from '../../api/client';

vi.mock('../../api/client', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: { success: true, data: [] } }),
    post: vi.fn(),
  },
}));

describe('RouteLogTable (Operational Dispatch)', () => {
  const mockRoutes = [
    {
      id: '1',
      uuid: 'R1',
      unit_id: 'UNIT-001',
      destination: 'Mina 1',
      status: 'ACTIVE',
      start_reading: 1000,
      start_time: new Date().toISOString(),
      start_km: 1000,
      operator_id: 'OP-1',
    },
  ];

  it('renders the active routes correctly', async () => {
    (api.get as vi.Mock).mockResolvedValueOnce({ data: { success: true, data: mockRoutes } });

    await act(async () => {
      render(
        <BrowserRouter>
          <UserProvider>
            <FleetProvider>
              <RouteLogTable />
            </FleetProvider>
          </UserProvider>
        </BrowserRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByText('UNIT-001')).toBeDefined();
    });
    expect(screen.getByText('Mina 1')).toBeDefined();
    expect(screen.getByText(/EN RUTA/i)).toBeDefined();
  });

  it('opens the Sentinel Alert form when clicking the alert button', async () => {
    (api.get as vi.Mock).mockResolvedValueOnce({ data: { success: true, data: mockRoutes } });

    await act(async () => {
      render(
        <BrowserRouter>
          <UserProvider>
            <FleetProvider>
              <RouteLogTable />
            </FleetProvider>
          </UserProvider>
        </BrowserRouter>
      );
    });

    const alertBtn = await screen.findByTitle('Reportar Incidencia');
    fireEvent.click(alertBtn);

    expect(screen.getByText(/Protocolo Sentinel: Alerta de Incidencia/i)).toBeDefined();
  });
});
