import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Pool } from 'mysql2/promise';
import {
  listCredentials,
  confirmEmailCredential,
  replaceOtherMethods,
  markEmailVerified,
  insertEmailChallenge,
  rotateEmailChallengeCode,
  findChallengeById,
  MAX_EMAIL_RESENDS,
} from './mfa.repository';
import { hasAnyMuMembership } from './cosmonaut.repository';

/**
 * FC195 F2 — frontera SQL del 2FA por correo (migración 178). Mismo patrón de executor directo que
 * `mfa.repository.test.ts`: se verifica el SQL exacto que llega a la DB, incluido que la vida del
 * código y la espera entre envíos usan el reloj de la DB (Invariante 4).
 */

const execute = vi.fn();
const executor = { execute } as unknown as Pool;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('listCredentials', () => {
  it('regresa tipo y estado de todas las credenciales, con is_confirmed como booleano', async () => {
    execute.mockResolvedValueOnce([
      [
        { type: 'totp', is_confirmed: 0 },
        { type: 'email', is_confirmed: 1 },
      ],
      [],
    ]);

    const result = await listCredentials(501, executor);

    expect(result).toEqual([
      { type: 'totp', confirmed: false },
      { type: 'email', confirmed: true },
    ]);
    expect(execute).toHaveBeenCalledWith(
      'SELECT type, is_confirmed FROM user_mfa_credentials WHERE user_id = ?',
      [501]
    );
  });
});

describe('confirmEmailCredential', () => {
  it("activa la credencial 'email' SIN secreto (upsert por UNIQUE(user_id, type))", async () => {
    execute.mockResolvedValueOnce([{}, []]);

    await confirmEmailCredential(501, executor);

    const [sql, params] = execute.mock.calls[0];
    expect(sql).toContain("VALUES (?, 'email', NULL, 1, NOW())");
    expect(sql).toContain('ON DUPLICATE KEY UPDATE');
    expect(sql).toContain('secret_encrypted = NULL');
    expect(params).toEqual([501]);
  });
});

describe('replaceOtherMethods', () => {
  it('borra las credenciales de otro tipo y TODOS los respaldos previos del usuario', async () => {
    execute.mockResolvedValue([{}, []]);

    await replaceOtherMethods(501, 'email', executor);

    expect(execute).toHaveBeenNthCalledWith(
      1,
      'DELETE FROM user_mfa_credentials WHERE user_id = ? AND type <> ?',
      [501, 'email']
    );
    expect(execute).toHaveBeenNthCalledWith(
      2,
      'DELETE FROM user_mfa_backup_codes WHERE user_id = ?',
      [501]
    );
  });
});

describe('markEmailVerified', () => {
  it('sella email_verified_at conservando la primera fecha (COALESCE)', async () => {
    execute.mockResolvedValueOnce([{}, []]);

    await markEmailVerified(501, executor);

    expect(execute).toHaveBeenCalledWith(
      'UPDATE users SET email_verified_at = COALESCE(email_verified_at, NOW()) WHERE id = ?',
      [501]
    );
  });
});

describe('insertEmailChallenge', () => {
  it('guarda solo el hash, canal email, TTL de 10 min y último envío con el reloj de la DB', async () => {
    execute.mockResolvedValueOnce([{}, []]);

    await insertEmailChallenge('uuid-e', 501, 'argon2-hash', executor);

    const [sql, params] = execute.mock.calls[0];
    expect(sql).toContain("VALUES (?, ?, 'email', ?, NOW() + INTERVAL 10 MINUTE, NOW())");
    expect(params).toEqual(['uuid-e', 501, 'argon2-hash']);
  });
});

describe('rotateEmailChallengeCode', () => {
  it('reemplaza el código solo si el reto sigue abierto, quedan reenvíos y pasó la espera', async () => {
    execute.mockResolvedValueOnce([{ affectedRows: 1 }, []]);

    const rotated = await rotateEmailChallengeCode(7, 'new-hash', executor);

    expect(rotated).toBe(true);
    const [sql, params] = execute.mock.calls[0];
    expect(sql).toContain('expires_at = NOW() + INTERVAL 10 MINUTE');
    expect(sql).toContain('resend_count = resend_count + 1');
    expect(sql).toContain("channel = 'email' AND revoked = 0");
    expect(sql).toContain('resend_count < 2');
    expect(sql).toContain('last_sent_at <= NOW() - INTERVAL 60 SECOND');
    expect(params).toEqual(['new-hash', 7]);
    expect(MAX_EMAIL_RESENDS).toBe(2);
  });

  it('false cuando el UPDATE no aplica (carrera, límite o espera)', async () => {
    execute.mockResolvedValueOnce([{ affectedRows: 0 }, []]);

    expect(await rotateEmailChallengeCode(7, 'new-hash', executor)).toBe(false);
  });
});

describe('findChallengeById (FC195)', () => {
  it('calcula vigencia y espera con el reloj de la DB', async () => {
    execute.mockResolvedValueOnce([[{ id: 1, channel: 'email', is_live: 1 }], []]);

    const row = await findChallengeById('uuid-1', executor);

    expect(row).toMatchObject({ id: 1, channel: 'email', is_live: 1 });
    const [sql] = execute.mock.calls[0];
    expect(sql).toContain('(expires_at IS NOT NULL AND expires_at > NOW()) AS is_live');
    expect(sql).toContain(
      '(last_sent_at IS NULL OR last_sent_at <= NOW() - INTERVAL 60 SECOND) AS cooldown_over'
    );
  });
});

describe('hasAnyMuMembership (R10 / Invariante 9)', () => {
  it('true si el usuario es MU en cualquier universo', async () => {
    execute.mockResolvedValueOnce([[{ 1: 1 }], []]);

    expect(await hasAnyMuMembership(10, executor)).toBe(true);
    expect(execute).toHaveBeenCalledWith(
      "SELECT 1 FROM tenant_user_memberships WHERE user_id = ? AND cosmonaut_type = 'MU' LIMIT 1",
      [10]
    );
  });

  it('false si no tiene ninguna membresía MU', async () => {
    execute.mockResolvedValueOnce([[], []]);

    expect(await hasAnyMuMembership(10, executor)).toBe(false);
  });
});
