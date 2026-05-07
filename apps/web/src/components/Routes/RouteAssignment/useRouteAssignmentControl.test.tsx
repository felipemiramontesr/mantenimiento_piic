/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FormEvent } from 'react';
import { http, HttpResponse } from 'msw';
import useRouteAssignmentControl from './useRouteAssignmentControl';
import { useFleet } from '../../../context/FleetContext';
import { useUsers } from '../../../context/UserContext';
import { RouteLog } from '../RouteLogTable';
import server from '../../../test/server';

// 🔱 Mock Context Hooks
vi.mock('../../../context/FleetContext');
vi.mock('../../../context/UserContext');

// 🔱 Sovereign Mock Data (Stable References & Type Integrity)
const STABLE_FLEET_CONTEXT = {
  units: [],
  stats: {
    total: 0,
    available: 0,
    inRoute: 0,
    maintenance: 0,
    discontinued: 0,
    totalInactive: 0,
    maintenanceIndex: 0,
    openIncidents: 0,
    globalMTBF: 0,
    globalMTTR: 0,
    globalAvailability: 0,
    categories: {
      vehiculo: { total: 0, active: 0, health: 0 },
      maquinaria: { total: 0, active: 0, health: 0 },
      herramienta: { total: 0, active: 0, health: 0 },
    },
  } as any,
  loading: false,
  refreshUnits: vi.fn(),
  startRoute: vi.fn(),
  finishRoute: vi.fn(),
  reportIncident: vi.fn(),
};

const STABLE_USER_CONTEXT = {
  users: [],
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

describe('useRouteAssignmentControl (MSW Certified)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useFleet).mockReturnValue(STABLE_FLEET_CONTEXT as any);
    vi.mocked(useUsers).mockReturnValue(STABLE_USER_CONTEXT as any);

    // 🔱 MSW Gateway: Suppress networking noise
    server.use(
      http.get('*/routes', () => HttpResponse.json({ success: true, data: [] })),
      http.get('*/catalogs/ROUTE_ORIGIN', () => HttpResponse.json({ success: true, data: [] }))
    );
  });

  it('initializes with default sovereign state', async () => {
    const { result } = renderHook(() => useRouteAssignmentControl(vi.fn()));
    await waitFor(() => {
      expect(result.current.formData.fuelLevel).toBe(100);
    });
  });

  it('hydrates form data when routeToEdit is provided', async () => {
    const mockRoute = {
      uuid: 'route-123',
      unit_id: 'ASM-001',
      operator_id: 1,
      destination: 'Mina',
      fuelLevel: 85,
    } as unknown as RouteLog;

    const { result } = renderHook(() => useRouteAssignmentControl(vi.fn(), mockRoute));
    await waitFor(() => {
      expect(result.current.formData.unitId).toBe('ASM-001');
    });
  });

  it('handles mission start protocol (handleSubmit)', async () => {
    const onClose = vi.fn();
    const { result } = renderHook(() => useRouteAssignmentControl(onClose));

    await act(async () => {
      await result.current.handleSubmit({ preventDefault: vi.fn() } as unknown as FormEvent);
    });

    expect(STABLE_FLEET_CONTEXT.startRoute).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
