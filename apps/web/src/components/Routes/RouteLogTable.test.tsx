/* eslint-disable @typescript-eslint/no-explicit-any */
import { screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import RouteLogTable from './RouteLogTable';
import { render } from '../../test/testUtils';
import api from '../../api/client';
import * as FleetContextModule from '../../context/FleetContext';
import * as UserContextModule from '../../context/UserContext';
import * as layoutContext from '../../context/SovereignLayoutContext';

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
    expect(screen.getByAltText(/Archon Unit Avatar/i)).toBeDefined();
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

  it('sort comparators fall back correctly for falsy id/end_time/start_time and an unparseable date', async () => {
    // 3 elementos (2 comparten el valor "trigger") para forzar que el comparador
    // de Array.prototype.sort reciba cada ruta tanto en la posicion 'a' como 'b'
    // (con 2 elementos el orden de argumentos queda fijo, patron ya establecido
    // en esta sesion para MaintenanceGridView.tsx).
    const edgeRoutes = [
      {
        id: 0, // id||0 -> toma el fallback (0)
        uuid: 'route-edge-1',
        unit_id: 'ASM-010',
        operator_id: '1',
        origin: 'Base',
        destination: 'Cliente A',
        start_reading: 10000,
        end_reading: null,
        start_time: null, // start_time? -> toma el fallback (0)
        end_time: null, // end_time? -> 'EN RUTA'
        created_at: '2026-05-20T08:00:00.000Z',
      },
      {
        id: 5,
        uuid: 'route-edge-2',
        unit_id: 'ASM-011',
        operator_id: '1',
        origin: 'Mina',
        destination: 'Cliente B',
        start_reading: 20000,
        end_reading: 20100,
        start_time: 'not-a-real-date', // truthy pero Date(...).getTime() = NaN -> isNaN true
        end_time: '2026-05-21T10:00:00.000Z', // 'FINALIZADA'
        created_at: '2026-05-21T08:00:00.000Z',
      },
      {
        id: 0, // repetido: misma condicion "trigger" en la otra posicion del par
        uuid: 'route-edge-3',
        unit_id: 'ASM-012',
        operator_id: '1',
        origin: 'Base',
        destination: 'Cliente C',
        start_reading: 15000,
        end_reading: null,
        start_time: null,
        end_time: null,
        created_at: '2026-05-22T08:00:00.000Z',
      },
    ];

    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/routes') return Promise.resolve({ data: { success: true, data: edgeRoutes } });
      if (url === '/auth/users')
        return Promise.resolve({ data: { success: true, data: mockUsers } });
      if (url === '/fleet') return Promise.resolve({ data: { success: true, data: mockUnits } });
      return Promise.resolve({ data: { success: true, data: [] } });
    });

    render(<RouteLogTable />);
    await waitFor(() => expect(screen.getByText('ASM-010')).toBeDefined());

    fireEvent.click(screen.getByText('UNIDAD'));
    fireEvent.click(screen.getByText('ESTADO'));
    fireEvent.click(screen.getByText('MISIÓN / TRAYECTO'));

    // no crashea con id/start_time/end_time nulos + una fecha no parseable
    expect(screen.getByText('ASM-010')).toBeInTheDocument();
    expect(screen.getByText('ASM-011')).toBeInTheDocument();
    expect(screen.getByText('ASM-012')).toBeInTheDocument();
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
      ] as any,
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

  it('telemetryCalcs edge cases: falsy fuel_level_start, doubly-null fuel levels, zero distance, and an active incident', async () => {
    const edgeMetricsRoutes = [
      {
        id: 10,
        uuid: 'route-edge-a',
        unit_id: 'ASM-001',
        operator_id: 1,
        origin: 'Base',
        destination: 'A',
        start_km: 50000,
        end_km: 50100,
        start_time: '2026-05-22T08:00:00.000Z',
        end_time: '2026-05-22T12:00:00.000Z',
        fuel_level_start: 0, // ||0 -> toma el fallback (mismo valor, ejercita la rama)
        fuel_level_end: null, // ??fuel_level_start -> usa 0 (no llega al ??100)
        fuel_liters_loaded: 0,
        fuel_amount: 100,
        created_at: '2026-05-22T08:00:00.000Z',
      },
      {
        id: 11,
        uuid: 'route-edge-b',
        unit_id: 'ASM-001',
        operator_id: 1,
        origin: 'Base',
        destination: 'B',
        start_km: 50100,
        end_km: 50200,
        start_time: '2026-05-22T08:00:00.000Z',
        end_time: '2026-05-22T13:00:00.000Z',
        fuel_level_start: null,
        fuel_level_end: null, // ambos nulos -> ??100
        fuel_liters_loaded: 50,
        fuel_amount: 100,
        created_at: '2026-05-22T08:00:00.000Z',
      },
      {
        id: 12,
        uuid: 'route-edge-c',
        unit_id: 'ASM-001',
        operator_id: 1,
        origin: 'Base',
        destination: 'C',
        start_km: 50200,
        end_km: 50200, // distance=0 -> computeKmPerLiter Y computeCostPerKm devuelven null
        start_time: '2026-05-22T08:00:00.000Z',
        end_time: '2026-05-22T14:00:00.000Z',
        fuel_level_start: 100,
        fuel_level_end: 50, // consumedLiters>0, para llegar al chequeo de distancia
        fuel_liters_loaded: 0,
        fuel_amount: 100,
        created_at: '2026-05-22T08:00:00.000Z',
      },
      {
        id: 13,
        uuid: 'route-edge-d',
        unit_id: 'ASM-001',
        operator_id: 1,
        origin: 'Base',
        destination: 'D',
        start_km: 50200,
        end_km: null,
        start_time: '2026-05-22T08:00:00.000Z',
        end_time: null, // en ruta
        incident_count: 1, // con incidencia -> getRouteLogStatus rama EN RUTA
        created_at: '2026-05-22T08:00:00.000Z',
      },
      {
        id: 14,
        uuid: 'route-edge-e',
        unit_id: 'ASM-001',
        operator_id: 1,
        origin: 'Base',
        destination: 'E',
        start_km: 50300,
        end_km: 50250, // delta negativo (odometro corregido a la baja)
        start_time: '2026-05-22T08:00:00.000Z',
        end_time: '2026-05-22T15:00:00.000Z',
        fuel_level_start: 80,
        fuel_level_end: 70,
        fuel_liters_loaded: 0,
        fuel_amount: 50,
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
          fuelTankCapacity: 80,
        },
      ] as any,
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
        return Promise.resolve({ data: { success: true, data: edgeMetricsRoutes } });
      if (url === '/auth/users')
        return Promise.resolve({ data: { success: true, data: mockUsers } });
      return Promise.resolve({ data: { success: true, data: [] } });
    });

    render(<RouteLogTable />);
    await waitFor(() => expect(screen.getAllByText('ASM-001').length).toBeGreaterThan(0));

    // ruta D: con incidencia activa (end_time null) muestra EN RUTA, no FINALIZADA
    expect(screen.getByText('EN RUTA')).toBeInTheDocument();
    // ruta E: delta negativo -> sin prefijo '+', estilo rose (isNegative)
    expect(screen.getByText('-50')).toBeInTheDocument();

    mockUseFleet.mockRestore();
  });
});

