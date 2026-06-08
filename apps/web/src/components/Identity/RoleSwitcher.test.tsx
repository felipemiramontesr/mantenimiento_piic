import { describe, it, expect, vi, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { render, screen, fireEvent, waitFor } from '../../test/testUtils';
import server from '../../test/server';
import RoleSwitcher from './RoleSwitcher';
import { useAuth } from '../../context/AuthContext';

vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn(),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  AuthProvider: ({ children }: { children: any }): any => children,
}));

const ROLES_RESPONSE = {
  success: true,
  data: {
    roles: [
      { id: 2, name: 'Administrador', permissions: ['fleet:read', 'fleet:write'] },
      { id: 3, name: 'Operador', permissions: ['fleet:read'] },
    ],
    allPermissions: [],
  },
};

const ADMIN_USER = {
  id: '1',
  username: 'grayman',
  roleId: 0,
  roleName: 'Master (Archon)',
  fullName: 'GrayMan',
  email: '',
  department: '',
  employeeNumber: '',
  is_active: true,
  permissions: [],
};

const mockAuth = (
  overrides: Partial<ReturnType<typeof useAuth>> = {}
): ReturnType<typeof useAuth> => {
  const base: ReturnType<typeof useAuth> = {
    currentUser: ADMIN_USER,
    effectiveUser: ADMIN_USER,
    isImpersonating: false,
    isAuthenticated: true,
    login: vi.fn(),
    logout: vi.fn(),
    updateCurrentUser: vi.fn(),
    startImpersonation: vi.fn(),
    stopImpersonation: vi.fn(),
    ...overrides,
  };
  vi.mocked(useAuth).mockReturnValue(base);
  return base;
};

describe('RoleSwitcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    server.use(http.get('*/admin/roles-permissions', () => HttpResponse.json(ROLES_RESPONSE)));
  });

  it('renders null for non-omnipotent users', () => {
    mockAuth({
      currentUser: { ...ADMIN_USER, roleId: 3, roleName: 'Operador', username: 'operator' },
      effectiveUser: { ...ADMIN_USER, roleId: 3, roleName: 'Operador', username: 'operator' },
    });
    render(<RoleSwitcher />);
    expect(screen.queryByText('God Mode')).not.toBeInTheDocument();
  });

  it('renders God Mode button for omnipotent user', async () => {
    mockAuth();
    render(<RoleSwitcher />);
    expect(await screen.findByText('God Mode')).toBeInTheDocument();
  });

  it('opens role dropdown when God Mode button is clicked', async () => {
    mockAuth();
    render(<RoleSwitcher />);
    fireEvent.click(await screen.findByText('God Mode'));
    expect(await screen.findByText('Master (Archon)')).toBeInTheDocument();
    expect(screen.getByText('Administrador')).toBeInTheDocument();
    expect(screen.getByText('Operador')).toBeInTheDocument();
  });

  it('clicking Master (Archon) calls stopImpersonation and not startImpersonation', async () => {
    const auth = mockAuth();
    render(<RoleSwitcher />);
    fireEvent.click(await screen.findByText('God Mode'));
    fireEvent.click(await screen.findByText('Master (Archon)'));
    expect(auth.stopImpersonation).toHaveBeenCalled();
    expect(auth.startImpersonation).not.toHaveBeenCalled();
  });

  it('calls startImpersonation with correct mock user when role is selected', async () => {
    const auth = mockAuth();
    render(<RoleSwitcher />);
    fireEvent.click(await screen.findByText('God Mode'));
    fireEvent.click(await screen.findByText('Operador'));
    expect(auth.startImpersonation).toHaveBeenCalledWith(
      expect.objectContaining({ roleId: 3, roleName: 'Operador', permissions: ['fleet:read'] })
    );
  });

  it('closes dropdown after selecting a role', async () => {
    mockAuth();
    render(<RoleSwitcher />);
    fireEvent.click(await screen.findByText('God Mode'));
    await screen.findByText('Administrador');
    fireEvent.click(screen.getByText('Administrador'));
    await waitFor(() => {
      expect(screen.queryByText('Operador')).not.toBeInTheDocument();
    });
  });

  it('shows impersonation badge and Salir button when isImpersonating', async () => {
    const impersonatedUser = {
      ...ADMIN_USER,
      roleId: 3,
      roleName: 'Operador',
      username: '[Operador]',
    };
    mockAuth({ isImpersonating: true, effectiveUser: impersonatedUser });
    render(<RoleSwitcher />);
    expect(await screen.findByText(/Viendo como Operador/)).toBeInTheDocument();
    expect(screen.getByText('Salir')).toBeInTheDocument();
    expect(screen.queryByText('God Mode')).not.toBeInTheDocument();
  });

  it('calls stopImpersonation when Salir is clicked', async () => {
    const impersonatedUser = {
      ...ADMIN_USER,
      roleId: 3,
      roleName: 'Operador',
      username: '[Operador]',
    };
    const auth = mockAuth({ isImpersonating: true, effectiveUser: impersonatedUser });
    render(<RoleSwitcher />);
    fireEvent.click(await screen.findByText('Salir'));
    expect(auth.stopImpersonation).toHaveBeenCalled();
  });

  it('shows empty state message when roles fetch returns empty list', async () => {
    server.use(
      http.get('*/admin/roles-permissions', () =>
        HttpResponse.json({ success: true, data: { roles: [], allPermissions: [] } })
      )
    );
    mockAuth();
    render(<RoleSwitcher />);
    fireEvent.click(await screen.findByText('God Mode'));
    expect(await screen.findByText('Sin roles disponibles')).toBeInTheDocument();
  });
});
