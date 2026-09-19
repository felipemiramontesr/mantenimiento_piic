import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import db from './db';
import { findUserContactById } from './mailDiagnostic.repository';

vi.mock('./db', () => ({ default: { execute: vi.fn() } }));

/** FC188 F1 — lee solo id/username/email (nunca `SELECT *`, no se trae `password_hash`). */
describe('FC188 F1 — findUserContactById', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devuelve la fila del usuario y consulta solo las 3 columnas necesarias', async () => {
    const row = { id: 7, username: 'grayman', email: 'enc_x' };
    (db.execute as Mock).mockResolvedValue([[row], undefined]);

    await expect(findUserContactById(7)).resolves.toEqual(row);

    const [sql, params] = (db.execute as Mock).mock.calls[0];
    expect(sql).toBe('SELECT id, username, email FROM users WHERE id = ?');
    expect(sql).not.toContain('*');
    expect(params).toEqual([7]);
  });

  it('devuelve null si el usuario no existe', async () => {
    (db.execute as Mock).mockResolvedValue([[], undefined]);
    await expect(findUserContactById(999)).resolves.toBeNull();
  });

  it('usa el executor recibido en vez de db (participa en una TX del llamador)', async () => {
    const execute = vi.fn().mockResolvedValue([[], undefined]);

    await findUserContactById(1, { execute } as never);

    expect(execute).toHaveBeenCalledTimes(1);
    expect(db.execute).not.toHaveBeenCalled();
  });
});
