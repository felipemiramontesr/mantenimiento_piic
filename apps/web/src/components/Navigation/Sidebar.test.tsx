import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';

const logoutMock = vi.hoisted(() => vi.fn());

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('react-router-dom');
  return {
    ...actual,
    useNavigate: vi.fn(),
    useLocation: (): { pathname: string } => ({ pathname: '/dashboard/fleet' }),
  };
});

vi.mock('../../hooks/usePermissions', () => ({
  default: (): {
    hasPermission: (permission: string) => boolean;
    hasAnyPermission: (permissions: string[]) => boolean;
    isOmnipotent: () => boolean;
  } => ({
    hasPermission: (): boolean => true,
    hasAnyPermission: (): boolean => true,
    isOmnipotent: (): boolean => true,
  }),
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: (): {
    currentUser: { username: string; imageUrl: string | null };
    logout: () => void;
  } => ({
    currentUser: { username: 'Soberano', imageUrl: null },
    logout: logoutMock,
  }),
}));

vi.mock('../../context/SovereignLayoutContext', () => ({
  useSovereignLayout: (): Record<string, unknown> => ({
    isMobileMenuOpen: false,
    setIsMobileMenuOpen: vi.fn(),
  }),
}));

describe('Sidebar Component (Archon Core)', () => {
  const navigateMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useNavigate as unknown as ReturnType<typeof vi.fn>).mockReturnValue(navigateMock);
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
    expect(screen.getByText('Administración')).toBeDefined();
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
});
