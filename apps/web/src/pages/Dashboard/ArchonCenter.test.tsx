import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter, useNavigate } from 'react-router-dom';
import ArchonCenter from './ArchonCenter';
import { FleetProvider } from '../../context/FleetContext';

vi.mock('../../api/client', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: { success: true, data: [] } }),
    post: vi.fn(),
  },
}));

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

  it('renders branding name and command titles', async () => {
    await act(async () => {
      render(
        <BrowserRouter>
          <FleetProvider>
            <ArchonCenter />
          </FleetProvider>
        </BrowserRouter>
      );
    });

    expect(screen.getByText('Sentinel Command')).toBeDefined();
    expect(screen.getByText('Digital Fortress Management')).toBeDefined();
  });

  it('toggles the user menu when clicking the avatar', async () => {
    await act(async () => {
      render(
        <BrowserRouter>
          <FleetProvider>
            <ArchonCenter />
          </FleetProvider>
        </BrowserRouter>
      );
    });

    const avatarBtn = screen.getByLabelText('User Menu');

    // Menu should be hidden initially
    expect(screen.queryByText('Control de Acceso')).toBeNull();

    // Click to open
    fireEvent.click(avatarBtn);
    expect(screen.getByText('Control de Acceso')).toBeDefined();
    expect(screen.getByText(/Desconexión/i)).toBeDefined();

    // Click to close (or toggle back)
    fireEvent.click(avatarBtn);
    expect(screen.queryByText('Perfil')).toBeNull();
  });

  it('handles logout correctly from the user menu', async () => {
    await act(async () => {
      render(
        <BrowserRouter>
          <FleetProvider>
            <ArchonCenter />
          </FleetProvider>
        </BrowserRouter>
      );
    });

    // Open menu
    fireEvent.click(screen.getByLabelText('User Menu'));

    // Click Logout
    const logoutBtn = screen.getByText(/Desconexión/i);
    fireEvent.click(logoutBtn);

    expect(localStorage.removeItem).toHaveBeenCalledWith('auth_token');
    expect(localStorage.removeItem).toHaveBeenCalledWith('user_data');
    expect(navigateMock).toHaveBeenCalledWith('/login');
  });

  it('renders all 6 KPI cards with correct text', async () => {
    await act(async () => {
      render(
        <BrowserRouter>
          <FleetProvider>
            <ArchonCenter />
          </FleetProvider>
        </BrowserRouter>
      );
    });

    expect(screen.getByText(/Índice de Mantenimiento/i)).toBeDefined();
    expect(screen.getByText(/Nuestras Unidades/i)).toBeDefined();
    expect(screen.getByText(/Unidades disponibles/i)).toBeDefined();
    expect(screen.getByText(/Unidades en ruta/i)).toBeDefined();
    expect(screen.getByText(/Unidades en mantenimiento/i)).toBeDefined();
    expect(screen.getByText(/Mermas de Flota/i)).toBeDefined();
    // Verify visibility of action buttons
    const detailButtons = screen.getAllByText(/Ver Detalle/i);
    expect(detailButtons.length).toBe(6);
  });
});
