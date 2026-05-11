/**
 * @vitest-environment jsdom
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useRouteAssignmentControl } from './useRouteAssignmentControl';
import { useFleet } from '../../../context/FleetContext';
import { useUsers } from '../../../context/UserContext';
import { RouteLog } from '../RouteLogTable';

// 🔱 Mock Context Hooks
vi.mock('../../../context/FleetContext');
vi.mock('../../../context/UserContext');

const MOCK_FLEET_CONTEXT = {
  units: [],
  startRoute: vi.fn(),
  finishRoute: vi.fn(),
  refreshUnits: vi.fn(),
};

const MOCK_USER_CONTEXT = {
  users: [],
};

describe('useRouteAssignmentControl (Hydration Certification)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useFleet).mockReturnValue(MOCK_FLEET_CONTEXT as any);
    vi.mocked(useUsers).mockReturnValue(MOCK_USER_CONTEXT as any);
  });

  it('prioritizes fuel_level_end for completed routes even if it is 0', async () => {
    const completedRoute = {
      uuid: 'route-completed',
      end_time: '2026-05-10T12:00:00Z',
      fuel_level_start: 100,
      fuel_level_end: 0, // Critical case: 0 must be respected
      fuelLevel: 50, // Legacy field should be ignored
    } as unknown as RouteLog;

    const { result } = renderHook(() => useRouteAssignmentControl(vi.fn(), completedRoute));

    await waitFor(() => {
      // Should respect 0% fuel at end of route
      expect(result.current.formData.fuelLevel).toBe(0);
    });
  });

  it('prioritizes fuel_level_end over fuel_level_start for completed routes', async () => {
    const completedRoute = {
      uuid: 'route-completed',
      end_time: '2026-05-10T12:00:00Z',
      fuel_level_start: 100,
      fuel_level_end: 83,
    } as unknown as RouteLog;

    const { result } = renderHook(() => useRouteAssignmentControl(vi.fn(), completedRoute));

    await waitFor(() => {
      expect(result.current.formData.fuelLevel).toBe(83);
    });
  });

  it('uses fuel_level_start for active routes (no end_time)', async () => {
    const activeRoute = {
      uuid: 'route-active',
      end_time: null,
      fuel_level_start: 75,
      fuel_level_end: null,
    } as unknown as RouteLog;

    const { result } = renderHook(() => useRouteAssignmentControl(vi.fn(), activeRoute));

    await waitFor(() => {
      expect(result.current.formData.fuelLevel).toBe(75);
    });
  });
});
