import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../../test/testUtils';
import api from '../../../api/client';
import UserNode from './UserNode';

vi.mock('../../../api/client', () => ({ default: { get: vi.fn() } }));
vi.mock('react-router-dom', async (): Promise<unknown> => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useParams: () => ({ uuid: 'uuid-admin-0001' }) };
});

const USER_FIXTURE = {
  user: {
    id: 4,
    uuid: 'uuid-admin-0001',
    username: 'grayman',
    full_name: 'Felipe Miramontes',
    email: 'admin@piic.com',
    role_id: 0,
    role_name: 'Archon',
    department_name: 'IT',
    employee_number: 'EMP-001',
    is_active: 1,
    last_login: '2026-06-04T10:00:00.000Z',
    created_at: '2026-01-01T00:00:00.000Z',
    profile_picture_url: null,
  },
  permissions: [
    { slug: 'fleet:view', description: 'Ver flota' },
    { slug: 'maint:write', description: 'Crear órdenes' },
  ],
  recentRoutes: [
    {
      uuid: 'route-uuid-001',
      unit_id: 'ASM-001',
      destination: 'Mina Norte',
      status: 'COMPLETED',
      start_at: '2026-05-30T08:00:00.000Z',
      end_at: '2026-05-30T18:00:00.000Z',
    },
  ],
};

describe('UserNode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, data: USER_FIXTURE } });
  });

  it('renders user full name and username', async () => {
    render(<UserNode />);
    await waitFor(() => expect(screen.getAllByText('Felipe Miramontes').length).toBeGreaterThan(0));
    expect(screen.getAllByText('@grayman').length).toBeGreaterThan(0);
  });

  it('renders role and active status badge', async () => {
    render(<UserNode />);
    await waitFor(() => expect(screen.getAllByText('Archon').length).toBeGreaterThan(0));
    expect(screen.getAllByText('Activo').length).toBeGreaterThan(0);
  });

  it('renders permissions list', async () => {
    render(<UserNode />);
    expect(await screen.findByText('fleet:view')).toBeInTheDocument();
    expect(screen.getByText('maint:write')).toBeInTheDocument();
  });

  it('renders recent route with cross-link', async () => {
    render(<UserNode />);
    await waitFor(() => expect(screen.getAllByText('Felipe Miramontes').length).toBeGreaterThan(0));
    const routeLink = screen.getByRole('link', { name: /ver nodo/i });
    expect(routeLink.getAttribute('href')).toBe('/dashboard/routes/route-uuid-001');
  });

  it('calls API with uuid param from route', () => {
    render(<UserNode />);
    expect(vi.mocked(api.get)).toHaveBeenCalledWith('/auth/users/uuid-admin-0001/node');
  });

  it('shows error state when API fails', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('Network error'));
    render(<UserNode />);
    expect(await screen.findByText(/No se pudo cargar el perfil/i)).toBeInTheDocument();
  });
});
