/* eslint-disable */
// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Pool } from 'mysql2/promise';
import {
  upsertPendingCredential,
  findCredentialByUserId,
  confirmCredential,
  insertBackupCodes,
} from './mfa.repository';

/**
 * FC185 F1 — Sovereign_MFA_TOTP_Two_Step_Authentication. Mismo patrón de executor directo (sin
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
