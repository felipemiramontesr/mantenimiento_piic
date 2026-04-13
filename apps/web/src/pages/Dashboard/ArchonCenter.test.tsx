import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter, useNavigate } from 'react-router-dom';
import ArchonCenter from './ArchonCenter';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('react-router-dom');
  return {
    ...actual,
    useNavigate: vi.fn(),
  };
});

describe('ArchonCenter Component (Sovereign Dashboard)', () => {
  const navigateMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useNavigate as unknown as ReturnType<typeof vi.fn>).mockReturnValue(navigateMock);
    
    // Mock LocalStorage
    Storage.prototype.removeItem = vi.fn();
  });

  it('renders branding name and command titles', () => {
    render(
      <BrowserRouter>
        <ArchonCenter />
      </BrowserRouter>
    );

    expect(screen.getByText('Anchor')).toBeDefined();
    expect(screen.getByText('Centro de Comando')).toBeDefined();
    expect(screen.getByText(/Eje de Control de Flota/i)).toBeDefined();
  });

  it('toggles the user menu when clicking the avatar', () => {
    render(
      <BrowserRouter>
        <ArchonCenter />
      </BrowserRouter>
    );

    const avatarBtn = screen.getByLabelText('User Menu');
    
    // Menu should be hidden initially
    expect(screen.queryByText('Perfil')).toBeNull();

    // Click to open
    fireEvent.click(avatarBtn);
    expect(screen.getByText('Perfil')).toBeDefined();
    expect(screen.getByText('Cerrar Sesión')).toBeDefined();

    // Click to close (or toggle back)
    fireEvent.click(avatarBtn);
    expect(screen.queryByText('Perfil')).toBeNull();
  });

  it('handles logout correctly from the user menu', () => {
    render(
      <BrowserRouter>
        <ArchonCenter />
      </BrowserRouter>
    );

    // Open menu
    fireEvent.click(screen.getByLabelText('User Menu'));
    
    // Click Logout
    const logoutBtn = screen.getByText('Cerrar Sesión');
    fireEvent.click(logoutBtn);

    expect(localStorage.removeItem).toHaveBeenCalledWith('auth_token');
    expect(localStorage.removeItem).toHaveBeenCalledWith('user_data');
    expect(navigateMock).toHaveBeenCalledWith('/login');
  });

  it('renders all 6 KPI cards with correct text', () => {
    render(
      <BrowserRouter>
        <ArchonCenter />
      </BrowserRouter>
    );

    expect(screen.getByText('Índice de Mantenimiento')).toBeDefined();
    expect(screen.getByText('Nuestra Flotilla')).toBeDefined();
    expect(screen.getByText('Flotilla disponible')).toBeDefined();
    expect(screen.getByText('Flotilla en ruta')).toBeDefined();
    expect(screen.getByText('Flotilla en mantenimiento')).toBeDefined();
    expect(screen.getByText('Flotilla descontinuada')).toBeDefined();
    
    // Verify "Táctica" is NOT present in buttons
    const detailButtons = screen.getAllByText('Ver detalles');
    expect(detailButtons.length).toBe(6);
  });
});
