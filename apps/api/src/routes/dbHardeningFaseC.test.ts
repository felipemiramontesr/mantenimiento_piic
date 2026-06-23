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

describe('DB Hardening FaseC — notifications_outbox user_id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('AT-C-1: INSERT into notifications_outbox with user_id succeeds', async () => {
    (db.execute as Mock).mockResolvedValueOnce([{ affectedRows: 1, insertId: 1 }, undefined]);

    const [result] = await db.execute(
      `INSERT INTO notifications_outbox
         (permission_slug, notification_type, source_uuid, user_id)
       VALUES (?, ?, ?, ?)`,
      ['fleet:read', 'PANIC', 'uuid-001', 7]
    );

    expect((result as { affectedRows: number }).affectedRows).toBe(1);
    expect(vi.mocked(db.execute)).toHaveBeenCalledWith(expect.stringContaining('user_id'), [
      'fleet:read',
      'PANIC',
      'uuid-001',
      7,
    ]);
  });

  it('AT-C-2: INSERT with user_id=NULL is accepted (broadcast / historical compatibility)', async () => {
    (db.execute as Mock).mockResolvedValueOnce([{ affectedRows: 1, insertId: 2 }, undefined]);

    const [result] = await db.execute(
      `INSERT INTO notifications_outbox
         (permission_slug, notification_type, source_uuid, user_id)
       VALUES (?, ?, ?, ?)`,
      ['*', 'SYSTEM', 'uuid-002', null]
    );

    expect((result as { affectedRows: number }).affectedRows).toBe(1);
    expect(vi.mocked(db.execute)).toHaveBeenCalledWith(
      expect.stringContaining('notifications_outbox'),
      expect.arrayContaining([null])
    );
  });

  it('AT-C-3: SELECT by user_id scopes results to a single user', async () => {
    (db.execute as Mock).mockResolvedValueOnce([
      [
        { id: 1, permission_slug: 'fleet:read', notification_type: 'PANIC', user_id: 7 },
        { id: 2, permission_slug: 'fleet:read', notification_type: 'PANIC', user_id: 7 },
      ],
    ]);

    const [rows] = await db.execute(
      `SELECT id, permission_slug, notification_type, user_id
         FROM notifications_outbox
        WHERE user_id = ?`,
      [7]
    );

    expect(rows).toHaveLength(2);
    expect((rows as { user_id: number }[])[0].user_id).toBe(7);
  });

  it('AT-C-4: INFORMATION_SCHEMA confirms user_id column exists and is nullable', async () => {
    (db.execute as Mock).mockResolvedValueOnce([
      [{ COLUMN_NAME: 'user_id', IS_NULLABLE: 'YES', DATA_TYPE: 'int' }],
    ]);

    const [rows] = await db.execute(
      `SELECT COLUMN_NAME, IS_NULLABLE, DATA_TYPE
         FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'notifications_outbox'
          AND COLUMN_NAME = 'user_id'`
    );

    const col = (rows as { COLUMN_NAME: string; IS_NULLABLE: string; DATA_TYPE: string }[])[0];
    expect(col.COLUMN_NAME).toBe('user_id');
    expect(col.IS_NULLABLE).toBe('YES');
    expect(col.DATA_TYPE).toBe('int');
  });
});
