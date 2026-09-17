/* eslint-disable */
// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Pool } from 'mysql2/promise';
import {
  upsertPendingCredential,
  findCredentialByUserId,
  confirmCredential,
  insertBackupCodes,
  updateLastUsedStep,
  deleteMfaCredentialAndBackups,
  findUnusedBackupCodes,
  markBackupCodeUsed,
  insertChallenge,
  findChallengeById,
  incrementChallengeAttempts,
  revokeChallenge,
} from './mfa.repository';

/**
 * FC185 F1/F2 — Sovereign_MFA_TOTP_Two_Step_Authentication. Mismo patrón de executor directo (sin
 * `vi.mock('./db')`) que `universeUserLinking.repository.test.ts`.
 */

const mockExecutor = { execute: vi.fn() } as unknown as Pool;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('upsertPendingCredential', () => {
  it('INSERT ... ON DUPLICATE KEY UPDATE reemplaza el secreto pendiente y limpia last_used_step', async () => {
    vi.mocked(mockExecutor.execute).mockResolvedValueOnce([{}, []]);
    await upsertPendingCredential(501, 'totp', 'enc_secret', mockExecutor);

    const [sql, params] = vi.mocked(mockExecutor.execute).mock.calls[0];
    expect(sql).toContain('INSERT INTO user_mfa_credentials');
    expect(sql).toContain('ON DUPLICATE KEY UPDATE');
    expect(sql).toContain('is_confirmed = 0');
    expect(sql).toContain('last_used_step = NULL');
    expect(params).toEqual([501, 'totp', 'enc_secret']);
  });
});

describe('findCredentialByUserId', () => {
  it('returns the credential row for (user_id, type)', async () => {
    const row = {
      id: 9,
      user_id: 501,
      type: 'totp',
      secret_encrypted: 'enc_secret',
      is_confirmed: 0,
      last_used_step: null,
    };
    vi.mocked(mockExecutor.execute).mockResolvedValueOnce([[row], []]);
    expect(await findCredentialByUserId(501, 'totp', mockExecutor)).toEqual(row);
    expect(mockExecutor.execute).toHaveBeenCalledWith(expect.any(String), [501, 'totp']);
  });

  it('returns null when no credential exists', async () => {
    vi.mocked(mockExecutor.execute).mockResolvedValueOnce([[], []]);
    expect(await findCredentialByUserId(501, 'totp', mockExecutor)).toBeNull();
  });
});

describe('confirmCredential', () => {
  it('activa la credencial y graba el step consumido (R6 anti-replay desde la confirmación)', async () => {
    vi.mocked(mockExecutor.execute).mockResolvedValueOnce([{}, []]);
    await confirmCredential(9, 12345, mockExecutor);

    const [sql, params] = vi.mocked(mockExecutor.execute).mock.calls[0];
    expect(sql).toContain('SET is_confirmed = 1');
    expect(sql).toContain('last_used_step = ?');
    expect(sql).toContain('last_used_at = NOW()');
    expect(params).toEqual([12345, 9]);
  });
});

describe('insertBackupCodes', () => {
  it('inserta los 8 hashes en una sola sentencia con placeholders generados', async () => {
    vi.mocked(mockExecutor.execute).mockResolvedValueOnce([{}, []]);
    const hashes = Array.from({ length: 8 }, (_, i) => `hash_${i}`);
    await insertBackupCodes(501, hashes, mockExecutor);

    const [sql, params] = vi.mocked(mockExecutor.execute).mock.calls[0];
    expect(sql).toContain('INSERT INTO user_mfa_backup_codes (user_id, code_hash) VALUES');
    expect((sql.match(/\(\?, \?\)/g) ?? []).length).toBe(8);
    expect(params).toEqual(hashes.flatMap((h) => [501, h]));
  });

  it('no ejecuta ninguna query cuando la lista de hashes está vacía', async () => {
    await insertBackupCodes(501, [], mockExecutor);
    expect(mockExecutor.execute).not.toHaveBeenCalled();
  });
});

describe('updateLastUsedStep', () => {
  it('graba el step consumido sin tocar is_confirmed (credencial ya activa)', async () => {
    vi.mocked(mockExecutor.execute).mockResolvedValueOnce([{}, []]);
    await updateLastUsedStep(9, 54321, mockExecutor);

    const [sql, params] = vi.mocked(mockExecutor.execute).mock.calls[0];
    expect(sql).toContain('SET last_used_step = ?');
    expect(sql).toContain('last_used_at = NOW()');
    expect(sql).not.toContain('is_confirmed');
    expect(params).toEqual([54321, 9]);
  });
});

