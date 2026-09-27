import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import db from './db';
import { clearCounter, hitCounter, readCounter } from './authThrottle.repository';

/**
 * FC199 F2 — SQL de `auth_throttle_counters`: sentencias parametrizadas (A03), reloj de la DB y
 * reinicio de ventana dentro del mismo UPDATE atómico.
 */

vi.mock('./db', () => ({ default: { execute: vi.fn() } }));

const KEY = 'a'.repeat(64);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('hitCounter', () => {
  it('upsert atómico: reinicia la ventana vencida y evalúa counter ANTES de mover window_start', async () => {
    (db.execute as Mock)
      .mockResolvedValueOnce([{ affectedRows: 1 }, undefined])
      .mockResolvedValueOnce([[{ counter: 3, seconds_since_last: 0 }], undefined]);

    expect(await hitCounter(KEY, 900)).toBe(3);

    const [sql, params] = (db.execute as Mock).mock.calls[0];
    expect(sql).toContain('ON DUPLICATE KEY UPDATE');
    expect(sql.indexOf('counter = IF(')).toBeLessThan(sql.indexOf('window_start = IF('));
    expect(params).toEqual([KEY, 900, 900]);
  });

  it('si la lectura no encuentra fila (carrera con el reinicio), responde 1', async () => {
    (db.execute as Mock)
      .mockResolvedValueOnce([{ affectedRows: 1 }, undefined])
      .mockResolvedValueOnce([[], undefined]);

    expect(await hitCounter(KEY, 900)).toBe(1);
  });
});

describe('readCounter', () => {
  it('solo cuenta dentro de la ventana y convierte a número', async () => {
    (db.execute as Mock).mockResolvedValueOnce([
      [{ counter: '7', seconds_since_last: '2' }],
      undefined,
    ]);

    expect(await readCounter(KEY, 900)).toEqual({ counter: 7, secondsSinceLast: 2 });
    const [sql, params] = (db.execute as Mock).mock.calls[0];
    expect(sql).toContain('window_start > NOW() - INTERVAL ? SECOND');
    expect(params).toEqual([KEY, 900]);
  });

  it('sin fila vigente: null', async () => {
    (db.execute as Mock).mockResolvedValueOnce([[], undefined]);

    expect(await readCounter(KEY, 900)).toBeNull();
  });
});

describe('clearCounter', () => {
  it('borra por llave, parametrizado', async () => {
    (db.execute as Mock).mockResolvedValueOnce([{ affectedRows: 1 }, undefined]);

    await clearCounter(KEY);

    expect(db.execute).toHaveBeenCalledWith(
      'DELETE FROM auth_throttle_counters WHERE key_hash = ?',
      [KEY]
    );
  });
});
