/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, RenderOptions, renderHook, RenderHookOptions } from '@testing-library/react';
import { vi } from 'vitest';
import { type ReactElement, type ReactNode } from 'react';
import { UserContext } from '../context/UserContext';
import { FleetContext } from '../context/FleetContext';
import { AuthProvider } from '../context/AuthContext';
import { SovereignLayoutProvider, useSovereignLayout } from '../context/SovereignLayoutContext';

/**
 * 🔱 Archon Test Utility: Sovereign Provider Injection
 * Purpose: Provides a stable, memory-efficient context for all unit tests.
 * v.60.2.5 - Sovereign Layout Observer Integrated.
 */

export const mockStartRoute = vi.fn();
export const mockFinishRoute = vi.fn();

const MockUserContext = {
  users: [{ id: '1', fullName: 'Juan Perez', username: 'juan.perez', roleName: 'Operador' }],
  isLoading: false,
  activePanel: 'DIRECTORY' as const,
  setActivePanel: vi.fn(),
  fetchUsers: vi.fn(),
  toggleUserStatus: vi.fn(),
  updateUser: vi.fn(),
  deleteUser: vi.fn(),
  editingUser: null,
  setEditingUser: vi.fn(),
  departments: [],
  roles: [],
};

const MockFleetContext = {
  units: [
    {
      id: 'ASM-001',
      marca: 'Nissan',
      modelo: 'March',
      status: 'Disponible',
      odometer: 50000,
      placas: 'ABC-123',
    },
  ],
  stats: {
    total: 1,
    available: 1,
    inRoute: 0,
    maintenance: 0,
    discontinued: 0,
    totalInactive: 0,
    maintenanceIndex: 0,
    openIncidents: 0,
    globalMTBF: 0,
    globalMTTR: 0,
    globalAvailability: 100,
    categories: {
      vehiculo: { total: 1, active: 0, health: 100 },
      maquinaria: { total: 0, active: 0, health: 0 },
      herramienta: { total: 0, active: 0, health: 0 },
    },
  } as any,
  loading: false,
  refreshUnits: vi.fn(),
  startRoute: mockStartRoute,
  finishRoute: mockFinishRoute,
  reportIncident: vi.fn(),
};

/**
 * 🔱 LayoutMetadataObserver (Test Infrastructure)
 * Purpose: Surfaces the Sovereign Layout state into the DOM during tests.
 * This ensures that assertions for section titles/descriptions continue to work
 * even when the actual header is not part of the unit test.
 */
const LayoutMetadataObserver = (): ReactElement => {
  const { layoutData } = useSovereignLayout();

  return (
    <div data-testid="sovereign-layout-metadata" style={{ display: 'none' }}>
      <h1 data-testid="layout-title">{layoutData.title}</h1>
      <p data-testid="layout-description">{layoutData.description}</p>
    </div>
  );
};

const AllTheProviders = ({ children }: { children: ReactNode }): ReactElement => (
  <AuthProvider>
    <SovereignLayoutProvider>
      <LayoutMetadataObserver />
      <UserContext.Provider value={MockUserContext as any}>
        <FleetContext.Provider value={MockFleetContext as any}>{children}</FleetContext.Provider>
      </UserContext.Provider>
    </SovereignLayoutProvider>
  </AuthProvider>
);

const renderWithProviders = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
): ReturnType<typeof render> => render(ui, { wrapper: AllTheProviders, ...options });

const renderHookWithProviders = <Result, Props>(
  renderCallback: (props: Props) => Result,
  options?: Omit<RenderHookOptions<Props>, 'wrapper'>
): ReturnType<typeof renderHook<Result, Props>> =>
  renderHook(renderCallback, { wrapper: AllTheProviders, ...options });

// Re-export everything from RTL
export * from '@testing-library/react';
export { renderWithProviders as render, renderHookWithProviders as renderHook };