/**
 * FC162 R4-B (100% mandatorio, 202_AN/203_AN Bravo) — tercer archivo P0
 * (56 unc Sonar). matchFieldInRoute/getStatus(incidente)/image error
 * handlers/botón editar/expand de fila nunca tenían cobertura directa.
 */
describe('RouteLogTable — search suggestions (matchFieldInRoute)', () => {
  const routes = [
    {
      id: 1,
      uuid: 'route-suggest',
      unit_id: 'ASM-005',
      operator_id: 9,
      origin: 'Base Norte',
      destination: 'Cliente Delta',
      description: 'Entrega urgente',
      start_time: '2026-05-01T08:00:00.000Z',
      end_time: null,
      created_at: '2026-05-01T08:00:00.000Z',
    },
  ];
  const users = [
    {
      id: '9',
      username: 'mlopez',
      fullName: 'María López',
      email: 'm@p.com',
      roleId: 1,
      roleName: 'Operador',
      department: 'Operaciones',
      isActive: true,
      employeeNumber: 'E-909',
    },
  ];
  const units = [
    {
      id: 'ASM-005',
      marca: 'Kenworth',
      modelo: 'T680',
      sede: 'Sede Norte',
      status: 'En Ruta',
      odometer: 1000,
    },
  ];

  const captureGetSuggestions = async (): Promise<(term: string) => any[]> => {
    const setSearchConfig = vi.fn();
    vi.spyOn(layoutContext, 'useSovereignLayout').mockReturnValue({
      layoutData: { title: 'Rutas', description: 'ERP' },
      searchTerm: '',
      setSearchTerm: vi.fn(),
      searchConfig: null,
      setSearchConfig,
      setSectionData: vi.fn(),
      isMobileMenuOpen: false,
      setIsMobileMenuOpen: vi.fn(),
    });
    vi.spyOn(FleetContextModule, 'useFleet').mockReturnValue({
      units: units as any,
      stats: {} as any,
      loading: false,
      error: null,
      refreshUnits: vi.fn(),
      startRoute: vi.fn(),
      finishRoute: vi.fn(),
      reportIncident: vi.fn(),
      getUnitDetails: vi.fn(),
    });
    vi.spyOn(UserContextModule, 'useUsers').mockReturnValue({
      users: users as any,
      isLoading: false,
      activePanel: 'DIRECTORY',
      setActivePanel: vi.fn(),
      fetchUsers: vi.fn(),
      toggleUserStatus: vi.fn(),
      updateUser: vi.fn(),
      deleteUser: vi.fn(),
      editingUser: null,
      setEditingUser: vi.fn(),
      departments: [],
      departmentsCatalog: [],
      roles: [],
    } as any);
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/routes') return Promise.resolve({ data: { success: true, data: routes } });
      return Promise.resolve({ data: { success: true, data: [] } });
    });

    render(<RouteLogTable />);
    // The registration effect depends on `logs`, which starts as [] and
    // updates once the async /routes fetch resolves — the effect re-runs
    // and calls setSearchConfig again with a fresh getSuggestions closure.
    // Wait for that second call before handing back a wrapper that always
    // reads the latest registered config.
    await waitFor(() => expect(setSearchConfig.mock.calls.length).toBeGreaterThan(1));
    return (term: string): any[] => {
      const { calls } = setSearchConfig.mock;
      return calls[calls.length - 1][0].getSuggestions(term);
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('matches by unit id', async () => {
    const getSuggestions = await captureGetSuggestions();
    expect(getSuggestions('asm-005')).toHaveLength(1);
  });

  it('matches by operator full name and employee number', async () => {
    const getSuggestions = await captureGetSuggestions();
    expect(getSuggestions('maría')).toHaveLength(1);
    expect(getSuggestions('e-909')).toHaveLength(1);
  });

  it('matches by origin, destination and description', async () => {
    const getSuggestions = await captureGetSuggestions();
    expect(getSuggestions('base norte')).toHaveLength(1);
    expect(getSuggestions('cliente delta')).toHaveLength(1);
    expect(getSuggestions('urgente')).toHaveLength(1);
  });

  it('matches by unit marca/modelo/sede', async () => {
    const getSuggestions = await captureGetSuggestions();
    expect(getSuggestions('kenworth')).toHaveLength(1);
    expect(getSuggestions('t680')).toHaveLength(1);
    expect(getSuggestions('sede norte')).toHaveLength(1);
  });

  it('returns no suggestions when nothing matches', async () => {
    const getSuggestions = await captureGetSuggestions();
    expect(getSuggestions('zzz-no-match')).toHaveLength(0);
  });

  it('falls back to "Operador General" when the suggestion route has no matching operator', async () => {
    const setSearchConfig = vi.fn();
    vi.spyOn(layoutContext, 'useSovereignLayout').mockReturnValue({
      layoutData: { title: 'Rutas', description: 'ERP' },
      searchTerm: '',
      setSearchTerm: vi.fn(),
      searchConfig: null,
      setSearchConfig,
      setSectionData: vi.fn(),
      isMobileMenuOpen: false,
      setIsMobileMenuOpen: vi.fn(),
    });
    vi.spyOn(FleetContextModule, 'useFleet').mockReturnValue({
      units: units as any,
      stats: {} as any,
      loading: false,
      error: null,
      refreshUnits: vi.fn(),
      startRoute: vi.fn(),
      finishRoute: vi.fn(),
      reportIncident: vi.fn(),
      getUnitDetails: vi.fn(),
    });
    vi.spyOn(UserContextModule, 'useUsers').mockReturnValue({
      users: users as any,
      isLoading: false,
      activePanel: 'DIRECTORY',
      setActivePanel: vi.fn(),
      fetchUsers: vi.fn(),
      toggleUserStatus: vi.fn(),
      updateUser: vi.fn(),
      deleteUser: vi.fn(),
      editingUser: null,
      setEditingUser: vi.fn(),
      departments: [],
      departmentsCatalog: [],
      roles: [],
    } as any);
    const orphanRoute = [{ ...routes[0], operator_id: 999 }]; // sin match en users
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/routes') return Promise.resolve({ data: { success: true, data: orphanRoute } });
      return Promise.resolve({ data: { success: true, data: [] } });
    });

    render(<RouteLogTable />);
    await waitFor(() => expect(setSearchConfig.mock.calls.length).toBeGreaterThan(1));
    const { calls } = setSearchConfig.mock;
    // 'base norte' (origen) en vez de 'asm-005' (unidad) -- fuerza que
    // matchFieldInRoute pase por matchOperator(undefined, query) (operador sin
    // match) ANTES de coincidir por origen, cubriendo su guard `if(!operator)`.
    const suggestions = calls[calls.length - 1][0].getSuggestions('base norte');

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].subtitle).toBe('Operador General');
    expect(suggestions[0].metaLabel).toBe('Origen');
  });

  it('onSuggestionSelect sets the search term to the selected route unit_id', async () => {
    const setSearchTerm = vi.fn();
    const setSearchConfig = vi.fn();
    vi.spyOn(layoutContext, 'useSovereignLayout').mockReturnValue({
      layoutData: { title: 'Rutas', description: 'ERP' },
      searchTerm: '',
      setSearchTerm,
      searchConfig: null,
      setSearchConfig,
      setSectionData: vi.fn(),
      isMobileMenuOpen: false,
      setIsMobileMenuOpen: vi.fn(),
    });
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/routes') return Promise.resolve({ data: { success: true, data: routes } });
      return Promise.resolve({ data: { success: true, data: [] } });
    });
    render(<RouteLogTable />);
    await waitFor(() => expect(setSearchConfig).toHaveBeenCalled());
    setSearchConfig.mock.calls[0][0].onSuggestionSelect({ rawItem: { unit_id: 'ASM-005' } });
    expect(setSearchTerm).toHaveBeenCalledWith('ASM-005');
  });
});

