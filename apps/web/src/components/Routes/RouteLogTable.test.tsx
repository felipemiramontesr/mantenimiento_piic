import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, Mock } from 'vitest';
import RouteLogTable from './RouteLogTable';
import { FleetProvider } from '../../context/FleetContext';
import { UserProvider } from '../../context/UserContext';
import api from '../../api/client';

vi.mock('../../api/client', () => ({
  default: {
    get: vi.fn(),
  },
}));

describe('RouteLogTable (Logistics Standard)', () => {
  const mockRoutes = [
    {
      uuid: 'route-1',
      unit_id: 'ASM-001',
      operator_id: 1,
      operator_name: 'Juan Perez',
      origin: 'Base',
      destination: 'Cliente A',
      status: 'En Ruta',
      start_reading: 50000,
      created_at: new Date().toISOString(),
    },
  ];

  const mockUsers = [
    { id: 1, username: 'jperez', full_name: 'Juan Perez', email: 'j@p.com', roleId: 1, roleName: 'Admin', department: 'Sistemas', is_active: true }
  ];
  const mockUnits = [
    { id: 'ASM-001', marca: 'Nissan', modelo: 'March', status: 'En Ruta', odometer: 50000, placas: 'ABC-123' }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as any).mockImplementation((url: string) => {
      if (url === '/routes') return Promise.resolve({ data: { success: true, data: mockRoutes } });
      if (url === '/auth/users') return Promise.resolve({ data: { success: true, data: mockUsers } });
      if (url === '/fleet') return Promise.resolve({ data: { success: true, data: mockUnits } });
      return Promise.resolve({ data: { success: true, data: [] } });
    });
  });

  it('renders route logs correctly and handles NO MEDIA branch', async () => {
    // Unit without images
    const unitNoMedia = [{ ...mockUnits[0], images: [] }];
    (api.get as Mock).mockImplementation((url: string) => {
      if (url === '/routes') return Promise.resolve({ data: { success: true, data: mockRoutes } });
      if (url === '/auth/users') return Promise.resolve({ data: { success: true, data: mockUsers } });
      if (url === '/fleet') return Promise.resolve({ data: { success: true, data: unitNoMedia } });
      return Promise.resolve({ data: { success: true, data: [] } });
    });

    await act(async () => {
      render(
        <UserProvider>
          <FleetProvider>
            <RouteLogTable />
          </FleetProvider>
        </UserProvider>
      );
    });

    await waitFor(() => {
      expect(screen.getByText('ASM-001')).toBeDefined();
    });
    expect(screen.getByText(/NO MEDIA/i)).toBeDefined();
    // Check if finalization button (CheckCircle2) exists (title="Finalizar Misión")
    expect(screen.getByTitle(/Finalizar Misión/i)).toBeDefined();
  });

  it('handles empty route list', async () => {
    (api.get as Mock).mockImplementation((url: string) => {
      if (url === '/routes') return Promise.resolve({ data: { success: true, data: [] } });
      if (url === '/auth/users') return Promise.resolve({ data: { success: true, data: mockUsers } });
      if (url === '/fleet') return Promise.resolve({ data: { success: true, data: mockUnits } });
      return Promise.resolve({ data: { success: true, data: [] } });
    });

    await act(async () => {
      render(
        <UserProvider>
          <FleetProvider>
            <RouteLogTable />
          </FleetProvider>
        </UserProvider>
      );
    });

    await waitFor(() => {
      // It should render the headers but no data rows
      expect(screen.queryByText('ASM-001')).toBeNull();
    });
    expect(screen.getByText(/OPERADOR/i)).toBeDefined();
  });

  it('handles operator without image and onEdit call', async () => {
    const onEdit = vi.fn();
    const userNoImage = [{ ...mockUsers[0], profile_picture_url: null, image_url: null }];
    (api.get as Mock).mockImplementation((url: string) => {
      if (url === '/routes') return Promise.resolve({ data: { success: true, data: mockRoutes } });
      if (url === '/auth/users') return Promise.resolve({ data: { success: true, data: userNoImage } });
      if (url === '/fleet') return Promise.resolve({ data: { success: true, data: mockUnits } });
      return Promise.resolve({ data: { success: true, data: [] } });
    });

    await act(async () => {
      render(
        <UserProvider>
          <FleetProvider>
            <RouteLogTable onEdit={onEdit} />
          </FleetProvider>
        </UserProvider>
      );
    });

    await waitFor(() => {
      expect(screen.getByTitle(/Finalizar Misión/i)).toBeDefined();
    });

    fireEvent.click(screen.getByTitle(/Finalizar Misión/i));
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ uuid: 'route-1' }));
  });

  it('handles API errors in fetchRoutes', async () => {
    (api.get as Mock).mockRejectedValueOnce(new Error('Fetch Error'));

    await act(async () => {
      render(
        <UserProvider>
          <FleetProvider>
            <RouteLogTable />
          </FleetProvider>
        </UserProvider>
      );
    });

    // Should not crash
    expect(screen.getByText(/OPERADOR/i)).toBeDefined();
  });

  it('allows opening incident report form', async () => {
    (api.get as Mock).mockImplementation((url: string) => {
      if (url === '/routes') return Promise.resolve({ data: { success: true, data: mockRoutes } });
      if (url === '/auth/users') return Promise.resolve({ data: { success: true, data: mockUsers } });
      if (url === '/fleet') return Promise.resolve({ data: { success: true, data: mockUnits } });
      return Promise.resolve({ data: { success: true, data: [] } });
    });

    await act(async () => {
      render(
        <UserProvider>
          <FleetProvider>
            <RouteLogTable />
          </FleetProvider>
        </UserProvider>
      );
    });

    await waitFor(() => {
      expect(screen.getByTitle(/Reportar Incidencia/i)).toBeDefined();
    });

    fireEvent.click(screen.getByTitle(/Reportar Incidencia/i));
    
    // Check if IncidentReportForm is visible (Protocolo Sentinel text)
    expect(screen.getByText(/Protocolo Sentinel/i)).toBeDefined();
  });
});
