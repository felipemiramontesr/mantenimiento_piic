import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../../test/testUtils';
import api from '../../../api/client';
import IncidentNode from './IncidentNode';

vi.mock('../../../api/client', () => ({ default: { get: vi.fn() } }));
vi.mock('react-router-dom', async (): Promise<unknown> => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useParams: () => ({ uuid: 'aaaa-1111-bbbb-2222' }) };
});

const INCIDENT_FIXTURE = {
  id: 7,
  route_uuid: 'route-uuid-xyz',
  category: 'MECANICA',
  description: 'Falla en sistema de frenos',
  severity: 'CRITICAL',
  evidence_image: null,
  status: 'OPEN',
  reported_at: '2026-06-01T10:00:00.000Z',
  unit_id: 'ASM-001',
  route_start: '2026-06-01T08:00:00.000Z',
  route_end: null,
  destination: 'Mina Norte',
  driver_id: 4,
  driver_name: 'Juan Pérez',
  unit_marca: 'Nissan',
  unit_modelo: 'Frontier',
  unit_year: 2022,
};

describe('IncidentNode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, data: INCIDENT_FIXTURE } });
  });

  it('renders incident header with severity and status badges', async () => {
    render(<IncidentNode />);
    await waitFor(() => expect(screen.getAllByText('Crítico').length).toBeGreaterThan(0));
    expect(screen.getAllByText('Abierto').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Mecánica').length).toBeGreaterThan(0);
  });

  it('renders incident description', async () => {
    render(<IncidentNode />);
    await waitFor(() =>
      expect(screen.getAllByText('Falla en sistema de frenos').length).toBeGreaterThan(0)
    );
  });

  it('shows unit link pointing to fleet node', async () => {
    render(<IncidentNode />);
    await waitFor(() =>
      expect(screen.getAllByText('Falla en sistema de frenos').length).toBeGreaterThan(0)
    );
    const unitLinks = screen
      .getAllByRole('link')
      .filter((l) => l.getAttribute('href') === '/dashboard/fleet/ASM-001');
    expect(unitLinks.length).toBeGreaterThan(0);
  });

  it('shows route cross-link with correct uuid', async () => {
    render(<IncidentNode />);
    await waitFor(() =>
      expect(screen.getAllByText('Falla en sistema de frenos').length).toBeGreaterThan(0)
    );
    // route_uuid.slice(0,8).toUpperCase() = 'ROUTE-UU'
    const routeLink = screen
      .getAllByRole('link')
      .find((l) => l.getAttribute('href') === '/dashboard/routes/route-uuid-xyz');
    expect(routeLink).toBeDefined();
  });

  it('calls API with uuid param from route', () => {
    render(<IncidentNode />);
    expect(vi.mocked(api.get)).toHaveBeenCalledWith('/incidents/aaaa-1111-bbbb-2222/node');
  });

  it('shows error state when API fails', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('Network error'));
    render(<IncidentNode />);
    expect(await screen.findByText(/No se pudo cargar el incidente/i)).toBeInTheDocument();
  });
});