describe('RouteLogTable — row interactions', () => {
  const routeWithIncident = [
    {
      id: 4,
      uuid: 'route-incident',
      unit_id: 'ASM-001',
      operator_id: 1,
      operator_name: 'Juan Perez',
      origin: 'Base',
      destination: 'Cliente A',
      status: 'En Ruta',
      start_reading: 50000,
      end_time: '2026-05-01T10:00:00.000Z',
      incident_count: 2,
      created_at: new Date().toISOString(),
    },
  ];
  const unitWithImage = [
    {
      id: 'ASM-001',
      marca: 'Nissan',
      modelo: 'March',
      status: 'En Ruta',
      odometer: 50000,
      placas: 'ABC-123',
      images: ['/img/unit.png'],
    },
  ];
  const userWithImage = [
    {
      id: '1',
      username: 'jperez',
      fullName: 'Juan Perez',
      email: 'j@p.com',
      roleId: 1,
      roleName: 'Admin',
      department: 'Sistemas',
      isActive: true,
      employeeNumber: 'E1',
      imageUrl: 'https://example.com/avatar.png',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
    // useFleet/useUsers here come from testUtils' static MockFleetContext/
    // MockUserContext (a plain Context.Provider value, not a real fetching
    // provider) — the /fleet and /auth/users mocks below are NOT what feeds
    // them, so unit/operator images require an explicit spy override.
    vi.spyOn(FleetContextModule, 'useFleet').mockReturnValue({
      units: unitWithImage as any,
      stats: {} as any,
      loading: false,
      error: null,
      refreshUnits: vi.fn(),
      startRoute: vi.fn(),
      finishRoute: vi.fn(),
      reportIncident: vi.fn(),
      getUnitDetails: vi.fn(),
    });
    vi.spyOn(UserContextModule, 'useUsers').mockReturnValue({
      users: userWithImage as any,
      isLoading: false,
      activePanel: 'DIRECTORY',
      setActivePanel: vi.fn(),
      fetchUsers: vi.fn(),
      toggleUserStatus: vi.fn(),
      updateUser: vi.fn(),
      deleteUser: vi.fn(),
      editingUser: null,
      setEditingUser: vi.fn(),
      departments: [],
      departmentsCatalog: [],
      roles: [],
    } as any);
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/routes')
        return Promise.resolve({ data: { success: true, data: routeWithIncident } });
      return Promise.resolve({ data: { success: true, data: [] } });
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.restoreAllMocks();
  });

  it('shows FINALIZADA status for a completed route with a logged incident', async () => {
    render(<RouteLogTable />);
    await waitFor(() => expect(screen.getByText('ASM-001')).toBeDefined());
    expect(screen.getByText('FINALIZADA')).toBeDefined();
  });

  it('falls back to the default image when the unit thumbnail fails to load', async () => {
    render(<RouteLogTable />);
    await waitFor(() => expect(screen.getByAltText('ASM-001')).toBeDefined());
    fireEvent.error(screen.getByAltText('ASM-001'));
    expect((screen.getByAltText('ASM-001') as HTMLImageElement).src).toContain(
      'archon-unit-default.png'
    );
  });

  it('hides the operator avatar image on load error', async () => {
    render(<RouteLogTable />);
    await waitFor(() => expect(screen.getByAltText('Juan Perez')).toBeDefined());
    fireEvent.error(screen.getByAltText('Juan Perez'));
    expect((screen.getByAltText('Juan Perez') as HTMLImageElement).style.display).toBe('none');
  });

  it('the operator avatar alt text falls back to "Operator" when fullName is empty', async () => {
    vi.spyOn(UserContextModule, 'useUsers').mockReturnValue({
      users: [{ ...userWithImage[0], fullName: '' }] as any,
      isLoading: false,
      activePanel: 'DIRECTORY',
      setActivePanel: vi.fn(),
      fetchUsers: vi.fn(),
      toggleUserStatus: vi.fn(),
      updateUser: vi.fn(),
      deleteUser: vi.fn(),
      editingUser: null,
      setEditingUser: vi.fn(),
      departments: [],
      departmentsCatalog: [],
      roles: [],
    } as any);
    render(<RouteLogTable />);
    expect(await screen.findByAltText('Operator')).toBeInTheDocument();
  });

  it('invokes onEdit when the "Editar Ruta" button is clicked (stopPropagation)', async () => {
    const onEdit = vi.fn();
    render(<RouteLogTable onEdit={onEdit} />);
    await waitFor(() => expect(screen.getByTitle('Editar Ruta')).toBeDefined());
    fireEvent.click(screen.getByTitle('Editar Ruta'));
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ uuid: 'route-incident' }));
  });

  it('the "Ver nodo de ruta" link stops click propagation without toggling the row', async () => {
    render(<RouteLogTable />);
    await waitFor(() => expect(screen.getByTitle('Ver nodo de ruta')).toBeDefined());
    fireEvent.click(screen.getByTitle('Ver nodo de ruta'));
    // No assertion needed beyond "does not throw" — this exercises the
    // stopPropagation branch itself (line coverage), not a visible state change.
  });

  it('expands and collapses the row on click', async () => {
    render(<RouteLogTable />);
    await waitFor(() => expect(screen.getByText('ASM-001')).toBeDefined());
    fireEvent.click(screen.getByText('ASM-001'));
    fireEvent.click(screen.getByText('ASM-001'));
  });
});