describe('deleteMfaCredentialAndBackups', () => {
  it('borra credencial y backups del usuario (reset de Ω)', async () => {
    vi.mocked(mockExecutor.execute).mockResolvedValueOnce([{}, []]).mockResolvedValueOnce([{}, []]);
    await deleteMfaCredentialAndBackups(501, mockExecutor);

    expect(mockExecutor.execute).toHaveBeenNthCalledWith(
      1,
      'DELETE FROM user_mfa_credentials WHERE user_id = ?',
      [501]
    );
    expect(mockExecutor.execute).toHaveBeenNthCalledWith(
      2,
      'DELETE FROM user_mfa_backup_codes WHERE user_id = ?',
      [501]
    );
  });
});

describe('findUnusedBackupCodes', () => {
  it('returns rows not yet consumed (used_at IS NULL)', async () => {
    const rows = [
      { id: 1, code_hash: 'h1' },
      { id: 2, code_hash: 'h2' },
    ];
    vi.mocked(mockExecutor.execute).mockResolvedValueOnce([rows, []]);
    expect(await findUnusedBackupCodes(501, mockExecutor)).toEqual(rows);

    const [sql, params] = vi.mocked(mockExecutor.execute).mock.calls[0];
    expect(sql).toContain('used_at IS NULL');
    expect(params).toEqual([501]);
  });
});

describe('markBackupCodeUsed', () => {
  it('true cuando el UPDATE afecta 1 fila (consumo exitoso)', async () => {
    vi.mocked(mockExecutor.execute).mockResolvedValueOnce([{ affectedRows: 1 }, []]);
    expect(await markBackupCodeUsed(7, mockExecutor)).toBe(true);

    const [sql, params] = vi.mocked(mockExecutor.execute).mock.calls[0];
    expect(sql).toContain('used_at = NOW()');
    expect(sql).toContain('used_at IS NULL');
    expect(params).toEqual([7]);
  });

  it('false cuando affectedRows=0 (carrera: alguien más ya lo consumió)', async () => {
    vi.mocked(mockExecutor.execute).mockResolvedValueOnce([{ affectedRows: 0 }, []]);
    expect(await markBackupCodeUsed(7, mockExecutor)).toBe(false);
  });
});

describe('insertChallenge / findChallengeById', () => {
  it('inserta la fila de rastreo del reto', async () => {
    vi.mocked(mockExecutor.execute).mockResolvedValueOnce([{}, []]);
    await insertChallenge('uuid-1', 501, mockExecutor);
    expect(mockExecutor.execute).toHaveBeenCalledWith(
      'INSERT INTO mfa_challenges (challenge_id, user_id) VALUES (?, ?)',
      ['uuid-1', 501]
    );
  });

  it('busca por challenge_id', async () => {
    const row = { id: 1, challenge_id: 'uuid-1', user_id: 501, attempts_used: 0, revoked: 0 };
    vi.mocked(mockExecutor.execute).mockResolvedValueOnce([[row], []]);
    expect(await findChallengeById('uuid-1', mockExecutor)).toEqual(row);
  });

  it('returns null si no existe el challenge', async () => {
    vi.mocked(mockExecutor.execute).mockResolvedValueOnce([[], []]);
    expect(await findChallengeById('missing', mockExecutor)).toBeNull();
  });
});

describe('incrementChallengeAttempts / revokeChallenge', () => {
  it('incrementa attempts_used', async () => {
    vi.mocked(mockExecutor.execute).mockResolvedValueOnce([{}, []]);
    await incrementChallengeAttempts(1, mockExecutor);
    expect(mockExecutor.execute).toHaveBeenCalledWith(
      'UPDATE mfa_challenges SET attempts_used = attempts_used + 1 WHERE id = ?',
      [1]
    );
  });

  it('marca revoked=1', async () => {
    vi.mocked(mockExecutor.execute).mockResolvedValueOnce([{}, []]);
    await revokeChallenge(1, mockExecutor);
    expect(mockExecutor.execute).toHaveBeenCalledWith(
      'UPDATE mfa_challenges SET revoked = 1 WHERE id = ?',
      [1]
    );
  });
});
