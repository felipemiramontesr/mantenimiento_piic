import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../../test/testUtils';
import api from '../../../api/client';
import { useCheckpoints } from '../../../hooks/useCheckpoints';
import RouteNode from './RouteNode';

vi.mock('../../../api/client', () => ({ default: { get: vi.fn() } }));
vi.mock('../../../hooks/useCheckpoints', () => ({
  useCheckpoints: vi.fn(() => ({ data: [], loading: false, error: null })),
}));
const mockParams = vi.hoisted(() => ({ uuid: 'route-uuid-001' as string | undefined }));

vi.mock('react-router-dom', async (): Promise<unknown> => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useParams: () => ({ uuid: mockParams.uuid }) };
});

const ROUTE_FIXTURE = {
  route: {
    id: 10,
    uuid: 'route-uuid-001',
    unit_id: 'ASM-002',
    status: 'COMPLETED',
    start_reading: 50000,
    end_reading: 50250,
    start_at: '2026-06-01T08:00:00.000Z',
    end_at: '2026-06-01T16:00:00.000Z',
    fuel_level_start: 80,
    fuel_level_end: 45,
    fuel_liters_loaded: null,
    fuel_amount: null,
    fuel_ticket_image: null,
    additives_check: 0,
    tire_pressure_json: null,
    checklist_json: null,
    description: 'Ruta a Mina Norte',
    created_at: '2026-06-01T07:45:00.000Z',
    driver_id: 5,
    destination: 'Mina Norte',
    driver_name: 'Carlos Ruiz',
    driver_role: 'Operador de Unidad',
    unit_marca: 'Nissan',
    unit_modelo: 'Frontier',
    unit_year: 2021,
  },
  incidents: [
    {
      id: 3,
      uuid: 'inc-uuid-abc-123',
      category: 'MECANICA',
      description: 'Falla menor en suspensión',
      severity: 'LOW',
      status: 'RESOLVED',
      reported_at: '2026-06-01T12:00:00.000Z',
    },
  ],
};

