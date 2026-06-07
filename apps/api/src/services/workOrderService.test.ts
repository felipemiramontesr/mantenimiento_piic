/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createWorkOrder,
  updateTaskStatus,
  closeWorkOrder,
  checkAndTimeoutStage5Orders,
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
    it('does nothing when no timed-out orders exist', async () => {
      (db.execute as any).mockResolvedValueOnce([[]]); // SELECT returns empty
      await checkAndTimeoutStage5Orders();
      expect(db.execute).toHaveBeenCalledOnce();
    });

    it('closes timed-out AWAITING_AUTH orders', async () => {
      (db.execute as any)
        .mockResolvedValueOnce([[{ id: 5 }, { id: 7 }]]) // SELECT timed-out orders
        .mockResolvedValueOnce([{}]); // UPDATE batch close

      await checkAndTimeoutStage5Orders();

      expect(db.execute).toHaveBeenCalledTimes(2);
      const updateSql = (db.execute as any).mock.calls[1][0] as string;
      expect(updateSql).toContain('CLOSED');
      const updateParams = (db.execute as any).mock.calls[1][1] as number[];
      expect(updateParams).toEqual([5, 7]);
    });
  });
});
