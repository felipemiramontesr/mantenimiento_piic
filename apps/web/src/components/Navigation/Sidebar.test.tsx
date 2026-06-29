import { render, screen, fireEvent, act } from '@testing-library/react';
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
  isSuiteVIM: (): boolean => false,
  isFamiliar: (): boolean => false,
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
    expect(screen.getByText('CRM')).toBeDefined();
    expect(screen.getByText('Rutas')).toBeDefined();
    expect(screen.getByText('Incidencias')).toBeDefined();
    expect(screen.getByText('Seguridad')).toBeDefined();
    expect(screen.getByText('Personal')).toBeDefined();
    expect(screen.getByText('Onboarding')).toBeDefined();
    expect(screen.getByText('Panel de Control')).toBeDefined();
  });

  it('Owner-Scoped F1-A: Cliente Externo (role 9 — portal perms) solo ve Portal, no Unidades', () => {
    const clientPerms = [
      'portal:dashboard:view',
      'portal:fleet:view:own',
      'portal:report:download',
      'notifications:view:own',
    ];
    usePermissionsMock.mockReturnValue({
      hasPermission: (p: string): boolean => clientPerms.includes(p),
      hasAnyPermission: (ps: string[]): boolean => ps.some((p) => clientPerms.includes(p)),
      isOmnipotent: (): boolean => false,
      isExternalClientOnly: (): boolean => true,
      isSuiteVIM: (): boolean => false,
      isFamiliar: (): boolean => false,
    });

    render(
      <BrowserRouter>
        <Sidebar isCollapsed={false} onToggle={vi.fn()} />
      </BrowserRouter>
    );

    expect(screen.getByText('Portal')).toBeDefined();
    expect(screen.queryByText('Unidades')).toBeNull(); // role 9 accede a flota vía Portal, no módulo Unidades
    expect(screen.queryByText('CRM')).toBeNull();
    expect(screen.queryByText('Comando')).toBeNull();
    expect(screen.queryByText('Rutas')).toBeNull();
    expect(screen.queryByText('Alertas')).toBeNull();
    expect(screen.queryByText('Finanzas')).toBeNull();
    expect(screen.queryByText('Incidencias')).toBeNull();
    expect(screen.queryByText('Mantenimiento')).toBeNull();
    expect(screen.queryByText('Personal')).toBeNull();
    expect(screen.queryByText('Seguridad')).toBeNull();
    expect(screen.queryByText('Panel de Control')).toBeNull();
    expect(screen.getByTestId('nav-item-logout')).toBeInTheDocument();
  });

  it('Matriz 095 FC-18: el item Rutas requiere route:record:view:any, no fleet:unit:view:any', () => {
    const directorPerms = ['finance:dashboard:view:any', 'fleet:unit:view:any'];
    usePermissionsMock.mockReturnValue({
      hasPermission: (p: string): boolean => directorPerms.includes(p),
      hasAnyPermission: (ps: string[]): boolean => ps.some((p) => directorPerms.includes(p)),
      isOmnipotent: (): boolean => false,
      isExternalClientOnly: (): boolean => false,
      isSuiteVIM: (): boolean => false,
      isFamiliar: (): boolean => false,
    });

    render(
      <BrowserRouter>
        <Sidebar isCollapsed={false} onToggle={vi.fn()} />
      </BrowserRouter>
    );

    // Director de Finanzas: finance:dashboard:view:any + fleet:unit:view:any sin route:record:view — no debe ver Rutas
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

  it('renders collapsed state — labels in DOM but invisible (opacity-0 w-0), icons still present', () => {
    const { container } = render(
      <BrowserRouter>
        <Sidebar isCollapsed={true} onToggle={vi.fn()} />
      </BrowserRouter>
    );
    // FC-20 FaseA: labels always mounted — they exist in DOM but are invisible
    const comandoLabel = screen.getByText('Comando');
    expect(comandoLabel).toBeInTheDocument();
    expect(comandoLabel.className).toContain('opacity-0');
    expect(comandoLabel.className).toContain('w-0');
    expect(comandoLabel.className).toContain('pointer-events-none');
    expect(comandoLabel.getAttribute('aria-hidden')).toBe('true');
    // Icons are still accessible (logout always visible)
    expect(container.querySelector('aside')).not.toBeNull();
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

  it('does not render admin button when user is not omnipotent (logout always visible)', () => {
    usePermissionsMock.mockReturnValue({
      hasPermission: (): boolean => true,
      hasAnyPermission: (): boolean => true,
      isOmnipotent: (): boolean => false,
      isExternalClientOnly: (): boolean => false,
      isSuiteVIM: (): boolean => false,
      isFamiliar: (): boolean => false,
    });

    render(
      <BrowserRouter>
        <Sidebar isCollapsed={false} onToggle={vi.fn()} />
      </BrowserRouter>
    );

    expect(screen.queryByTestId('nav-item-admin')).toBeNull();
    expect(screen.getByTestId('nav-item-logout')).toBeInTheDocument();
  });

  it('hides permission-gated nav items when all permissions are denied', () => {
    usePermissionsMock.mockReturnValue({
      hasPermission: (): boolean => false,
      hasAnyPermission: (): boolean => false,
      isOmnipotent: (): boolean => false,
      isExternalClientOnly: (): boolean => false,
      isSuiteVIM: (): boolean => false,
      isFamiliar: (): boolean => false,
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
    expect(screen.getByTestId('nav-item-logout')).toBeInTheDocument();
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

  describe('logout button invariant — always visible regardless of role', () => {
    const roleMatrix = [
      {
        label: 'Omnipotente (rol 0 — Master Archon)',
        perms: {
          isOmnipotent: true,
          isExternalClientOnly: false,
          isSuiteVIM: false,
          hasPermission: true,
        },
      },
      {
        label: 'Operador General (rol 1 — sin permisos admin)',
        perms: {
          isOmnipotent: false,
          isExternalClientOnly: false,
          isSuiteVIM: false,
          hasPermission: true,
        },
      },
      {
        label: 'Cliente Externo (rol 9 — fleet:scoped only)',
        perms: {
          isOmnipotent: false,
          isExternalClientOnly: true,
          isSuiteVIM: false,
          hasPermission: false,
        },
      },
      {
        label: 'Sin ningún permiso (rol huérfano)',
        perms: {
          isOmnipotent: false,
          isExternalClientOnly: false,
          isSuiteVIM: false,
          hasPermission: false,
        },
      },
    ];

    roleMatrix.forEach(({ label, perms }) => {
      it(`logout visible: ${label}`, () => {
        usePermissionsMock.mockReturnValue({
          hasPermission: (): boolean => perms.hasPermission,
          hasAnyPermission: (): boolean => perms.hasPermission,
          isOmnipotent: (): boolean => perms.isOmnipotent,
          isExternalClientOnly: (): boolean => perms.isExternalClientOnly,
          isSuiteVIM: (): boolean => perms.isSuiteVIM,
          isFamiliar: (): boolean => false,
        });

        render(
          <BrowserRouter>
            <Sidebar isCollapsed={false} onToggle={vi.fn()} />
          </BrowserRouter>
        );

        expect(screen.getByTestId('nav-item-logout')).toBeInTheDocument();
      });
    });

    it('logout visible in collapsed state (icon-only mode)', () => {
      render(
        <BrowserRouter>
          <Sidebar isCollapsed={true} onToggle={vi.fn()} />
        </BrowserRouter>
      );
      expect(screen.getByTestId('nav-item-logout')).toBeInTheDocument();
    });
  });

  describe('FC-11 CRM_Hub_Navigation FaseA — NavItem CRM y Portal', () => {
    it('AT-FC11-A-SB-1: NavItem "CRM" visible para usuario con fleet:view y !isFamiliar()', () => {
      render(
        <BrowserRouter>
          <Sidebar isCollapsed={false} onToggle={vi.fn()} />
        </BrowserRouter>
      );
      expect(screen.getByText('CRM')).toBeInTheDocument();
      expect(screen.queryByText('Directorio CRM')).toBeNull();
    });

    it('AT-FC11-A-SB-2: click en "CRM" navega a /dashboard/crm', () => {
      render(
        <BrowserRouter>
          <Sidebar isCollapsed={false} onToggle={vi.fn()} />
        </BrowserRouter>
      );
      fireEvent.click(screen.getByText('CRM'));
      expect(navigateMock).toHaveBeenCalledWith('/dashboard/crm');
    });

    it('AT-FC11-A-SB-3: usuario con maint:record:view:any (sin fleet) ve "CRM"', () => {
      const tallerPerms = ['maint:record:view:any', 'maint:record:edit:any'];
      usePermissionsMock.mockReturnValue({
        hasPermission: (p: string): boolean => tallerPerms.includes(p),
        hasAnyPermission: (ps: string[]): boolean => ps.some((p) => tallerPerms.includes(p)),
        isOmnipotent: (): boolean => false,
        isExternalClientOnly: (): boolean => false,
        isSuiteVIM: (): boolean => false,
        isFamiliar: (): boolean => false,
      });
      render(
        <BrowserRouter>
          <Sidebar isCollapsed={false} onToggle={vi.fn()} />
        </BrowserRouter>
      );
      expect(screen.getByText('CRM')).toBeInTheDocument();
    });

    it('AT-FC11-A-SB-4: familiar no ve NavItem "CRM"', () => {
      usePermissionsMock.mockReturnValue({
        hasPermission: (): boolean => true,
        hasAnyPermission: (): boolean => true,
        isOmnipotent: (): boolean => false,
        isExternalClientOnly: (): boolean => false,
        isSuiteVIM: (): boolean => false,
        isFamiliar: (): boolean => true,
      });
      render(
        <BrowserRouter>
          <Sidebar isCollapsed={false} onToggle={vi.fn()} />
        </BrowserRouter>
      );
      expect(screen.queryByText('CRM')).toBeNull();
    });

    it('AT-FC11-A-SB-5: ExternalClientOnly ve Portal y no CRM', () => {
      const clientPerms = ['fleet:view', 'fleet:scoped'];
      usePermissionsMock.mockReturnValue({
        hasPermission: (p: string): boolean => clientPerms.includes(p),
        hasAnyPermission: (ps: string[]): boolean => ps.some((p) => clientPerms.includes(p)),
        isOmnipotent: (): boolean => false,
        isExternalClientOnly: (): boolean => true,
        isSuiteVIM: (): boolean => false,
        isFamiliar: (): boolean => false,
      });
      render(
        <BrowserRouter>
          <Sidebar isCollapsed={false} onToggle={vi.fn()} />
        </BrowserRouter>
      );
      expect(screen.getByText('Portal')).toBeInTheDocument();
      expect(screen.queryByText('CRM')).toBeNull();
    });
  });

  describe('FC-18 FaseD-4 — Sidebar NavItems con slugs granulares (AT-FC18-D4-SB)', () => {
    it('AT-FC18-D4-SB-1 — Alertas visible para usuario con alert:view:any', () => {
      usePermissionsMock.mockReturnValue({
        hasPermission: (p: string): boolean => p === 'alert:view:any',
        hasAnyPermission: (ps: string[]): boolean => ps.includes('alert:view:any'),
        isOmnipotent: (): boolean => false,
        isExternalClientOnly: (): boolean => false,
        isSuiteVIM: (): boolean => false,
        isFamiliar: (): boolean => false,
      });
      render(
        <BrowserRouter>
          <Sidebar isCollapsed={false} onToggle={vi.fn()} />
        </BrowserRouter>
      );
      expect(screen.getByText('Alertas')).toBeInTheDocument();
    });

    it('AT-FC18-D4-SB-2 — Personal visible para users:collaborator:view; Seguridad para security:audit:view', () => {
      usePermissionsMock.mockReturnValue({
        hasPermission: (p: string): boolean =>
          ['users:collaborator:view', 'security:audit:view'].includes(p),
        hasAnyPermission: (ps: string[]): boolean =>
          ps.some((p) => ['users:collaborator:view', 'security:audit:view'].includes(p)),
        isOmnipotent: (): boolean => false,
        isExternalClientOnly: (): boolean => false,
        isSuiteVIM: (): boolean => false,
        isFamiliar: (): boolean => false,
      });
      render(
        <BrowserRouter>
          <Sidebar isCollapsed={false} onToggle={vi.fn()} />
        </BrowserRouter>
      );
      expect(screen.getByText('Personal')).toBeInTheDocument();
      expect(screen.getByText('Seguridad')).toBeInTheDocument();
    });

    it('AT-FC18-D4-SB-3 — Personal y Seguridad ocultos para usuario con legado user:admin sin granular slugs', () => {
      usePermissionsMock.mockReturnValue({
        hasPermission: (p: string): boolean => p === 'user:admin',
        hasAnyPermission: (ps: string[]): boolean => ps.includes('user:admin'),
        isOmnipotent: (): boolean => false,
        isExternalClientOnly: (): boolean => false,
        isSuiteVIM: (): boolean => false,
        isFamiliar: (): boolean => false,
      });
      render(
        <BrowserRouter>
          <Sidebar isCollapsed={false} onToggle={vi.fn()} />
        </BrowserRouter>
      );
      expect(screen.queryByText('Personal')).toBeNull();
      expect(screen.queryByText('Seguridad')).toBeNull();
    });
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

  describe('FC-20 Sidebar_Smooth_Transition FaseA — NavItem label always mounted', () => {
    it('AT-FC20-A-SB-1: label siempre en DOM con isCollapsed=true — tiene opacity-0 w-0 pointer-events-none', () => {
      render(
        <BrowserRouter>
          <Sidebar isCollapsed={true} onToggle={vi.fn()} />
        </BrowserRouter>
      );
      const label = screen.getByText('Unidades');
      expect(label).toBeInTheDocument();
      expect(label.className).toContain('opacity-0');
      expect(label.className).toContain('w-0');
      expect(label.className).toContain('pointer-events-none');
      expect(label.getAttribute('aria-hidden')).toBe('true');
    });

    it('AT-FC20-A-SB-2: label visible con isCollapsed=false — tiene opacity-100 y NO w-0', () => {
      render(
        <BrowserRouter>
          <Sidebar isCollapsed={false} onToggle={vi.fn()} />
        </BrowserRouter>
      );
      const label = screen.getByText('Unidades');
      expect(label).toBeInTheDocument();
      expect(label.className).toContain('opacity-100');
      expect(label.className).not.toContain('opacity-0');
      expect(label.className).not.toContain('w-0');
      expect(label.className).not.toContain('pointer-events-none');
      expect(label.getAttribute('aria-hidden')).toBe('false');
    });

    it('AT-FC20-A-SB-3: whitespace-nowrap siempre presente en label (evita salto de línea durante encogimiento)', () => {
      render(
        <BrowserRouter>
          <Sidebar isCollapsed={false} onToggle={vi.fn()} />
        </BrowserRouter>
      );
      const label = screen.getByText('Mantenimiento');
      expect(label.className).toContain('whitespace-nowrap');
    });

    it('AT-FC20-A-SB-4: badge sigue renderizando correctamente en estado expanded', () => {
      useAlertsCountMock.mockReturnValue({ count: 3, isLoading: false });
      render(
        <BrowserRouter>
          <Sidebar isCollapsed={false} onToggle={vi.fn()} />
        </BrowserRouter>
      );
      expect(screen.getByTestId('alerts-badge').textContent).toBe('3');
    });

    it('AT-FC20-A-SB-5: badge sigue renderizando correctamente en estado collapsed', () => {
      useAlertsCountMock.mockReturnValue({ count: 7, isLoading: false });
      render(
        <BrowserRouter>
          <Sidebar isCollapsed={true} onToggle={vi.fn()} />
        </BrowserRouter>
      );
      expect(screen.getByTestId('alerts-badge').textContent).toBe('7');
    });

    it('AT-FC20-B-SB-1: NavItem label tiene overflow-hidden para clip de texto durante transicion', () => {
      render(
        <BrowserRouter>
          <Sidebar isCollapsed={true} onToggle={vi.fn()} />
        </BrowserRouter>
      );
      const comandoLabel = screen.getByText('Comando');
      expect(comandoLabel.className).toContain('overflow-hidden');
    });

    it('AT-FC20-B-SB-2: aside NO tiene transition-all (solo transition-[width,transform])', () => {
      const { container: sidebarContainer2 } = render(
        <BrowserRouter>
          <Sidebar isCollapsed={false} onToggle={vi.fn()} />
        </BrowserRouter>
      );
      const aside = sidebarContainer2.querySelector('aside');
      expect(aside?.className).not.toContain('transition-all');
    });

    it('AT-FC20-B-SB-3: username div siempre en DOM — opacity-0 translate-x cuando collapsed', () => {
      render(
        <BrowserRouter>
          <Sidebar isCollapsed={true} onToggle={vi.fn()} />
        </BrowserRouter>
      );
      const usernameSpan = screen.getByText('Soberano');
      expect(usernameSpan).toBeInTheDocument();
      const div = usernameSpan.parentElement;
      expect(div?.className).toContain('opacity-0');
      expect(div?.className).toContain('-translate-x-2');
      expect(div?.className).toContain('pointer-events-none');
    });

    it('AT-FC20-B-SB-4: username div visible cuando expanded — opacity-100 translate-x-0', () => {
      render(
        <BrowserRouter>
          <Sidebar isCollapsed={false} onToggle={vi.fn()} />
        </BrowserRouter>
      );
      const usernameSpan = screen.getByText('Soberano');
      const div = usernameSpan.parentElement;
      expect(div?.className).toContain('opacity-100');
      expect(div?.className).toContain('translate-x-0');
      expect(div?.className).not.toContain('opacity-0');
    });

    it('AT-FC20-B-SB-5: texto Cerrar Sesion siempre en DOM — opacity-0 cuando collapsed', () => {
      render(
        <BrowserRouter>
          <Sidebar isCollapsed={true} onToggle={vi.fn()} />
        </BrowserRouter>
      );
      const span = screen.getByText('Cerrar Sesión');
      expect(span).toBeInTheDocument();
      const div = span.parentElement;
      expect(div?.className).toContain('opacity-0');
      expect(div?.className).toContain('pointer-events-none');
    });

    it('AT-FC20-B-SB-6: texto Cerrar Sesion visible cuando expanded — opacity-100', () => {
      render(
        <BrowserRouter>
          <Sidebar isCollapsed={false} onToggle={vi.fn()} />
        </BrowserRouter>
      );
      const span = screen.getByText('Cerrar Sesión');
      const div = span.parentElement;
      expect(div?.className).toContain('opacity-100');
      expect(div?.className).not.toContain('opacity-0');
    });

    it('AT-FC20-A-SB-6: NavItem activo conserva border-l-[3px] y bg en ambos estados', () => {
      mockLocation.pathname = '/dashboard/fleet';
      const { container: c1 } = render(
        <BrowserRouter>
          <Sidebar isCollapsed={false} onToggle={vi.fn()} />
        </BrowserRouter>
      );
      const expanded = c1.querySelector('[data-testid="nav-item-unidades"]');
      expect(expanded?.className).toContain('border-pinnacle-yellow');

      const { container: c2 } = render(
        <BrowserRouter>
          <Sidebar isCollapsed={true} onToggle={vi.fn()} />
        </BrowserRouter>
      );
      const collapsed = c2.querySelector('[data-testid="nav-item-unidades"]');
      expect(collapsed?.className).toContain('border-pinnacle-yellow');
    });
  });

  describe('FC-13 Sidebar_Layout_Sovereign FaseA — Fix estructural 105% overflow', () => {
    it('AT-FC13-A-SB-1: nav-item-logout visible independientemente de la cantidad de nav items', () => {
      render(
        <BrowserRouter>
          <Sidebar isCollapsed={false} onToggle={vi.fn()} />
        </BrowserRouter>
      );
      expect(screen.getByTestId('nav-item-logout')).toBeInTheDocument();
      expect(screen.getByText('Cerrar Sesión')).toBeInTheDocument();
    });

    it('AT-FC13-A-SB-2: Panel de Control visible para usuario omnipotente', () => {
      render(
        <BrowserRouter>
          <Sidebar isCollapsed={false} onToggle={vi.fn()} />
        </BrowserRouter>
      );
      expect(screen.getByTestId('nav-item-admin')).toBeInTheDocument();
      expect(screen.getByText('Panel de Control')).toBeInTheDocument();
    });

    it('AT-FC13-A-SB-3: sección nav tiene clase flex-1 (no h-[80%])', () => {
      const { container } = render(
        <BrowserRouter>
          <Sidebar isCollapsed={false} onToggle={vi.fn()} />
        </BrowserRouter>
      );
      const mainEl = container.querySelector('aside main');
      expect(mainEl).not.toBeNull();
      expect(mainEl?.className).toContain('flex-1');
      expect(mainEl?.className).not.toContain('h-[80%]');
    });
  });

  describe('FC-13 Sidebar_Layout_Sovereign FaseB — Ritmo visual simétrico', () => {
    it('AT-FC13-B-SB-1: NavItem usa py-3 (no py-4)', () => {
      const { container } = render(
        <BrowserRouter>
          <Sidebar isCollapsed={false} onToggle={vi.fn()} />
        </BrowserRouter>
      );
      const navItem = container.querySelector('[data-testid="nav-item-comando"]');
      expect(navItem).not.toBeNull();
      expect(navItem?.className).toContain('py-3');
      expect(navItem?.className).not.toContain('py-4');
    });

    it('AT-FC13-B-SB-2: header contiene padding vertical (espacio vertical asimétrico — FC-16)', () => {
      const { container } = render(
        <BrowserRouter>
          <Sidebar isCollapsed={false} onToggle={vi.fn()} />
        </BrowserRouter>
      );
      const headerEl = container.querySelector('aside header');
      expect(headerEl).not.toBeNull();
      expect(headerEl?.className).toContain('pt-3');
    });

    it('AT-FC13-B-SB-3: footer contiene py-3 y px-3 (espejo del header, footer no cambia en FC-14)', () => {
      const { container } = render(
        <BrowserRouter>
          <Sidebar isCollapsed={false} onToggle={vi.fn()} />
        </BrowserRouter>
      );
      const footerEl = container.querySelector('aside footer');
      expect(footerEl).not.toBeNull();
      expect(footerEl?.className).toContain('py-3');
      expect(footerEl?.className).toContain('px-3');
    });
  });

  describe('FC-14 Sidebar_Header_Scroll_Polish FaseA — Header padding reduction', () => {
    it('AT-FC14-A-SB-1: header expanded contiene pt-3 y pb-1.5 y NO py-1.5 (FC-16)', () => {
      const { container } = render(
        <BrowserRouter>
          <Sidebar isCollapsed={false} onToggle={vi.fn()} />
        </BrowserRouter>
      );
      const headerEl = container.querySelector('aside header');
      expect(headerEl).not.toBeNull();
      expect(headerEl?.className).toContain('pt-3');
      expect(headerEl?.className).toContain('pb-1.5');
      expect(headerEl?.className).not.toContain('py-1.5');
    });

    it('AT-FC14-A-SB-2: header collapsed contiene pt-3 y pb-1.5 y NO py-1.5 (FC-16)', () => {
      const { container } = render(
        <BrowserRouter>
          <Sidebar isCollapsed={true} onToggle={vi.fn()} />
        </BrowserRouter>
      );
      const headerEl = container.querySelector('aside header');
      expect(headerEl).not.toBeNull();
      expect(headerEl?.className).toContain('pt-3');
      expect(headerEl?.className).toContain('pb-1.5');
      expect(headerEl?.className).not.toContain('py-1.5');
    });
  });

  describe('FC-16 Sidebar_Header_Spacing_Fix — Header top spacing + fade top reducido', () => {
    it('AT-FC16-SB-1: header expanded contiene pt-3 y NO py-1.5', () => {
      const { container } = render(
        <BrowserRouter>
          <Sidebar isCollapsed={false} onToggle={vi.fn()} />
        </BrowserRouter>
      );
      const headerEl = container.querySelector('aside header');
      expect(headerEl).not.toBeNull();
      expect(headerEl?.className).toContain('pt-3');
      expect(headerEl?.className).not.toContain('py-1.5');
    });

    it('AT-FC16-SB-2: header collapsed contiene pt-3 y NO py-1.5', () => {
      const { container } = render(
        <BrowserRouter>
          <Sidebar isCollapsed={true} onToggle={vi.fn()} />
        </BrowserRouter>
      );
      const headerEl = container.querySelector('aside header');
      expect(headerEl).not.toBeNull();
      expect(headerEl?.className).toContain('pt-3');
      expect(headerEl?.className).not.toContain('py-1.5');
    });
  });

  describe('FC-17 Sidebar_NavItem_ScrollFade_IO — Intersection Observer fade individual', () => {
    type IOCb = (entries: IntersectionObserverEntry[], obs: IntersectionObserver) => void;
    interface ArchonIOGlobals {
      archonMockIOCallbacks: Map<Element, IOCb>;
      ArchonMockIO: { callCount: number; reset(): void };
    }
    const archonGlobal = globalThis as unknown as ArchonIOGlobals;

    it('AT-FC17-B-SB-1: IntersectionObserver está registrado y se invoca al montar el Sidebar', () => {
      archonGlobal.ArchonMockIO.reset();
      render(
        <BrowserRouter>
          <Sidebar isCollapsed={false} onToggle={vi.fn()} />
        </BrowserRouter>
      );
      expect(window.IntersectionObserver).toBeDefined();
      expect(archonGlobal.ArchonMockIO.callCount).toBeGreaterThan(0);
    });

    it('AT-FC17-B-SB-2: NavItem reduce su opacity cuando IO reporta intersectionRatio bajo', () => {
      const { container } = render(
        <BrowserRouter>
          <Sidebar isCollapsed={false} onToggle={vi.fn()} />
        </BrowserRouter>
      );
      const alertasItem = container.querySelector(
        '[data-testid="nav-item-alertas"]'
      ) as HTMLElement;
      expect(alertasItem).not.toBeNull();
      const cb = archonGlobal.archonMockIOCallbacks.get(alertasItem);
      expect(cb).toBeDefined();
      act(() => {
        cb!(
          [
            {
              target: alertasItem,
              isIntersecting: false,
              intersectionRatio: 0.3,
              boundingClientRect: {} as DOMRectReadOnly,
              intersectionRect: {} as DOMRectReadOnly,
              rootBounds: null,
              time: 0,
            } as IntersectionObserverEntry,
          ],
          {} as IntersectionObserver
        );
      });
      expect(alertasItem.style.opacity).toBe('0.3');
    });

    it('AT-FC17-B-SB-3: NavItem recupera opacity completa cuando IO reporta intersectionRatio=1', () => {
      const { container } = render(
        <BrowserRouter>
          <Sidebar isCollapsed={false} onToggle={vi.fn()} />
        </BrowserRouter>
      );
      const alertasItem = container.querySelector(
        '[data-testid="nav-item-alertas"]'
      ) as HTMLElement;
      const cb = archonGlobal.archonMockIOCallbacks.get(alertasItem)!;
      act(() => {
        cb(
          [
            {
              target: alertasItem,
              isIntersecting: false,
              intersectionRatio: 0.2,
              boundingClientRect: {} as DOMRectReadOnly,
              intersectionRect: {} as DOMRectReadOnly,
              rootBounds: null,
              time: 0,
            } as IntersectionObserverEntry,
          ],
          {} as IntersectionObserver
        );
      });
      act(() => {
        cb(
          [
            {
              target: alertasItem,
              isIntersecting: true,
              intersectionRatio: 1,
              boundingClientRect: {} as DOMRectReadOnly,
              intersectionRect: {} as DOMRectReadOnly,
              rootBounds: null,
              time: 0,
            } as IntersectionObserverEntry,
          ],
          {} as IntersectionObserver
        );
      });
      expect(alertasItem.style.opacity).toBe('1');
    });

    it('AT-FC17-B-SB-4: NavItem activo es inmune al fade (opacity=1 aunque IO reporte ratio bajo)', () => {
      mockLocation.pathname = '/dashboard/alerts';
      const { container } = render(
        <BrowserRouter>
          <Sidebar isCollapsed={false} onToggle={vi.fn()} />
        </BrowserRouter>
      );
      mockLocation.pathname = '/dashboard/fleet';
      const alertasItem = container.querySelector(
        '[data-testid="nav-item-alertas"]'
      ) as HTMLElement;
      expect(alertasItem).not.toBeNull();
      const cb = archonGlobal.archonMockIOCallbacks.get(alertasItem)!;
      act(() => {
        cb(
          [
            {
              target: alertasItem,
              isIntersecting: false,
              intersectionRatio: 0.1,
              boundingClientRect: {} as DOMRectReadOnly,
              intersectionRect: {} as DOMRectReadOnly,
              rootBounds: null,
              time: 0,
            } as IntersectionObserverEntry,
          ],
          {} as IntersectionObserver
        );
      });
      expect(alertasItem.style.opacity).toBe('1');
    });
  });
});
