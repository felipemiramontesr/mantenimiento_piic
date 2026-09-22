import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Outlet } from 'react-router';
import App from './App';

/**
 * FC193 F3 — el árbol REAL de rutas de `App.tsx`: una URL directa a un módulo cuyo Supercúmulo no está
 * activo rebota al Comando; los módulos BUILTIN y los de Supercúmulos activos cargan normal. Se simulan
 * la sesión y los módulos (solo se prueba el cableado de los guards, no las páginas).
 */

const useAuthMock = vi.hoisted(() => vi.fn());

vi.mock('./context/AuthContext', () => ({
  useAuth: useAuthMock,
  AuthProvider: ({ children }: { children: React.ReactNode }): React.ReactNode => children,
}));
vi.mock('./context/UserContext', () => ({
  UserProvider: ({ children }: { children: React.ReactNode }): React.ReactNode => children,
}));
vi.mock('./pages/Dashboard/Layout', () => ({
  default: (): React.JSX.Element => <Outlet />,
}));

// vi.mock se iza sobre los imports: el generador de stubs también debe ser `hoisted`.
const { stub } = vi.hoisted(() => ({
  stub: async (id: string): Promise<{ default: () => React.JSX.Element }> => {
    const { createElement } = await import('react');
    return { default: (): React.JSX.Element => createElement('div', { 'data-testid': id }, id) };
  },
}));
vi.mock('./pages/Dashboard/ArchonCenter', () => stub('comando'));
vi.mock('./pages/Dashboard/FleetModule', () => stub('fleet'));
vi.mock('./pages/Dashboard/FleetUnitNode', () => stub('fleet-node'));
vi.mock('./pages/Dashboard/MaintenanceModule', () => stub('maintenance'));
vi.mock('./pages/Dashboard/FinancialHealthModule', () => stub('financial'));
vi.mock('./pages/Dashboard/RoutesModule', () => stub('routes'));
vi.mock('./pages/Dashboard/IncidentsModule', () => stub('incidents'));
vi.mock('./pages/Dashboard/RealtimeTrackingModule', () => stub('tracking'));
vi.mock('./pages/Dashboard/AlertsModule', () => stub('alerts'));
vi.mock('./pages/Dashboard/UsersModule', () => stub('users'));

const givenCapabilities = (superclusters: string[]): void => {
  useAuthMock.mockReturnValue({
    isAuthenticated: true,
    isLoading: false,
    effectiveUser: { activeCapabilities: { superclusters, clusters: [] } },
  });
};

const visit = (path: string): void => {
  window.history.pushState({}, '', path);
  render(<App />);
};

describe('App — guards de capacidad en el árbol real de rutas (FC193 F3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    ['/dashboard/fleet', 'RASTREO', 'fleet'],
    ['/dashboard/routes', 'RASTREO', 'routes'],
    ['/dashboard/incidents', 'RASTREO', 'incidents'],
    ['/dashboard/tracking', 'RASTREO', 'tracking'],
    ['/dashboard/maintenance', 'MANTENIMIENTO', 'maintenance'],
    ['/dashboard/financial', 'FINANZAS', 'financial'],
  ])('%s con %s ACTIVO ⇒ carga el módulo', (path, sc, module) => {
    givenCapabilities([sc]);

    visit(path);

    expect(screen.getByTestId(module)).toBeInTheDocument();
    expect(screen.queryByTestId('comando')).not.toBeInTheDocument();
  });

  it.each([
    ['/dashboard/fleet', 'fleet'],
    ['/dashboard/fleet/7', 'fleet-node'],
    ['/dashboard/routes', 'routes'],
    ['/dashboard/incidents', 'incidents'],
    ['/dashboard/tracking', 'tracking'],
    ['/dashboard/maintenance', 'maintenance'],
    ['/dashboard/financial', 'financial'],
  ])(
    '%s con el Supercúmulo INACTIVO (Scenario 2) ⇒ rebota al Comando, el módulo no carga',
    (path, module) => {
      givenCapabilities([]);

      visit(path);

      expect(screen.getByTestId('comando')).toBeInTheDocument();
      expect(screen.queryByTestId(module)).not.toBeInTheDocument();
      expect(window.location.pathname).toBe('/dashboard');
    }
  );

  it('la ruta BUILTIN de alertas carga aunque no haya ningún Supercúmulo activo', () => {
    givenCapabilities([]);

    visit('/dashboard/alerts');
    expect(screen.getByTestId('alerts')).toBeInTheDocument();
  });

  it('el detalle de mantenimiento (nodo hijo) también está guardado', () => {
    givenCapabilities(['FINANZAS']);

    visit('/dashboard/maintenance/abc');

    expect(screen.getByTestId('comando')).toBeInTheDocument();
  });
});
