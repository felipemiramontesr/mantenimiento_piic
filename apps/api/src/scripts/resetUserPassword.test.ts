/**
 * FC169 — Password_Reset_CLI_Utility.
 * Cubre los 4 escenarios Gherkin del FC vía el núcleo testeable `resetUserPassword`:
 *  1. Happy Path — ∃! usuario → argon2Hash(password) sin opciones (R1) → UPDATE transaccional
 *     de SOLO `password_hash` por username (R3) → commit → devuelve {id, is_active}.
 *  2. Usuario inexistente (0 filas) → throw, 0 escritura, 0 transacción.
 *  3. Ambigüedad (≥2 filas) → throw, 0 escritura.
 *  +  Rollback si el UPDATE falla · nunca se imprime hash ni contraseña (R2).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const argon2HashMock = vi.hoisted(() => vi.fn(async (pwd: string) => `argon2$hash-of:${pwd}`));
vi.mock('@node-rs/argon2', () => ({ hash: argon2HashMock }));

// eslint-disable-next-line import/first
import { resetUserPassword, ResetableConnection } from './resetUserPassword';

function makeConn(rows: Array<{ id: number; username: string; is_active: number }>): {
  conn: ResetableConnection;
  calls: { execute: Array<{ sql: string; values: unknown[] }>; tx: string[] };
} {
  type Row = { id: number; username: string; is_active: number };
  const calls = { execute: [] as Array<{ sql: string; values: unknown[] }>, tx: [] as string[] };
  const conn: ResetableConnection = {
    execute: vi.fn(async (sql: string, values: unknown[]): Promise<[Row[], unknown]> => {
      calls.execute.push({ sql, values });
      return sql.startsWith('SELECT') ? [rows, undefined] : [[], undefined];
    }),
    beginTransaction: vi.fn(async () => {
      calls.tx.push('begin');
    }),
    commit: vi.fn(async () => {
      calls.tx.push('commit');
    }),
    rollback: vi.fn(async () => {
      calls.tx.push('rollback');
    }),
  };
  return { conn, calls };
}

describe('FC169 · resetUserPassword (núcleo)', () => {
  beforeEach(() => {
    argon2HashMock.mockClear();
  });

  it('Scenario 1 — happy path: hashea con argon2Hash(password) sin opciones y hace UPDATE transaccional de solo password_hash', async () => {
    const { conn, calls } = makeConn([{ id: 29, username: 'GrayMan', is_active: 1 }]);

    const result = await resetUserPassword(conn, 'GrayMan', 'nuevaClave123');

    // R1 — misma API que el alta: 1 solo argumento, sin objeto de opciones.
    expect(argon2HashMock).toHaveBeenCalledTimes(1);
    expect(argon2HashMock).toHaveBeenCalledWith('nuevaClave123');
    expect(argon2HashMock.mock.calls[0]).toHaveLength(1);

    // R3 — UPDATE transaccional, solo password_hash, por username.
    const update = calls.execute.find((c) => c.sql.startsWith('UPDATE'));
    expect(update?.sql).toBe('UPDATE users SET password_hash = ? WHERE username = ?');
    expect(update?.values).toEqual(['argon2$hash-of:nuevaClave123', 'GrayMan']);
    expect(calls.tx).toEqual(['begin', 'commit']);

    expect(result).toEqual({ id: 29, isActive: 1 });
  });

  it('Scenario 2 — usuario inexistente: lanza y NO abre transacción ni hace UPDATE', async () => {
    const { conn, calls } = makeConn([]);

    await expect(resetUserPassword(conn, 'NoExiste', 'x'.repeat(10))).rejects.toThrow(
      'Usuario no encontrado'
    );
    expect(calls.tx).toEqual([]);
    expect(calls.execute.some((c) => c.sql.startsWith('UPDATE'))).toBe(false);
    expect(argon2HashMock).not.toHaveBeenCalled();
  });

  it('Scenario 3 — ambigüedad (≥2 filas): lanza y NO hace UPDATE', async () => {
    const { conn, calls } = makeConn([
      { id: 1, username: 'dup', is_active: 1 },
      { id: 2, username: 'dup', is_active: 1 },
    ]);

    await expect(resetUserPassword(conn, 'dup', 'y'.repeat(10))).rejects.toThrow('Ambigüedad');
    expect(calls.execute.some((c) => c.sql.startsWith('UPDATE'))).toBe(false);
  });

  it('rollback si el UPDATE falla, y re-lanza el error', async () => {
    const { conn, calls } = makeConn([{ id: 29, username: 'GrayMan', is_active: 1 }]);
    (conn.execute as ReturnType<typeof vi.fn>).mockImplementationOnce(async () => [
      [{ id: 29, username: 'GrayMan', is_active: 1 }] as never,
      undefined,
    ]);
    (conn.execute as ReturnType<typeof vi.fn>).mockImplementationOnce(async () => {
      throw new Error('DB caída');
    });

    await expect(resetUserPassword(conn, 'GrayMan', 'clave-larga-1')).rejects.toThrow('DB caída');
    expect(calls.tx).toEqual(['begin', 'rollback']);
  });

  it('R2 — nunca imprime el hash ni la contraseña por consola', async () => {
    const { conn } = makeConn([{ id: 29, username: 'GrayMan', is_active: 1 }]);
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await resetUserPassword(conn, 'GrayMan', 'secreto-que-no-debe-verse');

    const printed = [...logSpy.mock.calls, ...errSpy.mock.calls].flat().join(' ');
    expect(printed).not.toContain('secreto-que-no-debe-verse');
    expect(printed).not.toContain('argon2$hash-of:');
    logSpy.mockRestore();
    errSpy.mockRestore();
  });
});