describe('RouteNode', () => {
  beforeEach(() => {
    mockParams.uuid = 'route-uuid-001';
    vi.clearAllMocks();
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, data: ROUTE_FIXTURE } });
  });

  it('renders route header with destination and driver', async () => {
    render(<RouteNode />);
    await waitFor(() => expect(screen.getAllByText('Mina Norte').length).toBeGreaterThan(0));
    expect(screen.getAllByText(/Carlos Ruiz/).length).toBeGreaterThan(0);
  });

  it('renders km recorridos correctly', async () => {
    render(<RouteNode />);
    await waitFor(() => expect(screen.getByText('250 km')).toBeInTheDocument());
  });

  it('renders fuel telemetry', async () => {
    render(<RouteNode />);
    await waitFor(() => expect(screen.getAllByText('Mina Norte').length).toBeGreaterThan(0));
    expect(screen.getByText('80%')).toBeInTheDocument();
    expect(screen.getByText('45%')).toBeInTheDocument();
  });

  it('incident cross-link uses uuid not numeric id', async () => {
    render(<RouteNode />);
    await screen.findByText('Falla menor en suspensión');
    const incidentLink = screen.getByRole('link', { name: /ver nodo/i });
    expect(incidentLink.getAttribute('href')).toBe('/dashboard/incidents/inc-uuid-abc-123');
    expect(incidentLink.getAttribute('href')).not.toContain('/incidents/3');
  });

  it('unit cross-link points to fleet node', async () => {
    render(<RouteNode />);
    await waitFor(() => expect(screen.getAllByText('Mina Norte').length).toBeGreaterThan(0));
    const unitLink = screen.getByRole('link', { name: /ASM-002/i });
    expect(unitLink.getAttribute('href')).toBe('/dashboard/fleet/ASM-002');
  });

  it('renders fuel ticket image when fuel_ticket_image is set', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        success: true,
        data: {
          ...ROUTE_FIXTURE,
          route: {
            ...ROUTE_FIXTURE.route,
            fuel_ticket_image: 'data:image/jpeg;base64,/9j/4AAQ',
          },
        },
      },
    });
    render(<RouteNode />);
    await waitFor(() => expect(screen.getAllByText('Mina Norte').length).toBeGreaterThan(0));
    expect(screen.getByText('Imagen del ticket')).toBeInTheDocument();
  });

  it('renders empty incidents section when incidents list is empty', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        success: true,
        data: { ...ROUTE_FIXTURE, incidents: [] },
      },
    });
    render(<RouteNode />);
    await waitFor(() => expect(screen.getAllByText('Mina Norte').length).toBeGreaterThan(0));
    // No incidents section card when list is empty
    expect(screen.queryByText(/Incidentes \(/)).toBeNull();
  });

  it('calls API with uuid param from route', () => {
    render(<RouteNode />);
    expect(vi.mocked(api.get)).toHaveBeenCalledWith('/routes/route-uuid-001/node');
  });

  it('shows error state when API fails', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('Network error'));
    render(<RouteNode />);
    expect(await screen.findByText(/No se pudo cargar la ruta/i)).toBeInTheDocument();
  });

  it('shows null km when end_reading is null', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        success: true,
        data: {
          ...ROUTE_FIXTURE,
          route: { ...ROUTE_FIXTURE.route, end_reading: null },
        },
      },
    });
    render(<RouteNode />);
    await waitFor(() => expect(screen.getAllByText('Mina Norte').length).toBeGreaterThan(0));
    expect(screen.getByText('Km recorridos')).toBeInTheDocument();
  });

  it('shows null fuel variation when fuel_level_end is null', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        success: true,
        data: {
          ...ROUTE_FIXTURE,
          route: { ...ROUTE_FIXTURE.route, fuel_level_end: null },
        },
      },
    });
    render(<RouteNode />);
    await waitFor(() => expect(screen.getAllByText('Mina Norte').length).toBeGreaterThan(0));
    expect(screen.getByText('Variación nivel')).toBeInTheDocument();
  });

  it('shows open incidents badge when there are OPEN incidents', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        success: true,
        data: {
          ...ROUTE_FIXTURE,
          incidents: [
            { ...ROUTE_FIXTURE.incidents[0], status: 'OPEN' },
            { ...ROUTE_FIXTURE.incidents[0], id: 4, uuid: 'inc-uuid-qqq-444', status: 'OPEN' },
          ],
        },
      },
    });
    render(<RouteNode />);
    await waitFor(() => expect(screen.getAllByText('Mina Norte').length).toBeGreaterThan(0));
    expect(screen.getByText(/2 incidentes/)).toBeInTheDocument();
  });

  it('shows singular incidente badge when exactly one OPEN incident', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        success: true,
        data: {
          ...ROUTE_FIXTURE,
          incidents: [{ ...ROUTE_FIXTURE.incidents[0], status: 'OPEN' }],
        },
      },
    });
    render(<RouteNode />);
    await waitFor(() => expect(screen.getAllByText('Mina Norte').length).toBeGreaterThan(0));
    expect(screen.getByText(/1 incidente/)).toBeInTheDocument();
  });

  it('skips driver name span when driver_name is null', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        success: true,
        data: {
          ...ROUTE_FIXTURE,
          route: { ...ROUTE_FIXTURE.route, driver_name: null },
        },
      },
    });
    render(<RouteNode />);
    await waitFor(() => expect(screen.getAllByText('Mina Norte').length).toBeGreaterThan(0));
    expect(screen.queryByText(/Operador:/)).toBeNull();
  });

  it('skips unit marca in header when unit_marca is null', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        success: true,
        data: {
          ...ROUTE_FIXTURE,
          route: { ...ROUTE_FIXTURE.route, unit_marca: null },
        },
      },
    });
    render(<RouteNode />);
    await waitFor(() => expect(screen.getAllByText('Mina Norte').length).toBeGreaterThan(0));
    expect(screen.queryByText(/Nissan/)).toBeNull();
  });

  it('shows aditivos Sí when additives_check is 1', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        success: true,
        data: {
          ...ROUTE_FIXTURE,
          route: { ...ROUTE_FIXTURE.route, additives_check: 1 },
        },
      },
    });
    render(<RouteNode />);
    await waitFor(() => expect(screen.getAllByText('Mina Norte').length).toBeGreaterThan(0));
    expect(screen.getByText('Sí')).toBeInTheDocument();
  });

  it('renders fuel loaded and amount when set', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        success: true,
        data: {
          ...ROUTE_FIXTURE,
          route: {
            ...ROUTE_FIXTURE.route,
            fuel_liters_loaded: 55.5,
            fuel_amount: 1200,
          },
        },
      },
    });
    render(<RouteNode />);
    await waitFor(() => expect(screen.getAllByText('Mina Norte').length).toBeGreaterThan(0));
    expect(screen.getByText('55.5 L')).toBeInTheDocument();
    expect(screen.getByText('$1,200')).toBeInTheDocument();
  });

  it('renders description InfoRow when route.description is set', async () => {
    render(<RouteNode />);
    await waitFor(() => expect(screen.getAllByText('Mina Norte').length).toBeGreaterThan(0));
    expect(screen.getByText('Ruta a Mina Norte')).toBeInTheDocument();
  });

  it('renders unknown movement status as raw value', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        success: true,
        data: {
          ...ROUTE_FIXTURE,
          route: { ...ROUTE_FIXTURE.route, status: 'UNKNOWN_STATUS' },
        },
      },
    });
    render(<RouteNode />);
    await waitFor(() => expect(screen.getAllByText('Mina Norte').length).toBeGreaterThan(0));
    expect(screen.getAllByText('UNKNOWN_STATUS').length).toBeGreaterThan(0);
  });

  it('renders loading state when uuid is undefined, api not called', () => {
    mockParams.uuid = undefined;
    render(<RouteNode />);
    expect(screen.getByText('Cargando…')).toBeInTheDocument();
    expect(vi.mocked(api.get)).not.toHaveBeenCalled();
  });

  // ── FC-4 Fase 4C: Checkpoint visualization (CHK-VIEW-1..3) ──────────────────
  describe('Checkpoint Visualization (FC-4 Fase 4C)', () => {
    const CHECKPOINTS_FIXTURE = [
      {
        id: 1,
        movement_id: 10,
        sequence: 1,
        name: 'Punto Norte',
        neighborhood_id: null,
        eta: null,
        arrived_at: '2026-06-01T10:00:00.000Z',
        status: 'VISITED' as const,
        created_at: '2026-06-01T07:00:00.000Z',
      },
      {
        id: 2,
        movement_id: 10,
        sequence: 2,
        name: 'Mina Sur',
        neighborhood_id: 42,
        eta: '2026-06-01T12:00:00.000Z',
        arrived_at: null,
        status: 'PENDING' as const,
        created_at: '2026-06-01T07:00:00.000Z',
      },
    ];

    it('CHK-VIEW-1: renders checkpoints section with progress counter when checkpoints exist', async () => {
      vi.mocked(useCheckpoints).mockReturnValue({
        data: CHECKPOINTS_FIXTURE,
        loading: false,
        error: null,
      });
      render(<RouteNode />);
      await waitFor(() => expect(screen.getAllByText('Mina Norte').length).toBeGreaterThan(0));
      expect(screen.getByText('Waypoints (1/2)')).toBeInTheDocument();
      expect(screen.getByText('Punto Norte')).toBeInTheDocument();
      expect(screen.getByText('Mina Sur')).toBeInTheDocument();
    });

    it('CHK-VIEW-2: hides checkpoints section when array is empty', async () => {
      vi.mocked(useCheckpoints).mockReturnValue({ data: [], loading: false, error: null });
      render(<RouteNode />);
      await waitFor(() => expect(screen.getAllByText('Mina Norte').length).toBeGreaterThan(0));
      expect(screen.queryByText(/Waypoints/)).toBeNull();
    });

    it('CHK-VIEW-3: VISITED badge is emerald, PENDING badge is slate', async () => {
      vi.mocked(useCheckpoints).mockReturnValue({
        data: CHECKPOINTS_FIXTURE,
        loading: false,
        error: null,
      });
      render(<RouteNode />);
      await waitFor(() => expect(screen.getByText('Waypoints (1/2)')).toBeInTheDocument());
      const visitedBadge = screen.getByText('Visitado');
      const pendingBadge = screen.getByText('Pendiente');
      expect(visitedBadge.className).toContain('emerald');
      expect(pendingBadge.className).toContain('slate');
    });
  });

  it('renders unknown incident severity and category as raw values in incident list', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        success: true,
        data: {
          ...ROUTE_FIXTURE,
          incidents: [
            {
              ...ROUTE_FIXTURE.incidents[0],
              severity: 'CATASTROPHIC',
              category: 'DESCONOCIDO',
            },
          ],
        },
      },
    });
    render(<RouteNode />);
    await waitFor(() => expect(screen.getAllByText('Mina Norte').length).toBeGreaterThan(0));
    expect(screen.getAllByText('CATASTROPHIC').length).toBeGreaterThan(0);
    expect(screen.getAllByText('DESCONOCIDO').length).toBeGreaterThan(0);
  });
});
