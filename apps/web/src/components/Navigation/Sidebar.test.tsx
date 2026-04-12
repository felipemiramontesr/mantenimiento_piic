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
    
    Storage.prototype.getItem = vi.fn((key) => {
      if (key === 'user_data') return JSON.stringify({ username: 'Operator' });
      return null;
    });
    Storage.prototype.removeItem = vi.fn();
  });

  it('renders all navigation items properly and respects location', () => {
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
    expect(screen.getByText('Configuración')).toBeDefined();
  });

  it('navigates when clicking navigation items', () => {
    render(
      <BrowserRouter>
        <Sidebar isCollapsed={false} onToggle={vi.fn()} />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByText('Centro de Comando'));
    expect(navigateMock).toHaveBeenCalledWith('/dashboard');

    fireEvent.click(screen.getByText('Estado de Flota'));
    expect(navigateMock).toHaveBeenCalledWith('/dashboard/fleet');
    
    expect(screen.getByText(/Archon/i)).toBeDefined();
    expect(screen.getByText(/Core/i)).toBeDefined();
  });

  it('terminates session on logout click after confirmation', () => {
    render(
      <BrowserRouter>
        <Sidebar isCollapsed={false} onToggle={vi.fn()} />
      </BrowserRouter>
    );

    // First click: should enter confirmation state
    fireEvent.click(screen.getByText('Salir'));
    expect(screen.getByText('¿Seguro?')).toBeDefined();
    expect(localStorage.removeItem).not.toHaveBeenCalled();

    // Second click: should actually logout
    fireEvent.click(screen.getByText('¿Seguro?'));
    
    expect(localStorage.removeItem).toHaveBeenCalledWith('auth_token');
    expect(localStorage.removeItem).toHaveBeenCalledWith('user_data');
    expect(navigateMock).toHaveBeenCalledWith('/login');
  });
});
