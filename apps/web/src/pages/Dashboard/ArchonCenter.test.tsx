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

    expect(screen.getByText('Archon')).toBeDefined();
    expect(screen.getByText('Centro de Comando')).toBeDefined();
    expect(screen.getByText(/Eje de Control de unidades/i)).toBeDefined();
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
    expect(screen.getByText(/Cerrar Sesión/i)).toBeDefined();

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
    const logoutBtn = screen.getByText(/Cerrar Sesión/i);
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

    expect(screen.getByText(/Índice de Mantenimiento/i)).toBeDefined();
    expect(screen.getByText(/Nuestras Unidades/i)).toBeDefined();
    expect(screen.getByText(/Unidades disponibles/i)).toBeDefined();
    expect(screen.getByText(/Unidades en ruta/i)).toBeDefined();
    expect(screen.getByText(/Unidades en mantenimiento/i)).toBeDefined();
    expect(screen.getByText(/Unidades descontinuadas/i)).toBeDefined();
    expect(screen.getByText(/Gestión de Personal/i)).toBeDefined();
    expect(screen.getByText(/Mando y Supervisión/i)).toBeDefined();

    // Verify visibility of action buttons
    const detailButtons = screen.getAllByText(/Ver detalles/i);
    expect(detailButtons.length).toBe(8);
  });
});
