import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../../test/testUtils';
import api from '../../../api/client';
import RouteNode from './RouteNode';

vi.mock('../../../api/client', () => ({ default: { get: vi.fn() } }));
vi.mock('react-router-dom', async (): Promise<unknown> => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useParams: () => ({ uuid: 'route-uuid-001' }) };
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

  it('calls API with uuid param from route', () => {
    render(<RouteNode />);
    expect(vi.mocked(api.get)).toHaveBeenCalledWith('/routes/route-uuid-001/node');
  });

  it('shows error state when API fails', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('Network error'));
    render(<RouteNode />);
    expect(await screen.findByText(/No se pudo cargar la ruta/i)).toBeInTheDocument();
  });
});
