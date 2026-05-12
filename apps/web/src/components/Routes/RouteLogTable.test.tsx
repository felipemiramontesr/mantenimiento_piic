import { screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import RouteLogTable from './RouteLogTable';
import { render } from '../../test/testUtils';
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
    {
      id: 1,
      username: 'jperez',
      fullName: 'Juan Perez',
      email: 'j@p.com',
      roleId: 1,
      roleName: 'Admin',
      department: 'Sistemas',
      isActive: true,
      employeeNumber: 'E1',
    },
  ];
  const mockUnits = [
    {
      id: 'ASM-001',
      marca: 'Nissan',
      modelo: 'March',
      status: 'En Ruta',
      odometer: 50000,
      placas: 'ABC-123',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/routes') return Promise.resolve({ data: { success: true, data: mockRoutes } });
      if (url === '/auth/users')
        return Promise.resolve({ data: { success: true, data: mockUsers } });
      if (url === '/fleet') return Promise.resolve({ data: { success: true, data: mockUnits } });
      return Promise.resolve({ data: { success: true, data: [] } });
    });
  });

  it('renders route logs correctly and handles NO MEDIA branch', async () => {
    // Unit without images
    const unitNoMedia = [{ ...mockUnits[0], images: [] }];
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/routes') return Promise.resolve({ data: { success: true, data: mockRoutes } });
      if (url === '/auth/users')
        return Promise.resolve({ data: { success: true, data: mockUsers } });
      if (url === '/fleet') return Promise.resolve({ data: { success: true, data: unitNoMedia } });
      return Promise.resolve({ data: { success: true, data: [] } });
    });

    render(<RouteLogTable />);

    await waitFor(() => {
      expect(screen.getByText('ASM-001')).toBeDefined();
    });
    expect(screen.getByText(/NO MEDIA/i)).toBeDefined();
    expect(screen.getByTitle(/Finalizar Misión/i)).toBeDefined();
  });

  it('handles empty route list', async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/routes') return Promise.resolve({ data: { success: true, data: [] } });
      if (url === '/auth/users')
        return Promise.resolve({ data: { success: true, data: mockUsers } });
      if (url === '/fleet') return Promise.resolve({ data: { success: true, data: mockUnits } });
      return Promise.resolve({ data: { success: true, data: [] } });
    });

    render(<RouteLogTable />);

    await waitFor(() => {
      expect(screen.queryByText('ASM-001')).toBeNull();
    });
    expect(screen.getByText(/OPERADOR/i)).toBeDefined();
  });

  it('handles operator without image and onEdit call', async () => {
    const onEdit = vi.fn();
    const userNoImage = [{ ...mockUsers[0], profile_picture_url: null, image_url: null }];
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/routes') return Promise.resolve({ data: { success: true, data: mockRoutes } });
      if (url === '/auth/users')
        return Promise.resolve({ data: { success: true, data: userNoImage } });
      if (url === '/fleet') return Promise.resolve({ data: { success: true, data: mockUnits } });
      return Promise.resolve({ data: { success: true, data: [] } });
    });

    render(<RouteLogTable onEdit={onEdit} />);

    await waitFor(() => {
      expect(screen.getByTitle(/Finalizar Misión/i)).toBeDefined();
    });

    fireEvent.click(screen.getByTitle(/Finalizar Misión/i));
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ uuid: 'route-1' }));
  });

  it('handles API errors in fetchRoutes', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(vi.fn());
    vi.mocked(api.get).mockRejectedValueOnce(new Error('Fetch Error'));

    render(<RouteLogTable />);

    await waitFor(() => {
      expect(screen.getByText(/OPERADOR/i)).toBeDefined();
    });
    consoleSpy.mockRestore();
  });

  it('🔱 LOCAL INSERTION: Should hide table and show incident form in-place', async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/routes') return Promise.resolve({ data: { success: true, data: mockRoutes } });
      if (url === '/auth/users')
        return Promise.resolve({ data: { success: true, data: mockUsers } });
      if (url === '/fleet') return Promise.resolve({ data: { success: true, data: mockUnits } });
      return Promise.resolve({ data: { success: true, data: [] } });
    });

    render(<RouteLogTable />);

    await waitFor(() => {
      expect(screen.getByTitle(/Reportar Incidencia/i)).toBeDefined();
    });

    // 1. Initially Table is visible
    expect(screen.getByTestId('archon-route-log-table')).toBeDefined();

    // 2. Click Alert Button
    fireEvent.click(screen.getByTitle(/Reportar Incidencia/i));

    // 3. TABLE SHOULD BE REMOVED FROM DOM (Local Insertion Protocol)
    expect(screen.queryByTestId('archon-route-log-table')).toBeNull();

    // 4. Form should be visible
    expect(screen.getByText(/Protocolo Sentinel/i)).toBeDefined();

    // 5. Click Cancel and Table should return
    fireEvent.click(screen.getByText(/Cancelar/i));
    expect(screen.getByTestId('archon-route-log-table')).toBeDefined();
  });
});