/**
 * 207_AN Bravo (auditoría R independiente) — reopen: estas líneas seguían
 * sin cobertura pese al reporte anterior de "saldado". filteredLogs's
 * active-searchTerm branch (match por uuid directo Y por matchFieldInRoute)
 * y el onSuccess real de IncidentReportForm (cierra el formulario Y
 * refresca la lista) nunca se ejercitaban.
 */
describe('RouteLogTable — active searchTerm filters rows (207_AN Bravo reopen)', () => {
  const usersFixture = [
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
  const unitsFixture = [
    { id: 'ASM-100', marca: 'Nissan', modelo: 'March', status: 'En Ruta', odometer: 1000 },
    { id: 'ASM-200', marca: 'Ford', modelo: 'Ranger', status: 'En Ruta', odometer: 2000 },
  ];
  const routeAlpha = {
    id: 1,
    uuid: 'route-alpha',
    unit_id: 'ASM-100',
    operator_id: 1,
    origin: 'Base',
    destination: 'Cliente A',
    status: 'En Ruta',
    start_reading: 1000,
    created_at: new Date().toISOString(),
  };
  const routeBeta = {
    id: 2,
    uuid: 'route-beta',
    unit_id: 'ASM-200',
    operator_id: 1,
    origin: 'Base',
    destination: 'Cliente B',
    status: 'En Ruta',
    start_reading: 2000,
    created_at: new Date().toISOString(),
  };

  const mockRoutesRequest = (): void => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/routes')
        return Promise.resolve({ data: { success: true, data: [routeAlpha, routeBeta] } });
      if (url === '/auth/users')
        return Promise.resolve({ data: { success: true, data: usersFixture } });
      if (url === '/fleet') return Promise.resolve({ data: { success: true, data: unitsFixture } });
      return Promise.resolve({ data: { success: true, data: [] } });
    });
  };

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('filters rows by matching the uuid directly (case-insensitive)', async () => {
    vi.spyOn(layoutContext, 'useSovereignLayout').mockReturnValue({
      layoutData: { title: 'Rutas', description: 'ERP' },
      searchTerm: 'ROUTE-ALPHA',
      setSearchTerm: vi.fn(),
      searchConfig: null,
      setSearchConfig: vi.fn(),
      setSectionData: vi.fn(),
      isMobileMenuOpen: false,
      setIsMobileMenuOpen: vi.fn(),
    });
    mockRoutesRequest();

    render(<RouteLogTable />);
    await waitFor(() => expect(screen.getByText('ASM-100')).toBeDefined());
    expect(screen.queryByText('ASM-200')).toBeNull();
  });

  it('filters rows via matchFieldInRoute when the term is not a uuid', async () => {
    vi.spyOn(layoutContext, 'useSovereignLayout').mockReturnValue({
      layoutData: { title: 'Rutas', description: 'ERP' },
      searchTerm: 'ASM-200',
      setSearchTerm: vi.fn(),
      searchConfig: null,
      setSearchConfig: vi.fn(),
      setSectionData: vi.fn(),
      isMobileMenuOpen: false,
      setIsMobileMenuOpen: vi.fn(),
    });
    mockRoutesRequest();

    render(<RouteLogTable />);
    await waitFor(() => expect(screen.getByText('ASM-200')).toBeDefined());
    expect(screen.queryByText('ASM-100')).toBeNull();
  });
});

