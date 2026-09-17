import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { hash as argon2Hash } from '@node-rs/argon2';
import * as MfaRepository from './mfa.repository';
import * as TotpService from './totp.service';
import { beginSetup, confirmSetup } from './mfa.service';

/**
 * FC185 F1 — unit-tests `mfa.service.ts` en aislamiento (todo colaborador mockeado en el límite
 * del módulo), mismo patrón que `publicSignup.service.test.ts`.
 */

vi.mock('./db', () => ({
  default: { getConnection: vi.fn() },
}));
vi.mock('./mfa.repository', () => ({
  upsertPendingCredential: vi.fn(),
  findCredentialByUserId: vi.fn(),
  confirmCredential: vi.fn(),
  insertBackupCodes: vi.fn(),
}));
vi.mock('./totp.service', async () => {
  const actual = await vi.importActual<typeof import('./totp.service')>('./totp.service');
  return {
    ...actual,
    generateTotpSecret: vi.fn(),
    verifyTotpCode: vi.fn(),
    generateBackupCodes: vi.fn(),
  };
});
vi.mock('@node-rs/argon2', () => ({ hash: vi.fn() }));
vi.mock('./encryption', () => ({
  default: {
    encrypt: vi.fn((v: string) => `enc_${v}`),
    decrypt: vi.fn((v: string) => v.replace(/^enc_/, '')),
  },
}));

// eslint-disable-next-line import/first
import db from './db';

function mockConnection(): {
  beginTransaction: Mock;
  commit: Mock;
  rollback: Mock;
  release: Mock;
} {
  return {
    beginTransaction: vi.fn(),
    commit: vi.fn(),
    rollback: vi.fn(),
    release: vi.fn(),
  };
}

describe('FC185 F1 — beginSetup()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('genera un secreto, lo cifra y lo guarda como pendiente; responde el secreto en claro + URI', async () => {
    (TotpService.generateTotpSecret as Mock).mockReturnValue('SECRETBASE32');

    const result = await beginSetup(501, 'grayman');

    expect(MfaRepository.upsertPendingCredential).toHaveBeenCalledWith(
      501,
      'totp',
      'enc_SECRETBASE32'
    );
    expect(result.secretBase32).toBe('SECRETBASE32');
    expect(result.otpauthUri).toContain('otpauth://totp/');
    expect(result.otpauthUri).toContain('secret=SECRETBASE32');
  });
});

describe('FC185 F1 — confirmSetup()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (argon2Hash as Mock).mockImplementation(async (v: string) => `hash_of_${v}`);
    (TotpService.generateBackupCodes as Mock).mockReturnValue([
      'AAAAA-11111',
      'BBBBB-22222',
      'CCCCC-33333',
      'DDDDD-44444',
      'EEEEE-55555',
      'FFFFF-66666',
      'GGGGG-77777',
      'HHHHH-88888',
    ]);
  });

  it('Scenario 2 (FC185 Gherkin) — código válido: confirma + genera 8 backups en 1 sola TX', async () => {
    const conn = mockConnection();
    (db.getConnection as Mock).mockResolvedValue(conn);
    (MfaRepository.findCredentialByUserId as Mock).mockResolvedValue({
      id: 9,
      user_id: 501,
      type: 'totp',
      secret_encrypted: 'enc_SECRETBASE32',
      is_confirmed: 0,
      last_used_step: null,
    });
    (TotpService.verifyTotpCode as Mock).mockReturnValue({ valid: true, matchedStep: 12345 });

    const result = await confirmSetup(501, '123456');

    expect(TotpService.verifyTotpCode).toHaveBeenCalledWith('SECRETBASE32', '123456', {
      lastUsedStep: null,
    });
    expect(MfaRepository.confirmCredential).toHaveBeenCalledWith(9, 12345, conn);
    expect(MfaRepository.insertBackupCodes).toHaveBeenCalledWith(
      501,
      [
        'hash_of_AAAAA-11111',
        'hash_of_BBBBB-22222',
        'hash_of_CCCCC-33333',
        'hash_of_DDDDD-44444',
        'hash_of_EEEEE-55555',
        'hash_of_FFFFF-66666',
        'hash_of_GGGGG-77777',
        'hash_of_HHHHH-88888',
      ],
      conn
    );
    expect(conn.commit).toHaveBeenCalled();
    expect(conn.rollback).not.toHaveBeenCalled();
    expect(conn.release).toHaveBeenCalled();
    expect(result).toEqual({
      ok: true,
      backupCodes: [
        'AAAAA-11111',
        'BBBBB-22222',
        'CCCCC-33333',
        'DDDDD-44444',
        'EEEEE-55555',
        'FFFFF-66666',
        'GGGGG-77777',
        'HHHHH-88888',
      ],
    });
  });

  it('Scenario — 404 SETUP_NOT_FOUND cuando no hay credencial pendiente para el usuario', async () => {
    (MfaRepository.findCredentialByUserId as Mock).mockResolvedValue(null);
    const result = await confirmSetup(501, '123456');
    expect(result).toEqual({
      ok: false,
      status: 404,
      code: 'SETUP_NOT_FOUND',
      message: 'No hay un enrolamiento MFA pendiente para confirmar',
    });
    expect(db.getConnection).not.toHaveBeenCalled();
  });

  it('404 SETUP_NOT_FOUND cuando la credencial existente ya fue confirmada (no re-confirmable)', async () => {
    (MfaRepository.findCredentialByUserId as Mock).mockResolvedValue({
      id: 9,
      user_id: 501,
      type: 'totp',
      secret_encrypted: 'enc_SECRETBASE32',
      is_confirmed: 1,
      last_used_step: 100,
    });
    const result = await confirmSetup(501, '123456');
    expect(result.ok).toBe(false);
    expect((result as { code: string }).code).toBe('SETUP_NOT_FOUND');
  });

  it('401 MFA_INVALID_CODE cuando el código no valida — no abre transacción ni persiste nada', async () => {
    (MfaRepository.findCredentialByUserId as Mock).mockResolvedValue({
      id: 9,
      user_id: 501,
      type: 'totp',
      secret_encrypted: 'enc_SECRETBASE32',
      is_confirmed: 0,
      last_used_step: null,
    });
    (TotpService.verifyTotpCode as Mock).mockReturnValue({ valid: false, matchedStep: null });

    const result = await confirmSetup(501, '000000');

    expect(result).toEqual({
      ok: false,
      status: 401,
      code: 'MFA_INVALID_CODE',
      message: 'El código ingresado no es válido',
    });
    expect(db.getConnection).not.toHaveBeenCalled();
    expect(MfaRepository.confirmCredential).not.toHaveBeenCalled();
  });

  it('hace rollback y relanza si la persistencia falla a mitad de la transacción', async () => {
    const conn = mockConnection();
    (db.getConnection as Mock).mockResolvedValue(conn);
    (MfaRepository.findCredentialByUserId as Mock).mockResolvedValue({
      id: 9,
      user_id: 501,
      type: 'totp',
      secret_encrypted: 'enc_SECRETBASE32',
      is_confirmed: 0,
      last_used_step: null,
    });
    (TotpService.verifyTotpCode as Mock).mockReturnValue({ valid: true, matchedStep: 12345 });
    (MfaRepository.insertBackupCodes as Mock).mockRejectedValue(new Error('DB_DOWN'));

    await expect(confirmSetup(501, '123456')).rejects.toThrow('DB_DOWN');
    expect(conn.rollback).toHaveBeenCalled();
    expect(conn.commit).not.toHaveBeenCalled();
    expect(conn.release).toHaveBeenCalled();
  });
});
