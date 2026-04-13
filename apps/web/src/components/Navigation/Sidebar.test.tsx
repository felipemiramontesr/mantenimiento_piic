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
    
    expect(screen.getByText('Centro de Comando')).toBeDefined();
    expect(screen.getByText('Estado de Flota')).toBeDefined();
    expect(screen.getByText('Logs de Seguridad')).toBeDefined();
    
    // Configuración should now be found as the bottom action button
    expect(screen.getByText('Configuración')).toBeDefined();
  });

  it('navigates to dashboard items when clicking main nav items', () => {
    render(
      <BrowserRouter>
        <Sidebar isCollapsed={false} onToggle={vi.fn()} />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByText('Centro de Comando'));
    expect(navigateMock).toHaveBeenCalledWith('/dashboard');

    fireEvent.click(screen.getByText('Estado de Flota'));
    expect(navigateMock).toHaveBeenCalledWith('/dashboard/fleet');
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