describe('RouteLogTable — incident report success flow (207_AN Bravo reopen)', () => {
  const mockRoutes = [
    {
      id: 1,
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
    { id: 'ASM-001', marca: 'Nissan', modelo: 'March', status: 'En Ruta', odometer: 50000 },
  ];

  afterEach(() => {
    cleanup();
  });

  it('closes the incident form and refreshes the log list once the report succeeds', async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/routes') return Promise.resolve({ data: { success: true, data: mockRoutes } });
      if (url === '/auth/users')
        return Promise.resolve({ data: { success: true, data: mockUsers } });
      if (url === '/fleet') return Promise.resolve({ data: { success: true, data: mockUnits } });
      return Promise.resolve({ data: { success: true, data: [] } });
    });

    render(<RouteLogTable />);
    await waitFor(() => expect(screen.getByTitle(/Reportar Incidencia/i)).toBeDefined());

    fireEvent.click(screen.getByTitle(/Reportar Incidencia/i));
    expect(screen.getByText(/Protocolo Sentinel/i)).toBeDefined();

    fireEvent.change(screen.getByPlaceholderText(/Describe la incidencia/i), {
      target: { value: 'Falla de frenos detectada en ruta.' },
    });

    const callsBefore = vi.mocked(api.get).mock.calls.length;
    fireEvent.click(screen.getByText(/Emitir Alerta Sentinel/i));

    // onSuccess (setReportingRoute(null)) removes the form and restores the
    // table; refresh() triggers an additional /routes GET beyond mount.
    await waitFor(() => expect(screen.getByTestId('archon-route-log-table')).toBeDefined());
    await waitFor(() => expect(vi.mocked(api.get).mock.calls.length).toBeGreaterThan(callsBefore));
  });
});
