import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import db from '../services/db';

vi.mock('../services/db', () => ({
  default: {
    execute: vi.fn().mockResolvedValue([[], undefined]),
    query: vi.fn().mockResolvedValue([[], undefined]),
    getConnection: vi.fn(() =>
      Promise.resolve({
        beginTransaction: vi.fn(),
        commit: vi.fn(),
        rollback: vi.fn(),
        release: vi.fn(),
        execute: vi.fn().mockResolvedValue([[], undefined]),
      })
    ),
  },
}));

describe('DB Hardening FaseD — fleet_movements analytical indexes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('AT-D-1: idx_fm_unit_type_status — EXPLAIN type ref (not ALL) on unit+type+status filter', async () => {
    (db.execute as Mock).mockResolvedValueOnce([
      [{ id: 'idx_fm_unit_type_status', type: 'ref', key: 'idx_fm_unit_type_status', rows: 3 }],
    ]);

    const [rows] = await db.execute(
      `EXPLAIN SELECT id, uuid, start_at FROM fleet_movements
        WHERE unit_id = 'PIIC-101'
          AND movement_type = 'ROUTE'
          AND status = 'COMPLETED'`
    );

    const plan = (rows as { type: string; key: string }[])[0];
    expect(plan.type).not.toBe('ALL');
    expect(plan.key).toBe('idx_fm_unit_type_status');
  });

  it('AT-D-2: idx_fm_kpi_coverage — EXPLAIN uses extended index for date range analytics', async () => {
    (db.execute as Mock).mockResolvedValueOnce([
      [{ type: 'range', key: 'idx_fm_kpi_coverage', rows: 12 }],
    ]);

    const [rows] = await db.execute(
      `EXPLAIN SELECT unit_id, COUNT(*) FROM fleet_movements
        WHERE unit_id = 'PIIC-101'
          AND movement_type = 'ROUTE'
          AND status = 'COMPLETED'
          AND end_at >= '2026-01-01'`
    );

    const plan = (rows as { type: string; key: string }[])[0];
    expect(plan.type).not.toBe('ALL');
    expect(plan.key).toBe('idx_fm_kpi_coverage');
  });

  it('AT-D-3: idx_fm_created_by_user — SHOW INDEX confirms index exists on created_by_user_id', async () => {
    (db.execute as Mock).mockResolvedValueOnce([
      [
        {
          Table: 'fleet_movements',
          Key_name: 'idx_fm_created_by_user',
          Column_name: 'created_by_user_id',
          Index_type: 'BTREE',
        },
      ],
    ]);

    const [rows] = await db.execute(
      `SHOW INDEX FROM fleet_movements WHERE Key_name = 'idx_fm_created_by_user'`
    );

    const idx = (rows as { Key_name: string; Column_name: string }[])[0];
    expect(idx.Key_name).toBe('idx_fm_created_by_user');
    expect(idx.Column_name).toBe('created_by_user_id');
  });
});
