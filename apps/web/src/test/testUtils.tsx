/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, RenderOptions, renderHook, RenderHookOptions } from '@testing-library/react';
import { vi } from 'vitest';
import { type ReactElement, type ReactNode } from 'react';
import { UserContext } from '../context/UserContext';
import { FleetContext } from '../context/FleetContext';

/**
 * 🔱 Archon Test Utility: Sovereign Provider Injection
 * Purpose: Provides a stable, memory-efficient context for all unit tests.
 * v.60.2.3 - Exported Control Mocks for Assertions.
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
      currentReading: 50000,
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

const AllTheProviders = ({ children }: { children: ReactNode }): ReactElement => (
  <UserContext.Provider value={MockUserContext as any}>
    <FleetContext.Provider value={MockFleetContext as any}>{children}</FleetContext.Provider>
  </UserContext.Provider>
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
