import { screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import RouteLogTable from './RouteLogTable';
import { render } from '../../test/testUtils';
import api from '../../api/client';
import * as FleetContextModule from '../../context/FleetContext';

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
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
    if (typeof window !== 'undefined' && window.HTMLElement) {
      window.HTMLElement.prototype.scrollIntoView = vi.fn();
    }
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/routes') return Promise.resolve({ data: { success: true, data: mockRoutes } });
      if (url === '/auth/users')
        return Promise.resolve({ data: { success: true, data: mockUsers } });
      if (url === '/fleet') return Promise.resolve({ data: { success: true, data: mockUnits } });
      return Promise.resolve({ data: { success: true, data: [] } });
    });
  });

  afterEach(() => {
    cleanup();
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
    expect(screen.getByAltText(/Archon Unit Placeholder/i)).toBeDefined();
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

  it('🔱 SORTING PROTOCOL: Should sort routes correctly by unit_id (activo), start_time (mision) and status (estado)', async () => {
    const multiRoutes = [
      {
        id: 1,
        uuid: 'route-1',
        unit_id: 'ASM-001',
        operator_id: '1',
        origin: 'Base',
        destination: 'Cliente A',
        start_reading: 50000,
        end_reading: null,
        start_time: '2026-05-22T08:00:00.000Z',
        end_time: null,
        created_at: '2026-05-22T08:00:00.000Z',
      },
      {
        id: 2,
        uuid: 'route-2',
        unit_id: 'ASM-002',
        operator_id: '1',
        origin: 'Mina',
        destination: 'Cliente B',
        start_reading: 60000,
        end_reading: 60100,
        start_time: '2026-05-23T08:00:00.000Z',
        end_time: '2026-05-23T10:00:00.000Z',
        created_at: '2026-05-23T08:00:00.000Z',
      },
    ];

    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/routes') return Promise.resolve({ data: { success: true, data: multiRoutes } });
      if (url === '/auth/users')
        return Promise.resolve({ data: { success: true, data: mockUsers } });
      if (url === '/fleet') return Promise.resolve({ data: { success: true, data: mockUnits } });
      return Promise.resolve({ data: { success: true, data: [] } });
    });

    render(<RouteLogTable />);

    await waitFor(() => {
      expect(screen.getByText('ASM-001')).toBeDefined();
      expect(screen.getByText('ASM-002')).toBeDefined();
    });

    // 1. Sort by UNIDAD (activo)
    const unitHeader = screen.getByText('UNIDAD');
    fireEvent.click(unitHeader); // asc: ASM-001 first
    let rows = screen.getAllByText(/ASM-00/);
    expect(rows[0].textContent).toContain('ASM-001');

    fireEvent.click(unitHeader); // desc: ASM-002 first
    rows = screen.getAllByText(/ASM-00/);
    expect(rows[0].textContent).toContain('ASM-002');

    // 2. Sort by ESTADO
    const estadoHeader = screen.getByText('ESTADO');
    fireEvent.click(estadoHeader); // asc: EN RUTA (route-1) vs FINALIZADA (route-2) -> EN RUTA (E) is before FINALIZADA (F)
    rows = screen.getAllByText(/ASM-00/);
    expect(rows[0].textContent).toContain('ASM-001');

    fireEvent.click(estadoHeader); // desc: FINALIZADA (route-2) first
    rows = screen.getAllByText(/ASM-00/);
    expect(rows[0].textContent).toContain('ASM-002');

    // 3. Sort by MISIÓN / TRAYECTO (mision)
    const misionHeader = screen.getByText('MISIÓN / TRAYECTO');
    fireEvent.click(misionHeader); // asc: route-1 (22nd May) first
    rows = screen.getAllByText(/ASM-00/);
    expect(rows[0].textContent).toContain('ASM-001');

    fireEvent.click(misionHeader); // desc: route-2 (23rd May) first
    rows = screen.getAllByText(/ASM-00/);
    expect(rows[0].textContent).toContain('ASM-002');
  });

  it('🔱 METRICS CALCULATION PROTOCOL: Should calculate and display KM/L and Precio/KM correctly', async () => {
    const routeWithMetrics = [
      {
        id: 3,
        uuid: 'route-3',
        unit_id: 'ASM-001',
        operator_id: 1,
        origin: 'Base',
        destination: 'Cliente A',
        start_km: 50000,
        end_km: 50200, // Distance = 200 KM
        start_time: '2026-05-22T08:00:00.000Z',
        end_time: '2026-05-22T12:00:00.000Z',
        fuel_level_start: 100,
        fuel_level_end: 50, // ConsumedPct = 50%
        fuel_liters_loaded: 0,
        fuel_amount: 1000, // fuel_amount = $1000.00
        created_at: '2026-05-22T08:00:00.000Z',
      },
    ];

    const mockUseFleet = vi.spyOn(FleetContextModule, 'useFleet').mockReturnValue({
      units: [
        {
          id: 'ASM-001',
          marca: 'Nissan',
          modelo: 'March',
          status: 'Disponible',
          odometer: 50200,
          placas: 'ABC-123',
          fuelTankCapacity: 80, // TankCap = 80L -> 50% consumed = 40L
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ] as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      stats: {} as any,
      loading: false,
      error: null,
      refreshUnits: vi.fn(),
      startRoute: vi.fn(),
      finishRoute: vi.fn(),
      reportIncident: vi.fn(),
      getUnitDetails: vi.fn(),
    });

    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/routes')
        return Promise.resolve({ data: { success: true, data: routeWithMetrics } });
      if (url === '/auth/users')
        return Promise.resolve({ data: { success: true, data: mockUsers } });
      return Promise.resolve({ data: { success: true, data: [] } });
    });

    render(<RouteLogTable />);

    await waitFor(() => {
      expect(screen.getByText('ASM-001')).toBeDefined();
    });

    // Consumed liters = 50% of 80L = 40L.
    // Distance = 200 KM.
    // KM/L = 200 / 40 = 5.00 KM/L.
    // CostPerKM = 1000 / 200 = $5.00/KM.

    expect(screen.getByText('40.0')).toBeDefined(); // 40.0 L
    expect(screen.getByText('5.00 KM/L')).toBeDefined();
    expect(screen.getByText('$5.00/KM')).toBeDefined();

    mockUseFleet.mockRestore();
  });
});
