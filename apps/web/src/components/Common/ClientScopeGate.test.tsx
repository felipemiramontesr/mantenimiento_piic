import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ClientScopeGate from './ClientScopeGate';

/**
 * 🔱 Archon Test: ClientScopeGate (Owner-Scoped F1-A)
 * El Cliente Externo (rol 9) solo puede ver el panel de Administración de
 * Unidades: cualquier otra ruta del dashboard redirige a /dashboard/fleet,
 * incluso tecleada directamente en el navegador.
 */

const usePermissionsMock = vi.hoisted(() => vi.fn());

vi.mock('../../hooks/usePermissions', () => ({
  default: usePermissionsMock,
}));

const mockClient = (isClient: boolean): void => {
  usePermissionsMock.mockReturnValue({
    hasPermission: (): boolean => true,
    hasAnyPermission: (): boolean => true,
    isOmnipotent: (): boolean => false,
    isExternalClientOnly: (): boolean => isClient,
  });
};

const renderAt = (path: string): void => {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="*"
          element={
            <ClientScopeGate>
              <div data-testid="gated-content">contenido</div>
            </ClientScopeGate>
          }
        />
        <Route path="/dashboard/fleet" element={<div data-testid="fleet-landing">flota</div>} />
      </Routes>
    </MemoryRouter>
  );
};

describe('ClientScopeGate — candado de panel único para Cliente Externo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders children for non-client users on any route', () => {
    mockClient(false);
    renderAt('/dashboard');
    expect(screen.getByTestId('gated-content')).toBeInTheDocument();
  });

  it('redirects the external client away from the dashboard home (Comando)', () => {
    mockClient(true);
    renderAt('/dashboard');
    expect(screen.queryByTestId('gated-content')).not.toBeInTheDocument();
    expect(screen.getByTestId('fleet-landing')).toBeInTheDocument();
  });

  it('redirects the external client away from foreign modules typed directly', () => {
    mockClient(true);
    renderAt('/dashboard/routes');
    expect(screen.queryByTestId('gated-content')).not.toBeInTheDocument();
    expect(screen.getByTestId('fleet-landing')).toBeInTheDocument();
  });

  it('allows the external client inside the fleet panel', () => {
    mockClient(true);
    renderAt('/dashboard/fleet');
    // la ruta exacta /dashboard/fleet del router de prueba gana, pero el gate
    // no debe interferir: validamos con una sub-ruta de unidad
    render(
      <MemoryRouter initialEntries={['/dashboard/fleet/ASM-001']}>
        <ClientScopeGate>
          <div data-testid="unit-content">unidad</div>
        </ClientScopeGate>
      </MemoryRouter>
    );
    expect(screen.getByTestId('unit-content')).toBeInTheDocument();
  });

  it('allows the external client inside the alerts panel (V.201)', () => {
    mockClient(true);
    render(
      <MemoryRouter initialEntries={['/dashboard/alerts']}>
        <ClientScopeGate>
          <div data-testid="alerts-content">alertas</div>
        </ClientScopeGate>
      </MemoryRouter>
    );
    expect(screen.getByTestId('alerts-content')).toBeInTheDocument();
  });

  it('allows the external client inside the maintenance panel (V.201)', () => {
    mockClient(true);
    render(
      <MemoryRouter initialEntries={['/dashboard/maintenance']}>
        <ClientScopeGate>
          <div data-testid="maint-content">mantenimiento</div>
        </ClientScopeGate>
      </MemoryRouter>
    );
    expect(screen.getByTestId('maint-content')).toBeInTheDocument();
  });

  it('allows the external client inside a maintenance sub-route (V.201)', () => {
    mockClient(true);
    render(
      <MemoryRouter initialEntries={['/dashboard/maintenance/abc-123']}>
        <ClientScopeGate>
          <div data-testid="maint-node-content">nodo</div>
        </ClientScopeGate>
      </MemoryRouter>
    );
    expect(screen.getByTestId('maint-node-content')).toBeInTheDocument();
  });
});
