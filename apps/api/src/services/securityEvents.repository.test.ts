import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import db from './db';
import {
  clearExpiredClearIps,
  deleteOldSecurityEvents,
  deleteStaleDenylistEntries,
  listActiveDenylist,
  listRecentSecurityEvents,
  revokeDenylistEntry,
  upsertDenylistEntry,
  upsertSecurityEvent,
} from './securityEvents.repository';

/** FC201 F1 — SQL de `security_events` y `security_manual_denylist`: agregado, parametrizado, reloj de la DB. */

vi.mock('./db', () => ({ default: { execute: vi.fn() }, MEXICO_TZ_OFFSET: '-06:00' }));

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

describe('consola de Ω (FC201 F3)', () => {
  it('P3: eventos de 15 días agregados por (tipo, ip, carnada), con fechas UTC desde el huso de la DB', async () => {
    const rows = [{ event_type: 'BAIT_ROUTE', hits: '4' }];
    (db.execute as Mock).mockResolvedValueOnce([rows, undefined]);

    expect(await listRecentSecurityEvents()).toBe(rows);
    const [sql, params] = (db.execute as Mock).mock.calls[0];
    expect(sql).toContain('INTERVAL 15 DAY');
    expect(sql).toContain('GROUP BY event_type, ip_hash, target_pattern');
    expect(sql).toContain("CONVERT_TZ(MIN(first_seen_at), ?, '+00:00')");
    expect(params).toEqual(['-06:00', '-06:00']);
  });

  it('bloqueos vigentes: ni revocados ni vencidos, con segundos restantes del reloj de la DB', async () => {
    (db.execute as Mock).mockResolvedValueOnce([[], undefined]);

    await listActiveDenylist();
    const [sql, params] = (db.execute as Mock).mock.calls[0];
    expect(sql).toContain('revoked_at IS NULL AND expires_at > NOW()');
    expect(sql).toContain('TIMESTAMPDIFF(SECOND, NOW(), expires_at)');
    expect(params).toEqual(['-06:00']);
  });

  it('P4: el alta vence en N horas y un re-bloqueo anula la revocación y reinicia la ventana', async () => {
    (db.execute as Mock).mockResolvedValueOnce([{ affectedRows: 1 }, undefined]);

    await upsertDenylistEntry({
      ipHash: 'h'.repeat(64),
      ipAddress: '203.0.113.9',
      reason: null,
      hours: 24,
      createdBy: 1,
    });
    const [sql, params] = (db.execute as Mock).mock.calls[0];
    expect(sql).toContain('NOW() + INTERVAL ? HOUR');
    expect(sql).toContain('revoked_at = NULL');
    expect(sql).toContain('created_at = CURRENT_TIMESTAMP');
    expect(params).toEqual(['h'.repeat(64), '203.0.113.9', null, 24, 1]);
  });

  it('revocar solo toca un bloqueo vigente e informa si existía', async () => {
    (db.execute as Mock)
      .mockResolvedValueOnce([{ affectedRows: 1 }, undefined])
      .mockResolvedValueOnce([{ affectedRows: 0 }, undefined]);

    expect(await revokeDenylistEntry('h'.repeat(64))).toBe(true);
    expect(await revokeDenylistEntry('h'.repeat(64))).toBe(false);
    expect((db.execute as Mock).mock.calls[0][0]).toContain('revoked_at IS NULL');
  });
});
