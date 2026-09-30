import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import db from './db';
import {
  clearExpiredClearIps,
  deleteOldSecurityEvents,
  deleteStaleDenylistEntries,
  upsertSecurityEvent,
} from './securityEvents.repository';

/** FC201 F1 — SQL de `security_events` y `security_manual_denylist`: agregado, parametrizado, reloj de la DB. */

vi.mock('./db', () => ({ default: { execute: vi.fn() } }));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('upsertSecurityEvent (FC201 F2)', () => {
  it('Inv-2: upsert por la llave (tipo, ip_hash, hora de la DB, carnada); suma los toques coalescidos', async () => {
    (db.execute as Mock).mockResolvedValueOnce([{ affectedRows: 1 }, undefined]);

    await upsertSecurityEvent({
      eventType: 'BAIT_ROUTE',
      ipHash: 'a'.repeat(64),
      ipAddress: '203.0.113.9',
      targetPattern: '/wp-admin/*',
      samplePath: '/wp-admin/setup.php',
      hits: 7,
    });

    const [sql, params] = (db.execute as Mock).mock.calls[0];
    expect(sql).toContain("DATE_FORMAT(NOW(), '%Y-%m-%d %H:00:00')");
    expect(sql).toContain('hit_count = hit_count + ?');
    expect(sql).toContain('sample_path = VALUES(sample_path)');
    expect(params).toEqual([
      'BAIT_ROUTE',
      'a'.repeat(64),
      '203.0.113.9',
      '/wp-admin/*',
      '/wp-admin/setup.php',
      7,
      7,
    ]);
  });
});

describe('ciclo de vida (Inv-4)', () => {
  it('a los 15 días vacía la IP en claro en AMBAS tablas y suma lo afectado', async () => {
    (db.execute as Mock)
      .mockResolvedValueOnce([{ affectedRows: 3 }, undefined])
      .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]);

    expect(await clearExpiredClearIps()).toBe(4);
    const statements = (db.execute as Mock).mock.calls.map(([sql]) => sql as string);
    expect(statements[0]).toMatch(/UPDATE security_events SET ip_address = NULL[\s\S]*15 DAY/);
    expect(statements[1]).toMatch(
      /UPDATE security_manual_denylist SET ip_address = NULL[\s\S]*15 DAY/
    );
  });

  it('a los 90 días borra el evento completo', async () => {
    (db.execute as Mock).mockResolvedValueOnce([{ affectedRows: 5 }, undefined]);

    expect(await deleteOldSecurityEvents()).toBe(5);
    expect(db.execute).toHaveBeenCalledWith(
      'DELETE FROM security_events WHERE created_at < NOW() - INTERVAL 90 DAY'
    );
  });

  it('bloqueos vencidos o revocados hace más de 30 días salen de la lista', async () => {
    (db.execute as Mock).mockResolvedValueOnce([{ affectedRows: 2 }, undefined]);

    expect(await deleteStaleDenylistEntries()).toBe(2);
    const [sql] = (db.execute as Mock).mock.calls[0];
    expect(sql).toContain('COALESCE(revoked_at, expires_at) < NOW() - INTERVAL 30 DAY');
  });
});
