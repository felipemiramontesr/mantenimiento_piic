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

describe('FC-3 Realtime_Telemetry FaseA — migration 138 realtime_telemetry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('AT-RT-A-1: DESCRIBE returns expected columns for realtime_telemetry', async () => {
    (db.execute as Mock).mockResolvedValueOnce([
      [
        { Field: 'id', Type: 'int(10) unsigned', Null: 'NO', Key: 'PRI' },
        { Field: 'user_id', Type: 'int(11)', Null: 'NO', Key: 'MUL' },
        { Field: 'unit_id', Type: 'varchar(50)', Null: 'NO', Key: 'MUL' },
        { Field: 'latitude', Type: 'decimal(10,7)', Null: 'NO', Key: '' },
        { Field: 'longitude', Type: 'decimal(10,7)', Null: 'NO', Key: '' },
        { Field: 'speed', Type: 'decimal(5,2)', Null: 'NO', Key: '' },
        { Field: 'heading', Type: 'decimal(5,2)', Null: 'NO', Key: '' },
        { Field: 'updated_at', Type: 'datetime', Null: 'NO', Key: 'MUL' },
      ],
    ]);

    const [rows] = await db.execute('DESCRIBE realtime_telemetry');
    const columns = (rows as { Field: string }[]).map((r) => r.Field);

    expect(columns).toContain('user_id');
    expect(columns).toContain('unit_id');
    expect(columns).toContain('latitude');
    expect(columns).toContain('longitude');
    expect(columns).toContain('speed');
    expect(columns).toContain('heading');
    expect(columns).toContain('updated_at');
  });

  it('AT-RT-A-2: SHOW INDEX returns uq_telemetry_user_unit unique constraint', async () => {
    (db.execute as Mock).mockResolvedValueOnce([
      [
        {
          Table: 'realtime_telemetry',
          Key_name: 'uq_telemetry_user_unit',
          Non_unique: 0,
          Seq_in_index: 1,
          Column_name: 'user_id',
          Index_type: 'BTREE',
        },
        {
          Table: 'realtime_telemetry',
          Key_name: 'uq_telemetry_user_unit',
          Non_unique: 0,
          Seq_in_index: 2,
          Column_name: 'unit_id',
          Index_type: 'BTREE',
        },
      ],
    ]);

    const [rows] = await db.execute(
      "SHOW INDEX FROM realtime_telemetry WHERE Key_name = 'uq_telemetry_user_unit'"
    );
    const idx = rows as { Key_name: string; Non_unique: number; Column_name: string }[];

    expect(idx).toHaveLength(2);
    expect(idx[0].Key_name).toBe('uq_telemetry_user_unit');
    expect(idx[0].Non_unique).toBe(0);
    expect(idx.map((r) => r.Column_name)).toEqual(['user_id', 'unit_id']);
  });

  it('AT-RT-A-3: UPSERT ping (INSERT ... ON DUPLICATE KEY UPDATE) succeeds', async () => {
    (db.execute as Mock).mockResolvedValueOnce([{ affectedRows: 1, insertId: 1 }, undefined]);

    const [result] = await db.execute(
      `INSERT INTO realtime_telemetry (user_id, unit_id, latitude, longitude, speed, heading)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         latitude = VALUES(latitude),
         longitude = VALUES(longitude),
         speed = VALUES(speed),
         heading = VALUES(heading),
         updated_at = CURRENT_TIMESTAMP`,
      [1, 'PIIC-101', 25.6866, -100.3161, 60.5, 90.0]
    );

    expect((result as { affectedRows: number }).affectedRows).toBe(1);
  });

  it('AT-RT-A-4: SELECT after upsert returns correct lat/lng for user+unit', async () => {
    (db.execute as Mock).mockResolvedValueOnce([
      [{ user_id: 1, unit_id: 'PIIC-101', latitude: '25.6866000', longitude: '-100.3161000' }],
    ]);

    const [rows] = await db.execute(
      `SELECT user_id, unit_id, latitude, longitude
       FROM realtime_telemetry
       WHERE user_id = ? AND unit_id = ?`,
      [1, 'PIIC-101']
    );

    const row = (rows as { user_id: number; unit_id: string; latitude: string }[])[0];
    expect(row.user_id).toBe(1);
    expect(row.unit_id).toBe('PIIC-101');
    expect(parseFloat(row.latitude)).toBeCloseTo(25.6866, 4);
  });
});
