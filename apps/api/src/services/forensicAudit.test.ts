import { describe, it, expect, vi, beforeEach } from 'vitest';
import RouteService from './routeService';
import db from './db';
import { recordAuditLog } from './auditService';

vi.mock('./db', () => ({
  default: {
    getConnection: vi.fn(),
    execute: vi.fn(),
    query: vi.fn(),
  },
}));

vi.mock('./auditService', () => ({
  recordAuditLog: vi.fn(),
}));

describe('🔱 Archon Forensic Audit Logic', () => {
  const mockConnection = {
    beginTransaction: vi.fn(),
    commit: vi.fn(),
    rollback: vi.fn(),
    release: vi.fn(),
    execute: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (db.getConnection as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockConnection);
    mockConnection.execute.mockResolvedValue([[], []]);
  });

  it('should capture correct snapshots when updating fuel level from 100 to 83', async () => {
    const routeUuid = 'test-uuid';
    const snapshotBefore = {
      uuid: routeUuid,
      status: 'COMPLETED',
      fuel_level_end: 100,
      fuel_liters_loaded: 50,
    };
    const snapshotAfter = {
      uuid: routeUuid,
      status: 'COMPLETED',
      fuel_level_end: 83,
      fuel_liters_loaded: 40,
    };

    // Mock Before Snapshot
    mockConnection.execute.mockResolvedValueOnce([[snapshotBefore]]);
    // Mock Update
    mockConnection.execute.mockResolvedValueOnce([{}]);
    // Mock After Snapshot
    mockConnection.execute.mockResolvedValueOnce([[snapshotAfter]]);

    await RouteService.updateRoute(
      routeUuid,
      { fuelLevel: 83, fuelLitersLoaded: 40 },
      'Corrección de carga',
      1
    );

    expect(recordAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        snapshot_before: snapshotBefore,
        snapshot_after: snapshotAfter,
        action: 'UPDATE',
      })
    );

    // Verify snapshots are NOT swapped
    const auditCall = (recordAuditLog as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(auditCall.snapshot_before.fuel_level_end).toBe(100);
    expect(auditCall.snapshot_after.fuel_level_end).toBe(83);
    expect(auditCall.snapshot_before.fuel_liters_loaded).toBe(50);
    expect(auditCall.snapshot_after.fuel_liters_loaded).toBe(40);
  });

  it('should prioritize fuel_level_end mapping when route is COMPLETED', async () => {
    const routeUuid = 'test-uuid';
    const snapshotBefore = { status: 'COMPLETED', fuel_level_end: 100 };

    mockConnection.execute.mockResolvedValueOnce([[snapshotBefore]]);
    mockConnection.execute.mockResolvedValueOnce([{}]); // update
    mockConnection.execute.mockResolvedValueOnce([[snapshotBefore]]); // after (irrelevant for this test)

    await RouteService.updateRoute(routeUuid, { fuelLevel: 83 }, 'Test', 1);

    const updateQuery = mockConnection.execute.mock.calls[1][0];
    expect(updateQuery).toContain('fuel_level_end = ?');
    expect(updateQuery).not.toContain('fuel_level_start = ?');
  });

  it('should prioritize fuel_level_start mapping when route is ACTIVE', async () => {
    const routeUuid = 'test-uuid';
    const snapshotBefore = { status: 'ACTIVE', fuel_level_start: 100 };

    mockConnection.execute.mockResolvedValueOnce([[snapshotBefore]]);
    mockConnection.execute.mockResolvedValueOnce([{}]); // update
    mockConnection.execute.mockResolvedValueOnce([[snapshotBefore]]); // after

    await RouteService.updateRoute(routeUuid, { fuelLevel: 83 }, 'Test', 1);

    const updateQuery = mockConnection.execute.mock.calls[1][0];
    expect(updateQuery).toContain('fuel_level_start = ?');
    expect(updateQuery).not.toContain('fuel_level_end = ?');
  });
});
