import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';

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
  } => ({
    hasPermission: (): boolean => true,
    hasAnyPermission: (): boolean => true,
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

    expect(screen.getByText(/Archon/i)).toBeDefined();
    expect(screen.getByText(/Core/i)).toBeDefined();

    expect(screen.getByText('Comando')).toBeDefined();
    expect(screen.getByText('Unidades')).toBeDefined();
    expect(screen.getByText('Rutas')).toBeDefined();
    expect(screen.getByText('Seguridad')).toBeDefined();
    expect(screen.getByText('Personal')).toBeDefined();

    // Configuración should now be found as the bottom action button
    expect(screen.getByText('Configuración')).toBeDefined();
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

  it('navigates to settings when clicking the bottom action button', () => {
    render(
      <BrowserRouter>
        <Sidebar isCollapsed={false} onToggle={vi.fn()} />
      </BrowserRouter>
    );

    const settingsBtn = screen.getByTitle('Configuración de Sistema');
    fireEvent.click(settingsBtn);
    expect(navigateMock).toHaveBeenCalledWith('/dashboard/settings');
  });
});
