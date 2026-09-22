import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter, useNavigate } from 'react-router';
import Sidebar from './Sidebar';

/**
 * FC193 F3 — menú dinámico: una entrada de negocio solo aparece si el usuario tiene el permiso Y el
 * Supercúmulo está activo en el universo de la sesión. Las entradas BUILTIN (Comando, Alertas, Talleres,
 * Personal, Seguridad…) no dependen de ningún Supercúmulo.
 */

const useAuthMock = vi.hoisted(() => vi.fn());
const usePermissionsMock = vi.hoisted(() => vi.fn());
const useSovereignLayoutMock = vi.hoisted(() => vi.fn());
const useAlertsCountMock = vi.hoisted(() => vi.fn());

vi.mock('../../hooks/useAlertsCount', () => ({ default: useAlertsCountMock }));
vi.mock('react-router', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('react-router');
  return {
    ...actual,
    useNavigate: vi.fn(),
    useLocation: (): { pathname: string } => ({ pathname: '/dashboard' }),
  };
});
vi.mock('../../hooks/usePermissions', () => ({ default: usePermissionsMock }));
vi.mock('../../context/AuthContext', () => ({ useAuth: useAuthMock }));
vi.mock('../../context/SovereignLayoutContext', () => ({
  useSovereignLayout: useSovereignLayoutMock,
}));

const allowAll = {
  hasPermission: (): boolean => true,
  hasAnyPermission: (): boolean => true,
  isOmnipotent: (): boolean => true,
  isOmegaStrict: (): boolean => true,
  isItinerantArc: (): boolean => false,
};

const BUSINESS = {
  finanzas: 'FINANZAS',
  unidades: 'RASTREO',
  'rastreo-gps': 'RASTREO',
  rutas: 'RASTREO',
  incidencias: 'RASTREO',
  mantenimiento: 'MANTENIMIENTO',
} as const;
const BUILTIN = ['alertas', 'comando', 'arcsial', 'talleres', 'personal', 'seguridad'];

const withCapabilities = (superclusters: string[]): void => {
  useAuthMock.mockReturnValue({
    currentUser: { username: 'Soberano', imageUrl: null },
    effectiveUser: { activeCapabilities: { superclusters, clusters: [] } },
    logout: vi.fn(),
  });
};

const renderSidebar = (): void => {
  render(
    <BrowserRouter>
      <Sidebar isCollapsed={false} onToggle={vi.fn()} />
    </BrowserRouter>
  );
};

const visible = (id: string): boolean => screen.queryByTestId(`nav-item-${id}`) !== null;

describe('Sidebar — menú dinámico por capacidad (FC193 F3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useNavigate as unknown as ReturnType<typeof vi.fn>).mockReturnValue(vi.fn());
    usePermissionsMock.mockReturnValue(allowAll);
    useSovereignLayoutMock.mockReturnValue({
      isMobileMenuOpen: false,
      setIsMobileMenuOpen: vi.fn(),
    });
    useAlertsCountMock.mockReturnValue({ count: 0, isLoading: false });
  });

  it('con TODOS los Supercúmulos activos (p. ej. Ω) aparecen las 6 entradas de negocio', () => {
    withCapabilities(['CRM', 'RASTREO', 'MANTENIMIENTO', 'FINANZAS', 'RRHH']);

    renderSidebar();

    Object.keys(BUSINESS).forEach((id) => expect(visible(id)).toBe(true));
  });

  it.each(['RASTREO', 'MANTENIMIENTO', 'FINANZAS'] as const)(
    'con SOLO %s activo: aparecen sus entradas y NO las de los otros; las BUILTIN siguen',
    (active) => {
      withCapabilities([active]);

      renderSidebar();

      Object.entries(BUSINESS).forEach(([id, sc]) => expect(visible(id)).toBe(sc === active));
      BUILTIN.forEach((id) => expect(visible(id)).toBe(true));
    }
  );

  it('universo sin Supercúmulos activos (Scenario 2): ninguna entrada de negocio, pero sí las BUILTIN', () => {
    withCapabilities([]);

    renderSidebar();

    Object.keys(BUSINESS).forEach((id) => expect(visible(id)).toBe(false));
    BUILTIN.forEach((id) => expect(visible(id)).toBe(true));
  });

  it('el permiso sigue mandando: Supercúmulo activo pero sin permiso ⇒ la entrada no aparece', () => {
    withCapabilities(['RASTREO', 'MANTENIMIENTO', 'FINANZAS']);
    usePermissionsMock.mockReturnValue({ ...allowAll, hasAnyPermission: (): boolean => false });

    renderSidebar();

    Object.keys(BUSINESS).forEach((id) => expect(visible(id)).toBe(false));
  });

  it('payload SIN activeCapabilities (API anterior a F3) ⇒ no se oculta nada', () => {
    useAuthMock.mockReturnValue({
      currentUser: { username: 'Soberano', imageUrl: null },
      effectiveUser: { username: 'legacy' },
      logout: vi.fn(),
    });

    renderSidebar();

    Object.keys(BUSINESS).forEach((id) => expect(visible(id)).toBe(true));
  });
});
