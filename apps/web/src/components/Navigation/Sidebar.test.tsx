import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter, useNavigate } from 'react-router-dom';
import api from '../../api/client';
import Sidebar from './Sidebar';

const logoutMock = vi.hoisted(() => vi.fn());
const useAuthMock = vi.hoisted(() => vi.fn());
const usePermissionsMock = vi.hoisted(() => vi.fn());
const setIsMobileMenuOpenMock = vi.hoisted(() => vi.fn());
const useSovereignLayoutMock = vi.hoisted(() => vi.fn());
const mockLocation = vi.hoisted(() => ({ pathname: '/dashboard/fleet' }));
const useAlertsCountMock = vi.hoisted(() => vi.fn());

vi.mock('../../hooks/useAlertsCount', () => ({
  default: useAlertsCountMock,
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('react-router-dom');
  return {
    ...actual,
    useNavigate: vi.fn(),
    useLocation: (): { pathname: string } => ({ pathname: mockLocation.pathname }),
  };
});

vi.mock('../../hooks/usePermissions', () => ({
  default: usePermissionsMock,
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: useAuthMock,
}));

vi.mock('../../context/SovereignLayoutContext', () => ({
  useSovereignLayout: useSovereignLayoutMock,
}));

const defaultPermissions = {
  hasPermission: (): boolean => true,
  hasAnyPermission: (): boolean => true,
  isOmnipotent: (): boolean => true,
  isExternalClientOnly: (): boolean => false,
};

const defaultAuth = {
  currentUser: { username: 'Soberano', imageUrl: null },
  logout: logoutMock,
};

const defaultLayout = {
  isMobileMenuOpen: false,
  setIsMobileMenuOpen: setIsMobileMenuOpenMock,
};

describe('Sidebar Component (Archon Core)', () => {
  const navigateMock = vi.fn();

  beforeEach(() => {
    mockLocation.pathname = '/dashboard/fleet';
    vi.clearAllMocks();
    (useNavigate as unknown as ReturnType<typeof vi.fn>).mockReturnValue(navigateMock);
    usePermissionsMock.mockReturnValue(defaultPermissions);
    useAuthMock.mockReturnValue(defaultAuth);
    useSovereignLayoutMock.mockReturnValue(defaultLayout);
    useAlertsCountMock.mockReturnValue({ count: 0, isLoading: false });
  });

  it('renders all navigation items properly and avoids redundancy', () => {
    render(
      <BrowserRouter>
        <Sidebar isCollapsed={false} onToggle={vi.fn()} />
      </BrowserRouter>
    );

    expect(screen.getByText(/Soberano/i)).toBeDefined();
    expect(screen.getByText('Comando')).toBeDefined();
    expect(screen.getByText('Unidades')).toBeDefined();
    expect(screen.getByText('Rutas')).toBeDefined();
    expect(screen.getByText('Incidencias')).toBeDefined();
    expect(screen.getByText('Seguridad')).toBeDefined();
    expect(screen.getByText('Personal')).toBeDefined();
    expect(screen.getByText('Panel de Control')).toBeDefined();
  });

  it('Owner-Scoped F1-A: Cliente Externo (fleet:view + fleet:scoped) solo ve Unidades', () => {
    const clientPerms = ['fleet:view', 'fleet:scoped'];
    usePermissionsMock.mockReturnValue({
      hasPermission: (p: string): boolean => clientPerms.includes(p),
      hasAnyPermission: (ps: string[]): boolean => ps.some((p) => clientPerms.includes(p)),
      isOmnipotent: (): boolean => false,
      isExternalClientOnly: (): boolean => true,
    });

    render(
      <BrowserRouter>
        <Sidebar isCollapsed={false} onToggle={vi.fn()} />
      </BrowserRouter>
    );

    expect(screen.getByText('Unidades')).toBeDefined();
    expect(screen.queryByText('Comando')).toBeNull();
    expect(screen.queryByText('Rutas')).toBeNull();
    expect(screen.queryByText('Alertas')).toBeNull();
    expect(screen.queryByText('Finanzas')).toBeNull();
    expect(screen.queryByText('Incidencias')).toBeNull();
    expect(screen.queryByText('Mantenimiento')).toBeNull();
    expect(screen.queryByText('Personal')).toBeNull();
    expect(screen.queryByText('Seguridad')).toBeNull();
    expect(screen.queryByText('Panel de Control')).toBeNull();
  });

  it('Matriz 095: el item Rutas requiere route:view, no fleet:view', () => {
    const financePerms = ['financial:view', 'fleet:view'];
    usePermissionsMock.mockReturnValue({
      hasPermission: (p: string): boolean => financePerms.includes(p),
      hasAnyPermission: (ps: string[]): boolean => ps.some((p) => financePerms.includes(p)),
      isOmnipotent: (): boolean => false,
      isExternalClientOnly: (): boolean => false,
    });

    render(
      <BrowserRouter>
        <Sidebar isCollapsed={false} onToggle={vi.fn()} />
      </BrowserRouter>
    );

    // Director de Finanzas: fleet:view sin route:view — no debe ver Rutas
    expect(screen.getByText('Unidades')).toBeDefined();
    expect(screen.getByText('Finanzas')).toBeDefined();
    expect(screen.queryByText('Rutas')).toBeNull();
  });

  it('navigates to dashboard items when clicking main nav items', () => {
    render(
      <BrowserRouter>
        <Sidebar isCollapsed={false} onToggle={vi.fn()} />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByText('Comando'));
    expect(navigateMock).toHaveBeenCalledWith('/dashboard');

    fireEvent.click(screen.getByText('Unidades'));
    expect(navigateMock).toHaveBeenCalledWith('/dashboard/fleet');

    fireEvent.click(screen.getByText('Rutas'));
    expect(navigateMock).toHaveBeenCalledWith('/dashboard/routes');

    fireEvent.click(screen.getByText('Personal'));
    expect(navigateMock).toHaveBeenCalledWith('/dashboard/users');
  });

  it('navigates to incidents module when clicking Incidencias nav item', () => {
    render(
      <BrowserRouter>
        <Sidebar isCollapsed={false} onToggle={vi.fn()} />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByText('Incidencias'));
    expect(navigateMock).toHaveBeenCalledWith('/dashboard/incidents');
  });

  it('navigates to settings when clicking the profile button', () => {
    render(
      <BrowserRouter>
        <Sidebar isCollapsed={false} onToggle={vi.fn()} />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByTestId('nav-item-settings'));
    expect(navigateMock).toHaveBeenCalledWith('/dashboard/settings');
  });

  it('navigates to admin panel when clicking the admin footer button', () => {
    render(
      <BrowserRouter>
        <Sidebar isCollapsed={false} onToggle={vi.fn()} />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByTestId('nav-item-admin'));
    expect(navigateMock).toHaveBeenCalledWith('/dashboard/admin');
  });

  it('calls logout when clicking Cerrar Sesión', () => {
    render(
      <BrowserRouter>
        <Sidebar isCollapsed={false} onToggle={vi.fn()} />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByTestId('nav-item-logout'));
    expect(logoutMock).toHaveBeenCalledOnce();
  });

  it('renders collapsed state — nav labels hidden, icons still present', () => {
    render(
      <BrowserRouter>
        <Sidebar isCollapsed={true} onToggle={vi.fn()} />
      </BrowserRouter>
    );
    expect(screen.queryByText('Comando')).toBeNull();
    expect(screen.queryByText('Incidencias')).toBeNull();
    expect(screen.queryByText('Personal')).toBeNull();
  });

  it('toggle button calls onToggle when collapsed', () => {
    const onToggle = vi.fn();
    render(
      <BrowserRouter>
        <Sidebar isCollapsed={true} onToggle={onToggle} />
      </BrowserRouter>
    );
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]);
    expect(onToggle).toHaveBeenCalledOnce();
  });

  it('renders user profile image when imageUrl is a full URL', () => {
    useAuthMock.mockReturnValue({
      currentUser: { username: 'GrayMan', imageUrl: 'https://cdn.example.com/avatar.jpg' },
      logout: logoutMock,
    });

    render(
      <BrowserRouter>
        <Sidebar isCollapsed={false} onToggle={vi.fn()} />
      </BrowserRouter>
    );

    const img = screen.getByAltText('Profile');
    expect(img.getAttribute('src')).toBe('https://cdn.example.com/avatar.jpg');
  });

  it('renders user profile image when imageUrl is a relative path', () => {
    useAuthMock.mockReturnValue({
      currentUser: { username: 'GrayMan', imageUrl: '/uploads/avatar.jpg' },
      logout: logoutMock,
    });

    render(
      <BrowserRouter>
        <Sidebar isCollapsed={false} onToggle={vi.fn()} />
      </BrowserRouter>
    );

    const img = screen.getByAltText('Profile');
    expect(img.getAttribute('src')).toContain('/uploads/avatar.jpg');
  });

  it('img onError replaces src with empty string', () => {
    useAuthMock.mockReturnValue({
      currentUser: { username: 'GrayMan', imageUrl: 'https://cdn.example.com/avatar.jpg' },
      logout: logoutMock,
    });

    render(
      <BrowserRouter>
        <Sidebar isCollapsed={false} onToggle={vi.fn()} />
      </BrowserRouter>
    );

    const img = screen.getByAltText('Profile') as HTMLImageElement;
    fireEvent.error(img);
    expect(img.src).toBe('http://localhost:3000/');
  });

  it('does not render admin/logout buttons when user is not omnipotent', () => {
    usePermissionsMock.mockReturnValue({
      hasPermission: (): boolean => true,
      hasAnyPermission: (): boolean => true,
      isOmnipotent: (): boolean => false,
      isExternalClientOnly: (): boolean => false,
    });

    render(
      <BrowserRouter>
        <Sidebar isCollapsed={false} onToggle={vi.fn()} />
      </BrowserRouter>
    );

    expect(screen.queryByTestId('nav-item-admin')).toBeNull();
    expect(screen.queryByTestId('nav-item-logout')).toBeNull();
  });

  it('hides permission-gated nav items when all permissions are denied', () => {
    usePermissionsMock.mockReturnValue({
      hasPermission: (): boolean => false,
      hasAnyPermission: (): boolean => false,
      isOmnipotent: (): boolean => false,
      isExternalClientOnly: (): boolean => false,
    });

    render(
      <BrowserRouter>
        <Sidebar isCollapsed={false} onToggle={vi.fn()} />
      </BrowserRouter>
    );

    expect(screen.queryByText('Finanzas')).toBeNull();
    expect(screen.queryByText('Unidades')).toBeNull();
    expect(screen.queryByText('Mantenimiento')).toBeNull();
    expect(screen.queryByText('Personal')).toBeNull();
  });

  it('renders mobile overlay when isMobileMenuOpen is true', () => {
    useSovereignLayoutMock.mockReturnValue({
      isMobileMenuOpen: true,
      setIsMobileMenuOpen: setIsMobileMenuOpenMock,
    });

    const { container } = render(
      <BrowserRouter>
        <Sidebar isCollapsed={false} onToggle={vi.fn()} />
      </BrowserRouter>
    );

    const overlay = container.querySelector('.bg-black\\/60');
    expect(overlay).toBeTruthy();
  });

  it('clicking mobile overlay calls setIsMobileMenuOpen(false)', () => {
    useSovereignLayoutMock.mockReturnValue({
      isMobileMenuOpen: true,
      setIsMobileMenuOpen: setIsMobileMenuOpenMock,
    });

    const { container } = render(
      <BrowserRouter>
        <Sidebar isCollapsed={false} onToggle={vi.fn()} />
      </BrowserRouter>
    );

    const overlay = container.querySelector('.bg-black\\/60') as HTMLElement;
    fireEvent.click(overlay);
    expect(setIsMobileMenuOpenMock).toHaveBeenCalledWith(false);
  });

  it('NavItem calls setIsMobileMenuOpen(false) on navigation', () => {
    render(
      <BrowserRouter>
        <Sidebar isCollapsed={false} onToggle={vi.fn()} />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByText('Comando'));
    expect(setIsMobileMenuOpenMock).toHaveBeenCalledWith(false);
  });

  it('admin button uses bg-white style when pathname is /dashboard/admin', () => {
    mockLocation.pathname = '/dashboard/admin';
    render(
      <BrowserRouter>
        <Sidebar isCollapsed={false} onToggle={vi.fn()} />
      </BrowserRouter>
    );
    const adminBtn = screen.getByTestId('nav-item-admin');
    expect(adminBtn.className).toContain('bg-white');
  });

  it('renders Soberano fallback when currentUser has no username', () => {
    useAuthMock.mockReturnValue({
      currentUser: { username: null, imageUrl: null },
      logout: logoutMock,
    });
    render(
      <BrowserRouter>
        <Sidebar isCollapsed={false} onToggle={vi.fn()} />
      </BrowserRouter>
    );
    expect(screen.getByText('Soberano')).toBeInTheDocument();
  });

  it('resolveImageUrl uses empty string when api.defaults.baseURL is not set', () => {
    const savedBaseURL = api.defaults.baseURL;
    api.defaults.baseURL = '';
    useAuthMock.mockReturnValue({
      currentUser: { username: 'GrayMan', imageUrl: '/uploads/avatar.jpg' },
      logout: logoutMock,
    });
    render(
      <BrowserRouter>
        <Sidebar isCollapsed={false} onToggle={vi.fn()} />
      </BrowserRouter>
    );
    const img = screen.getByAltText('Profile') as HTMLImageElement;
    // baseURL = '' → '' || '' = '' → baseUrl = '' → src = '/uploads/avatar.jpg'
    expect(img.getAttribute('src')).toBe('/uploads/avatar.jpg');
    api.defaults.baseURL = savedBaseURL;
  });

  it('resolveImageUrl inserts slash separator for relative URL without leading slash', () => {
    useAuthMock.mockReturnValue({
      currentUser: { username: 'GrayMan', imageUrl: 'uploads/avatar.jpg' },
      logout: logoutMock,
    });
    render(
      <BrowserRouter>
        <Sidebar isCollapsed={false} onToggle={vi.fn()} />
      </BrowserRouter>
    );
    const img = screen.getByAltText('Profile') as HTMLImageElement;
    // The src should contain the path with a slash inserted before 'uploads'
    expect(img.getAttribute('src')).toContain('uploads/avatar.jpg');
  });

  it('shows numeric badge on Alertas when count > 0 (expanded)', () => {
    useAlertsCountMock.mockReturnValue({ count: 5, isLoading: false });
    render(
      <BrowserRouter>
        <Sidebar isCollapsed={false} onToggle={vi.fn()} />
      </BrowserRouter>
    );
    expect(screen.getByTestId('alerts-badge').textContent).toBe('5');
  });

  it('hides badge when count is 0', () => {
    useAlertsCountMock.mockReturnValue({ count: 0, isLoading: false });
    render(
      <BrowserRouter>
        <Sidebar isCollapsed={false} onToggle={vi.fn()} />
      </BrowserRouter>
    );
    expect(screen.queryByTestId('alerts-badge')).toBeNull();
  });

  it('shows 99+ cap when count exceeds 99', () => {
    useAlertsCountMock.mockReturnValue({ count: 150, isLoading: false });
    render(
      <BrowserRouter>
        <Sidebar isCollapsed={false} onToggle={vi.fn()} />
      </BrowserRouter>
    );
    expect(screen.getByTestId('alerts-badge').textContent).toBe('99+');
  });
});
