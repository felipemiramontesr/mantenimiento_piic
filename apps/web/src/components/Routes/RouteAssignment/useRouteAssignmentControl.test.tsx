/** @vitest-environment jsdom */
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
  units: [{ id: 'ASM-001', fuelTankCapacity: 80 }],
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
  departmentsCatalog: [],
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

  it('FC 076 R5 — corrección de misión activa envía {data, reason} (reason ≥5)', async () => {
    // Edit de ruta ACTIVA (endReading=0) → handleSubmit cae en
    // handleCorrectActiveMission → PUT /routes/:uuid. El schema del backend
    // exige reason min(5); este call-site lo omitía → 400 siempre.
    let capturedBody: Record<string, unknown> | null = null;
    server.use(
      http.put('*/routes/route-123', async ({ request }) => {
        capturedBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ success: true });
      })
    );

    const mockRoute = {
      uuid: 'route-123',
      unit_id: 'ASM-001',
      operator_id: 1,
      destination: 'Mina',
      fuelLevel: 85,
    } as unknown as RouteLog;

    const onClose = vi.fn();
    const { result } = renderHook(() => useRouteAssignmentControl(onClose, mockRoute));
    await waitFor(() => expect(result.current.formData.unitId).toBe('ASM-001'));

    await act(async () => {
      await result.current.handleSubmit({ preventDefault: vi.fn() } as unknown as FormEvent);
    });

    await waitFor(() => expect(capturedBody).not.toBeNull());
    const body = capturedBody as unknown as { data: Record<string, unknown>; reason: string };
    expect(body.data).toBeDefined();
    expect(typeof body.reason).toBe('string');
    expect(body.reason.length).toBeGreaterThanOrEqual(5);
    expect(onClose).toHaveBeenCalled();
  });
});
