/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createWorkOrder,
  updateTaskStatus,
  closeWorkOrder,
  checkAndTimeoutStage5Orders,
  getWorkOrder,
} from './workOrderService';
import db from './db';

// ─── DB Mock ──────────────────────────────────────────────────────────────────

const mockConnection = {
  beginTransaction: vi.fn(),
  commit: vi.fn(),
  rollback: vi.fn(),
  release: vi.fn(),
  execute: vi.fn().mockResolvedValue([[]]),
};

vi.mock('./db', () => ({
  default: {
    execute: vi.fn().mockResolvedValue([[]]),
    getConnection: vi.fn(() => Promise.resolve(mockConnection)),
  },
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mockVehicleRow(overrides: object = {}): object[] {
  return [
    {
      id: 'VEH-001',
      odometer: 10200,
      brandLabel: 'Toyota',
      fuelTypeLabel: 'Gasolina',
      ...overrides,
    },
  ];
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('workOrderService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConnection.execute.mockResolvedValue([[]]);
  });

  // ── createWorkOrder ─────────────────────────────────────────────────────────

  describe('createWorkOrder', () => {
    it('throws VEHICLE_NOT_FOUND when vehicle does not exist', async () => {
      (db.execute as any).mockResolvedValueOnce([[]]); // vehicle query returns empty
      await expect(createWorkOrder('GHOST-999', 'urban')).rejects.toThrow('VEHICLE_NOT_FOUND');
    });

    it('does not call getConnection when vehicle is not found', async () => {
      (db.execute as any).mockResolvedValueOnce([[]]);
      await expect(createWorkOrder('GHOST-999', 'urban')).rejects.toThrow();
      expect(db.getConnection).not.toHaveBeenCalled();
    });

    it('inserts work order and tasks on happy path', async () => {
      // 1. fetchVehicleProfile
      (db.execute as any).mockResolvedValueOnce([mockVehicleRow()]);
      // 2. fetchLastClosedWorkOrder — no prior order
      (db.execute as any).mockResolvedValueOnce([[]]);

      // mockConnection.execute: INSERT wo, INSERT tasks, SELECT uuid
      mockConnection.execute
        .mockResolvedValueOnce([{ insertId: 42 }]) // INSERT upa_work_orders
        .mockResolvedValueOnce([{}]) // INSERT upa_work_order_tasks (bulk)
        .mockResolvedValueOnce([[{ uuid: 'test-uuid-1234' }]]); // SELECT uuid

      const result = await createWorkOrder('VEH-001', 'urban');

      expect(result.workOrderId).toBe(42);
      expect(result.uuid).toBe('test-uuid-1234');
      expect(result.taskCount).toBeGreaterThan(0);
      expect(mockConnection.commit).toHaveBeenCalledOnce();
      expect(mockConnection.release).toHaveBeenCalledOnce();
    });

    it('inserts mining triage tasks when fleetType is mining', async () => {
      (db.execute as any).mockResolvedValueOnce([mockVehicleRow()]);
      (db.execute as any).mockResolvedValueOnce([[]]);

      let capturedTaskValues: any[] = [];
      mockConnection.execute
        .mockResolvedValueOnce([{ insertId: 10 }]) // INSERT wo
        .mockImplementationOnce((_sql: string, vals: any[]) => {
          capturedTaskValues = vals;
          return Promise.resolve([{}]);
        })
        .mockResolvedValueOnce([[{ uuid: 'u-mining' }]]);

      const miningResult = await createWorkOrder('VEH-001', 'mining');

      const hasRotatingBeacon = capturedTaskValues.includes('triage_rotating_beacon');
      expect(hasRotatingBeacon).toBe(true);
      expect(miningResult.taskCount).toBeGreaterThan(0);
    });

    it('deduplicates cascade tasks from last closed work order', async () => {
      (db.execute as any)
        .mockResolvedValueOnce([mockVehicleRow()]) // vehicle
        .mockResolvedValueOnce([
          [
            {
              id: 1,
              closed_at: new Date('2025-01-01'),
              pending_since: null,
              task_id: 'cascade_tire_depth',
              executed: 1,
              deferred_type: null,
            },
          ],
        ]); // last closed WO has cascade_tire_depth executed

      let capturedTaskValues: any[] = [];
      mockConnection.execute
        .mockResolvedValueOnce([{ insertId: 20 }])
        .mockImplementationOnce((_sql: string, vals: any[]) => {
          capturedTaskValues = vals;
          return Promise.resolve([{}]);
        })
        .mockResolvedValueOnce([[{ uuid: 'u-dedup' }]]);

      await createWorkOrder('VEH-001', 'urban');

      // cascade_tire_depth should NOT appear in inserted task_id values
      expect(capturedTaskValues).not.toContain('cascade_tire_depth');
    });

    it('rolls back and releases connection on insert error', async () => {
      (db.execute as any).mockResolvedValueOnce([mockVehicleRow()]);
      (db.execute as any).mockResolvedValueOnce([[]]);

      mockConnection.execute
        .mockResolvedValueOnce([{ insertId: 99 }]) // INSERT wo succeeds
        .mockRejectedValueOnce(new Error('DB_WRITE_FAILURE')); // INSERT tasks fails

      await expect(createWorkOrder('VEH-001', 'urban')).rejects.toThrow('DB_WRITE_FAILURE');
      expect(mockConnection.rollback).toHaveBeenCalledOnce();
      expect(mockConnection.release).toHaveBeenCalledOnce();
    });

    it('maps Toyota brand label correctly', async () => {
      (db.execute as any).mockResolvedValueOnce([
        mockVehicleRow({ brandLabel: 'TOYOTA', fuelTypeLabel: 'Diesel' }),
      ]);
      (db.execute as any).mockResolvedValueOnce([[]]);

      let capturedTaskValues: any[] = [];
      mockConnection.execute
        .mockResolvedValueOnce([{ insertId: 5 }])
        .mockImplementationOnce((_sql: string, vals: any[]) => {
          capturedTaskValues = vals;
          return Promise.resolve([{}]);
        })
        .mockResolvedValueOnce([[{ uuid: 'u-toyota' }]]);

      await createWorkOrder('VEH-001', 'urban');

      // Toyota + diesel: toyota brand rule tasks should appear
      expect(capturedTaskValues).toContain('cascade_toyota_10k_pedals');
      // Diesel: no spark plug tasks
      expect(capturedTaskValues).not.toContain('cascade_spark_plugs_remove');
    });

    it('uses generic brand when label is unrecognized', async () => {
      (db.execute as any).mockResolvedValueOnce([
        mockVehicleRow({ brandLabel: 'FordMustang', fuelTypeLabel: 'Gasolina' }),
      ]);
      (db.execute as any).mockResolvedValueOnce([[]]);

      mockConnection.execute
        .mockResolvedValueOnce([{ insertId: 6 }])
        .mockResolvedValueOnce([{}])
        .mockResolvedValueOnce([[{ uuid: 'u-generic' }]]);

      const result = await createWorkOrder('VEH-001', 'urban');
      // generic brand = no brand-specific tasks → task count is base only
      expect(result.taskCount).toBeGreaterThan(0);
    });
  });

  // ── updateTaskStatus ────────────────────────────────────────────────────────

  describe('updateTaskStatus', () => {
    it('throws TASK_NOT_FOUND when taskId does not exist in work order', async () => {
      mockConnection.execute.mockResolvedValueOnce([[]]); // SELECT existing = empty
      await expect(updateTaskStatus(1, 'ghost_task', { status: 'completed' })).rejects.toThrow(
        'TASK_NOT_FOUND'
      );
    });

    it('updates status to completed and sets completed_at', async () => {
      mockConnection.execute
        .mockResolvedValueOnce([[{ id: 1 }]]) // SELECT existing
        .mockResolvedValueOnce([{}]); // UPDATE task

      await updateTaskStatus(1, 'triage_horn', { status: 'completed' });

      const updateCall = mockConnection.execute.mock.calls[1][0] as string;
      expect(updateCall).toContain('NOW()');
      expect(mockConnection.commit).toHaveBeenCalledOnce();
    });

    it('escalates work order to AWAITING_AUTH when task is DEFERRED_FINANCIAL', async () => {
      mockConnection.execute
        .mockResolvedValueOnce([[{ id: 1 }]]) // SELECT existing
        .mockResolvedValueOnce([{}]) // UPDATE task
        .mockResolvedValueOnce([{}]); // UPDATE work order status

      await updateTaskStatus(1, 'triage_horn', { status: 'DEFERRED_FINANCIAL' });

      const woUpdateCall = mockConnection.execute.mock.calls[2][0] as string;
      expect(woUpdateCall).toContain('AWAITING_AUTH');
      expect(woUpdateCall).toContain('pending_since');
    });

    it('escalates work order to AWAITING_AUTH when task is N_A_STRUCTURAL', async () => {
      mockConnection.execute
        .mockResolvedValueOnce([[{ id: 1 }]])
        .mockResolvedValueOnce([{}])
        .mockResolvedValueOnce([{}]);

      await updateTaskStatus(1, 'triage_horn', { status: 'N_A_STRUCTURAL' });

      const woUpdateCall = mockConnection.execute.mock.calls[2][0] as string;
      expect(woUpdateCall).toContain('AWAITING_AUTH');
    });

    it('does NOT update work order status for completed or pending transitions', async () => {
      mockConnection.execute.mockResolvedValueOnce([[{ id: 1 }]]).mockResolvedValueOnce([{}]);

      await updateTaskStatus(1, 'triage_horn', { status: 'pending' });

      // Only 2 execute calls: SELECT + UPDATE task. No WO status update.
      expect(mockConnection.execute).toHaveBeenCalledTimes(2);
    });

    it('stores evidence_urls as JSON string', async () => {
      mockConnection.execute.mockResolvedValueOnce([[{ id: 1 }]]).mockResolvedValueOnce([{}]);

      await updateTaskStatus(1, 'triage_horn', {
        status: 'completed',
        evidenceUrls: ['https://s3.example.com/photo1.jpg'],
      });

      const taskUpdateParams = mockConnection.execute.mock.calls[1][1] as any[];
      expect(taskUpdateParams[1]).toBe('["https://s3.example.com/photo1.jpg"]');
    });

    it('rolls back and releases on error', async () => {
      mockConnection.execute
        .mockResolvedValueOnce([[{ id: 1 }]])
        .mockRejectedValueOnce(new Error('LOCK_TIMEOUT'));

      await expect(updateTaskStatus(1, 'triage_horn', { status: 'completed' })).rejects.toThrow(
        'LOCK_TIMEOUT'
      );
      expect(mockConnection.rollback).toHaveBeenCalledOnce();
      expect(mockConnection.release).toHaveBeenCalledOnce();
    });
  });

  // ── closeWorkOrder ──────────────────────────────────────────────────────────

  describe('closeWorkOrder', () => {
    it('throws WORK_ORDER_NOT_FOUND when work order does not exist', async () => {
      mockConnection.execute.mockResolvedValueOnce([[]]);
      await expect(closeWorkOrder(999)).rejects.toThrow('WORK_ORDER_NOT_FOUND');
    });

    it('throws ALREADY_CLOSED when work order is already closed', async () => {
      mockConnection.execute.mockResolvedValueOnce([[{ id: 1, status: 'CLOSED' }]]);
      await expect(closeWorkOrder(1)).rejects.toThrow('ALREADY_CLOSED');
    });

    it('closes an IN_PROGRESS work order and defers pending tasks', async () => {
      mockConnection.execute
        .mockResolvedValueOnce([[{ id: 1, status: 'IN_PROGRESS' }]]) // SELECT wo
        .mockResolvedValueOnce([{}]) // UPDATE upa_work_orders → CLOSED
        .mockResolvedValueOnce([{}]); // UPDATE pending tasks → DEFERRED_FINANCIAL

      await closeWorkOrder(1);

      expect(mockConnection.commit).toHaveBeenCalledOnce();
      const taskDeferralCall = mockConnection.execute.mock.calls[2][0] as string;
      expect(taskDeferralCall).toContain('DEFERRED_FINANCIAL');
    });

    it('closes an AWAITING_AUTH work order', async () => {
      mockConnection.execute
        .mockResolvedValueOnce([[{ id: 2, status: 'AWAITING_AUTH' }]])
        .mockResolvedValueOnce([{}])
        .mockResolvedValueOnce([{}]);

      await closeWorkOrder(2);
      expect(mockConnection.commit).toHaveBeenCalledOnce();
    });

    it('rolls back and releases on error', async () => {
      mockConnection.execute
        .mockResolvedValueOnce([[{ id: 1, status: 'IN_PROGRESS' }]])
        .mockRejectedValueOnce(new Error('FK_CONSTRAINT'));

      await expect(closeWorkOrder(1)).rejects.toThrow('FK_CONSTRAINT');
      expect(mockConnection.rollback).toHaveBeenCalledOnce();
      expect(mockConnection.release).toHaveBeenCalledOnce();
    });
  });

  // ── checkAndTimeoutStage5Orders ─────────────────────────────────────────────

  describe('checkAndTimeoutStage5Orders', () => {
    it('does nothing when no AWAITING_AUTH orders exist', async () => {
      (db.execute as any).mockResolvedValueOnce([[]]);
      await checkAndTimeoutStage5Orders();
      expect(db.execute).toHaveBeenCalledOnce();
    });

    it('does nothing when AWAITING_AUTH orders have not yet exceeded 24 business hours', async () => {
      const recentPendingSince = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
      (db.execute as any).mockResolvedValueOnce([[{ id: 3, pending_since: recentPendingSince }]]);
      await checkAndTimeoutStage5Orders();
      // SELECT fires, no UPDATE because checkStage5Timeout returns false
      expect(db.execute).toHaveBeenCalledOnce();
    });

    it('closes orders that have exceeded 24 business hours', async () => {
      // 10 days ago — guaranteed > 24 business hours regardless of weekend placement
      const longAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
      (db.execute as any)
        .mockResolvedValueOnce([
          [
            { id: 5, pending_since: longAgo },
            { id: 7, pending_since: longAgo },
          ],
        ])
        .mockResolvedValueOnce([{}]);

      await checkAndTimeoutStage5Orders();

      expect(db.execute).toHaveBeenCalledTimes(2);
      const updateSql = (db.execute as any).mock.calls[1][0] as string;
      expect(updateSql).toContain('CLOSED');
      const updateParams = (db.execute as any).mock.calls[1][1] as number[];
      expect(updateParams).toEqual([5, 7]);
    });
  });

  // ── getWorkOrder ─────────────────────────────────────────────────────────────

  describe('getWorkOrder', () => {
    it('returns null when work order does not exist', async () => {
      (db.execute as any).mockResolvedValueOnce([[]]);
      const result = await getWorkOrder(999);
      expect(result).toBeNull();
    });

    it('returns work order with tasks on happy path', async () => {
      const mockRow = {
        id: 1,
        uuid: 'test-uuid-4321',
        vehicle_id: 'VEH-001',
        fleet_type: 'urban',
        status: 'IN_PROGRESS',
        pending_since: null,
        opened_at: new Date('2026-06-06'),
        closed_at: null,
        task_id: 'triage_horn',
        stage: 'triage',
        package_level: null,
        description: 'Revisión de claxon',
        task_status: 'pending',
        evidence_urls: null,
        evidence_notes: null,
        completed_at: null,
      };
      (db.execute as any).mockResolvedValueOnce([[mockRow]]);
      const result = await getWorkOrder(1);
      expect(result).not.toBeNull();
      expect(result!.id).toBe(1);
      expect(result!.uuid).toBe('test-uuid-4321');
      expect(result!.tasks).toHaveLength(1);
      expect(result!.tasks[0].taskId).toBe('triage_horn');
      expect(result!.tasks[0].status).toBe('pending');
    });

    it('parses evidence_urls JSON string into array', async () => {
      const mockRow = {
        id: 1,
        uuid: 'u',
        vehicle_id: 'V',
        fleet_type: 'urban',
        status: 'IN_PROGRESS',
        pending_since: null,
        opened_at: new Date(),
        closed_at: null,
        task_id: 'triage_horn',
        stage: 'triage',
        package_level: null,
        description: 'test',
        task_status: 'completed',
        evidence_urls: '["https://s3.example.com/photo.jpg"]',
        evidence_notes: 'nota de prueba',
        completed_at: new Date(),
      };
      (db.execute as any).mockResolvedValueOnce([[mockRow]]);
      const result = await getWorkOrder(1);
      expect(result!.tasks[0].evidenceUrls).toEqual(['https://s3.example.com/photo.jpg']);
      expect(result!.tasks[0].evidenceNotes).toBe('nota de prueba');
    });

    it('returns empty tasks array for work order with no tasks yet (LEFT JOIN returns null row)', async () => {
      const mockRow = {
        id: 1,
        uuid: 'u',
        vehicle_id: 'V',
        fleet_type: 'mining',
        status: 'IN_PROGRESS',
        pending_since: null,
        opened_at: new Date(),
        closed_at: null,
        task_id: null,
        stage: null,
        package_level: null,
        description: null,
        task_status: null,
        evidence_urls: null,
        evidence_notes: null,
        completed_at: null,
      };
      (db.execute as any).mockResolvedValueOnce([[mockRow]]);
      const result = await getWorkOrder(1);
      expect(result!.tasks).toHaveLength(0);
    });
  });
});
