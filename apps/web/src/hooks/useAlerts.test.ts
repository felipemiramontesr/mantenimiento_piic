import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '../test/testUtils';
import useAlerts from './useAlerts';
import * as silkHydration from './useSilkHydration';
import type { Alert } from './useAlerts';

vi.mock('./useSilkHydration');

const MOCK_ALERTS: Alert[] = [
  {
    id: 'alert-001',
    type: 'MAINTENANCE_OVERDUE',
    severity: 'HIGH',
    title: 'Mantenimiento vencido',
    description: 'ASM-001 requiere servicio urgente',
    unitId: 'ASM-001',
    createdAt: '2026-06-01T10:00:00.000Z',
  },
  {
    id: 'alert-002',
    type: 'INCIDENT_OPEN',
    severity: 'CRITICAL',
    title: 'Incidente abierto',
    description: 'Falla en frenos reportada',
    unitId: 'ASM-002',
    createdAt: '2026-06-02T08:00:00.000Z',
  },
];

describe('useAlerts', () => {
  const mockRefresh = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(silkHydration.default).mockReturnValue({
      data: MOCK_ALERTS,
      isSyncing: false,
      refresh: mockRefresh,
    });
  });

  it('returns alerts from useSilkHydration', () => {
    const { result } = renderHook(() => useAlerts());
    expect(result.current.alerts).toHaveLength(2);
    expect(result.current.alerts[0].id).toBe('alert-001');
    expect(result.current.alerts[1].severity).toBe('CRITICAL');
  });

  it('returns isSyncing state', () => {
    const { result } = renderHook(() => useAlerts());
    expect(result.current.isSyncing).toBe(false);
  });

  it('reflects isSyncing true when loading', () => {
    vi.mocked(silkHydration.default).mockReturnValue({
      data: [],
      isSyncing: true,
      refresh: mockRefresh,
    });
    const { result } = renderHook(() => useAlerts());
    expect(result.current.isSyncing).toBe(true);
    expect(result.current.alerts).toHaveLength(0);
  });

  it('exposes refresh function', async () => {
    const { result } = renderHook(() => useAlerts());
    await result.current.refresh();
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('calls useSilkHydration with correct config', () => {
    renderHook(() => useAlerts());
    expect(silkHydration.default).toHaveBeenCalledWith({
      key: 'system_alerts',
      endpoint: '/alerts',
    });
  });
});
