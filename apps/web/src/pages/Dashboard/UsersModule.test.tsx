import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, RenderResult } from '../../test/testUtils';
import { UserContext } from '../../context/UserContext';
import UsersModule from './UsersModule';

/**
 * testUtils' UserContext mock is a static, non-reactive value (activePanel
 * is fixed at 'DIRECTORY' — setActivePanel/setEditingUser are vi.fn() that
 * never actually flip it). Reaching the SIGNUP-gated lines needs a local
 * UserContext.Provider override nested inside the shared wrapper.
 */
const buildUserContextOverride = (
  overrides: Partial<{
    activePanel: 'DIRECTORY' | 'SIGNUP';
    users: unknown[];
    setActivePanel: ReturnType<typeof vi.fn>;
    setEditingUser: ReturnType<typeof vi.fn>;
  }>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any => ({
  users: overrides.users ?? [],
  isLoading: false,
  activePanel: overrides.activePanel ?? 'DIRECTORY',
  setActivePanel: overrides.setActivePanel ?? vi.fn(),
  fetchUsers: vi.fn(),
  toggleUserStatus: vi.fn(),
  updateUser: vi.fn(),
  deleteUser: vi.fn(),
  editingUser: null,
  setEditingUser: overrides.setEditingUser ?? vi.fn(),
  departments: [],
});

/**
 * 🔱 Archon Test Suite: UsersModule (v.28.25.2)
 * Implementation: Identity Sync Certification
 */
describe('UsersModule Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderModule = (): RenderResult => render(<UsersModule />);

  it('should render the correct administrative context', async (): Promise<void> => {
    renderModule();
    // Updated to match Fleet-Standard label (v.28.24.0)
    expect(await screen.findByText(/Administrar Personal/i)).toBeInTheDocument();
  });

  it('should display the core personnel instruments', async (): Promise<void> => {
    renderModule();
    // Updated to match Archon Standard labels (v.28.24.0)
    expect(screen.getByText(/EMPLEADO/i)).toBeInTheDocument();
    expect(screen.getByText(/Alta de Personal/i)).toBeInTheDocument();
  });

  // ── FC 074 F3 — Primera Oleada Adaptativa: ArchonAdaptiveView (TABLE + CARDS) en DIRECTORY ──
  describe('AT-FC074-F3 — adaptive DIRECTORY panel', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it('AT-FC074-F3-US-1: renders the adaptive selector with TABLE and CARDS only', async () => {
      renderModule();
      await screen.findByText(/Administrar Personal/i);
      expect(screen.getByTestId('adaptive-view-table')).toBeInTheDocument();
      expect(screen.getByTestId('adaptive-view-cards')).toBeInTheDocument();
      expect(screen.queryByTestId('adaptive-view-calendar')).not.toBeInTheDocument();
      expect(screen.queryByTestId('adaptive-view-charts')).not.toBeInTheDocument();
    });

    it('AT-FC074-F3-US-2: switches to CARDS view and renders personnel as cards', async () => {
      renderModule();
      await screen.findByText(/Administrar Personal/i);
      fireEvent.click(screen.getByTestId('adaptive-view-cards'));
      expect(await screen.findByTestId('archon-card-view')).toBeInTheDocument();
      expect(screen.getAllByTestId('archon-card-item').length).toBeGreaterThan(0);
      expect(localStorage.getItem('archon_adaptive_view_users-directory')).toBe('CARDS');
    });

    // FC 078 F2(b) — receta v2: depto/no. empleado/correo como métricas nuevas
    it('AT-FC078-F2b-US-1: card shows department, employee number and email metric rows', async () => {
      renderModule();
      await screen.findByText(/Administrar Personal/i);
      fireEvent.click(screen.getByTestId('adaptive-view-cards'));
      await screen.findByTestId('archon-card-view');
      expect(screen.getByText('Operaciones')).toBeInTheDocument();
      expect(screen.getByText('EMP-001')).toBeInTheDocument();
      expect(screen.getByText('juan.perez@piic.com.mx')).toBeInTheDocument();
    });

    it('CARDS view falls back to username when fullName is empty', async () => {
      render(
        <UserContext.Provider
          value={buildUserContextOverride({
            users: [
              {
                id: '9',
                username: 'sin.nombre',
                fullName: '',
                email: 'sin.nombre@piic.com.mx',
                roleId: 1,
                roleName: 'Operador',
                department: 'Operaciones',
                employeeNumber: 'EMP-009',
                is_active: true,
              },
            ],
          })}
        >
          <UsersModule />
        </UserContext.Provider>
      );
      await screen.findByText(/Administrar Personal/i);
      fireEvent.click(screen.getByTestId('adaptive-view-cards'));
      await screen.findByTestId('archon-card-view');
      // el nombre (fallback fullName||username) y el subtitulo de username
      // coinciden en texto, ambos muestran 'sin.nombre'
      expect(screen.getAllByText('sin.nombre')).toHaveLength(2);
    });

    it('clicking a card requests SIGNUP for that user, and the header "Iniciar Registro" action requests it too', async () => {
      const setActivePanel = vi.fn();
      const setEditingUser = vi.fn();
      const user = { id: '1', fullName: 'Juan Perez', username: 'juan.perez' };
      const contextValue = buildUserContextOverride({
        users: [user],
        setActivePanel,
        setEditingUser,
      });
      render(
        <UserContext.Provider value={contextValue}>
          <UsersModule />
        </UserContext.Provider>
      );
      await screen.findByText(/Administrar Personal/i);
      fireEvent.click(screen.getByTestId('adaptive-view-cards'));
      const cards = await screen.findAllByTestId('archon-card-item');
      fireEvent.click(cards[0]);
      expect(setEditingUser).toHaveBeenCalledWith(user);
      expect(setActivePanel).toHaveBeenCalledWith('SIGNUP');

      fireEvent.click(screen.getByText('Iniciar Registro'));
      expect(setEditingUser).toHaveBeenCalledWith(null);
    });
  });

  it('mounted directly into SIGNUP: triggers the axial scroll sync, and "Cerrar Formulario" cancels back to DIRECTORY', async () => {
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    const setActivePanel = vi.fn();
    const setEditingUser = vi.fn();
    const contextValue = buildUserContextOverride({
      activePanel: 'SIGNUP',
      setActivePanel,
      setEditingUser,
    });
    render(
      <UserContext.Provider value={contextValue}>
        <UsersModule />
      </UserContext.Provider>
    );
    expect(await screen.findByTestId('registration-form')).toBeInTheDocument();
    await waitFor(() => expect(window.HTMLElement.prototype.scrollIntoView).toHaveBeenCalled(), {
      timeout: 500,
    });

    fireEvent.click(screen.getByText('Cerrar Formulario'));
    expect(setEditingUser).toHaveBeenCalledWith(null);
    expect(setActivePanel).toHaveBeenCalledWith('DIRECTORY');
  });
});
