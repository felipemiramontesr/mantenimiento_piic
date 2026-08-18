/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { createWorkOrder } from './workOrderService';
import db from './db';

/**
 * FC162 F3 (100% mandatorio) — createWorkOrder's `if (output.tasks.length > 0)`
 * (workOrderService.ts:223) never saw the empty-tasks branch, since every
 * existing test's vehicle profile produces at least one real UPA task via the
 * real `calculateUpaOrder` engine. Isolated here with `calculateUpaOrder`
 * mocked directly, so the bulk-INSERT of `upa_work_order_tasks` is proven
 * skipped when a vehicle profile legitimately needs zero tasks.
 */

vi.mock('./upaEngine', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./upaEngine')>();
  return {
    ...actual,
    calculateUpaOrder: vi.fn(() => ({ tasks: [], validationErrors: [] })),
  };
});

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

describe('createWorkOrder — zero-task work order (line 223 false branch)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConnection.execute.mockResolvedValue([[]]);
  });

  it('skips the bulk task INSERT when calculateUpaOrder returns zero tasks', async () => {
    (db.execute as any).mockResolvedValueOnce([
      [{ id: 'VEH-001', odometer: 100, brandLabel: 'Toyota', fuelTypeCode: 'F_GAS' }],
    ]); // fetchVehicleProfile
    (db.execute as any).mockResolvedValueOnce([[]]); // fetchLastClosedWorkOrder

    mockConnection.execute
      .mockResolvedValueOnce([{ insertId: 77 }]) // INSERT upa_work_orders
      .mockResolvedValueOnce([[{ uuid: 'zero-task-uuid' }]]); // SELECT uuid (no task INSERT in between)

    const result = await createWorkOrder('VEH-001');

    expect(result.taskCount).toBe(0);
    expect(mockConnection.execute).toHaveBeenCalledTimes(2); // solo INSERT wo + SELECT uuid
    const sqls = mockConnection.execute.mock.calls.map((c: any[]) => String(c[0]));
    expect(sqls.some((s) => s.includes('upa_work_order_tasks'))).toBe(false);
  });
});
