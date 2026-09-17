import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { hash as argon2Hash, verify as argon2Verify } from '@node-rs/argon2';
import * as MfaRepository from './mfa.repository';
import * as TotpService from './totp.service';
import * as SessionService from './authSession.service';
import {
  beginSetup,
  confirmSetup,
  createChallenge,
  verifyChallenge,
  resetUserMfa,
} from './mfa.service';

/**
 * FC185 F1/F2 — unit-tests `mfa.service.ts` en aislamiento (todo colaborador mockeado en el
 * límite del módulo), mismo patrón que `publicSignup.service.test.ts`.
 */

vi.mock('./db', () => ({
  default: { getConnection: vi.fn() },
}));
vi.mock('./mfa.repository', () => ({
  upsertPendingCredential: vi.fn(),
  findCredentialByUserId: vi.fn(),
  confirmCredential: vi.fn(),
  insertBackupCodes: vi.fn(),
  updateLastUsedStep: vi.fn(),
  deleteMfaCredentialAndBackups: vi.fn(),
  findUnusedBackupCodes: vi.fn(),
  markBackupCodeUsed: vi.fn(),
  insertChallenge: vi.fn(),
  findChallengeById: vi.fn(),
  incrementChallengeAttempts: vi.fn(),
  revokeChallenge: vi.fn(),
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
vi.mock('@node-rs/argon2', () => ({ hash: vi.fn(), verify: vi.fn() }));
vi.mock('./encryption', () => ({
  default: {
    encrypt: vi.fn((v: string) => `enc_${v}`),
    decrypt: vi.fn((v: string) => v.replace(/^enc_/, '')),
  },
}));
vi.mock('./authSession.service', () => ({ refresh: vi.fn() }));
vi.mock('./auditService', () => ({ recordAuditLog: vi.fn() }));

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

describe('FC185 F2 — createChallenge()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('genera un challengeId y lo persiste para el usuario', async () => {
    const challengeId = await createChallenge(501);
    expect(typeof challengeId).toBe('string');
    expect(challengeId.length).toBeGreaterThan(0);
    expect(MfaRepository.insertChallenge).toHaveBeenCalledWith(challengeId, 501);
  });

  it('cada llamada genera un challengeId distinto (aleatoriedad real)', async () => {
    const a = await createChallenge(501);
    const b = await createChallenge(501);
    expect(a).not.toBe(b);
  });
});

const CHALLENGE_ROW = {
  id: 1,
  challenge_id: 'uuid-1',
  user_id: 501,
  attempts_used: 0,
  revoked: 0,
};

const SESSION_SUCCESS = {
  ok: true as const,
  userId: 501,
  username: 'archie',
  mapped: { id: 501 },
  tenantId: null,
  permissions: ['social:post:view:own'],
  ownerType: null,
  availableTenants: [],
};

describe('FC185 F2 — verifyChallenge()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Scenario 3 — reto inexistente o ya revocado → 401 TOKEN_EXPIRED_OR_REVOKED', async () => {
    (MfaRepository.findChallengeById as Mock).mockResolvedValue(null);
    const result = await verifyChallenge('missing', '123456');
    expect(result).toEqual({
      ok: false,
      status: 401,
      code: 'TOKEN_EXPIRED_OR_REVOKED',
      message: expect.any(String),
    });

    (MfaRepository.findChallengeById as Mock).mockResolvedValue({ ...CHALLENGE_ROW, revoked: 1 });
    const revokedResult = await verifyChallenge('uuid-1', '123456');
    expect(revokedResult.ok).toBe(false);
    if (revokedResult.ok) return;
    expect(revokedResult.code).toBe('TOKEN_EXPIRED_OR_REVOKED');
  });

  it('Scenario 2 — código TOTP válido: sesión completa, actualiza last_used_step, revoca el reto (1 solo uso)', async () => {
    (MfaRepository.findChallengeById as Mock).mockResolvedValue(CHALLENGE_ROW);
    (MfaRepository.findCredentialByUserId as Mock).mockResolvedValue({
      id: 9,
      is_confirmed: 1,
      secret_encrypted: 'enc_SECRET',
      last_used_step: 10,
    });
    (TotpService.verifyTotpCode as Mock).mockReturnValue({ valid: true, matchedStep: 20 });
    (SessionService.refresh as Mock).mockResolvedValue(SESSION_SUCCESS);

    const result = await verifyChallenge('uuid-1', '123456');

    expect(TotpService.verifyTotpCode).toHaveBeenCalledWith('SECRET', '123456', {
      lastUsedStep: 10,
    });
    expect(MfaRepository.updateLastUsedStep).toHaveBeenCalledWith(9, 20);
    expect(MfaRepository.revokeChallenge).toHaveBeenCalledWith(1);
    expect(SessionService.refresh).toHaveBeenCalledWith(501, undefined);
    expect(result).toEqual(SESSION_SUCCESS);
  });

  it('código de 6 dígitos pero sin credencial TOTP confirmada (borrada entre login y verify): cuenta como fallo, 0 crash', async () => {
    (MfaRepository.findChallengeById as Mock).mockResolvedValue(CHALLENGE_ROW);
    (MfaRepository.findCredentialByUserId as Mock).mockResolvedValue(null);

    const result = await verifyChallenge('uuid-1', '123456');

    expect(TotpService.verifyTotpCode).not.toHaveBeenCalled();
    expect(MfaRepository.incrementChallengeAttempts).toHaveBeenCalledWith(1);
    expect(result).toEqual({
      ok: false,
      status: 401,
      code: 'MFA_INVALID_CODE',
      message: expect.any(String),
    });
  });

  it('Scenario 4 — código de respaldo válido: quema el código y entrega sesión completa', async () => {
    (MfaRepository.findChallengeById as Mock).mockResolvedValue(CHALLENGE_ROW);
    (MfaRepository.findUnusedBackupCodes as Mock).mockResolvedValue([
      { id: 11, code_hash: 'hash_A' },
      { id: 12, code_hash: 'hash_B' },
    ]);
    (argon2Verify as Mock).mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    (MfaRepository.markBackupCodeUsed as Mock).mockResolvedValue(true);
    (SessionService.refresh as Mock).mockResolvedValue(SESSION_SUCCESS);

    const result = await verifyChallenge('uuid-1', 'AAAAA-11111');

    // No es 6 dígitos → nunca toca la rama TOTP.
    expect(MfaRepository.findCredentialByUserId).not.toHaveBeenCalled();
    expect(argon2Verify).toHaveBeenNthCalledWith(1, 'hash_A', 'AAAAA-11111');
    expect(argon2Verify).toHaveBeenNthCalledWith(2, 'hash_B', 'AAAAA-11111');
    expect(MfaRepository.markBackupCodeUsed).toHaveBeenCalledWith(12);
    expect(MfaRepository.revokeChallenge).toHaveBeenCalledWith(1);
    expect(result).toEqual(SESSION_SUCCESS);
  });

  it('Scenario 4 — código de respaldo que no coincide con ninguno: cuenta como intento fallido', async () => {
    (MfaRepository.findChallengeById as Mock).mockResolvedValue(CHALLENGE_ROW);
    (MfaRepository.findUnusedBackupCodes as Mock).mockResolvedValue([
      { id: 11, code_hash: 'hash_A' },
      { id: 12, code_hash: 'hash_B' },
    ]);
    (argon2Verify as Mock).mockResolvedValue(false);

    const result = await verifyChallenge('uuid-1', 'ZZZZZ-99999');

    expect(argon2Verify).toHaveBeenCalledTimes(2);
    expect(MfaRepository.markBackupCodeUsed).not.toHaveBeenCalled();
    expect(MfaRepository.incrementChallengeAttempts).toHaveBeenCalledWith(1);
    expect(result).toEqual({
      ok: false,
      status: 401,
      code: 'MFA_INVALID_CODE',
      message: expect.any(String),
    });
  });

  it('Scenario 3 — código inválido: incrementa intentos, NO revoca antes del 5to fallo', async () => {
    (MfaRepository.findChallengeById as Mock).mockResolvedValue({
      ...CHALLENGE_ROW,
      attempts_used: 2,
    });
    (MfaRepository.findCredentialByUserId as Mock).mockResolvedValue({
      id: 9,
      is_confirmed: 1,
      secret_encrypted: 'enc_SECRET',
      last_used_step: 10,
    });
    (TotpService.verifyTotpCode as Mock).mockReturnValue({ valid: false, matchedStep: null });

    const result = await verifyChallenge('uuid-1', '000000');

    expect(MfaRepository.incrementChallengeAttempts).toHaveBeenCalledWith(1);
    expect(MfaRepository.revokeChallenge).not.toHaveBeenCalled();
    expect(result).toEqual({
      ok: false,
      status: 401,
      code: 'MFA_INVALID_CODE',
      message: expect.any(String),
    });
  });

  it('Scenario 3 — el 5to fallo consecutivo SÍ revoca el reto', async () => {
    (MfaRepository.findChallengeById as Mock).mockResolvedValue({
      ...CHALLENGE_ROW,
      attempts_used: 4,
    });
    (MfaRepository.findCredentialByUserId as Mock).mockResolvedValue({
      id: 9,
      is_confirmed: 1,
      secret_encrypted: 'enc_SECRET',
      last_used_step: 10,
    });
    (TotpService.verifyTotpCode as Mock).mockReturnValue({ valid: false, matchedStep: null });

    await verifyChallenge('uuid-1', '000000');

    expect(MfaRepository.incrementChallengeAttempts).toHaveBeenCalledWith(1);
    expect(MfaRepository.revokeChallenge).toHaveBeenCalledWith(1);
  });

  it('defensivo — código válido pero refreshSession ya no encuentra al usuario → MFA_INVALID_CODE, no revienta', async () => {
    (MfaRepository.findChallengeById as Mock).mockResolvedValue(CHALLENGE_ROW);
    (MfaRepository.findCredentialByUserId as Mock).mockResolvedValue({
      id: 9,
      is_confirmed: 1,
      secret_encrypted: 'enc_SECRET',
      last_used_step: 10,
    });
    (TotpService.verifyTotpCode as Mock).mockReturnValue({ valid: true, matchedStep: 20 });
    (SessionService.refresh as Mock).mockResolvedValue({
      ok: false,
      status: 401,
      errorCode: 'USER_NOT_FOUND',
    });

    const result = await verifyChallenge('uuid-1', '123456');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('MFA_INVALID_CODE');
  });
});

describe('FC185 F2 — resetUserMfa()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('404 MFA_NOT_ENROLLED cuando el usuario no tiene credencial — 0 transacción abierta', async () => {
    (MfaRepository.findCredentialByUserId as Mock).mockResolvedValue(null);
    const result = await resetUserMfa(501, 1);
    expect(result).toEqual({
      ok: false,
      status: 404,
      code: 'MFA_NOT_ENROLLED',
      message: expect.any(String),
    });
    expect(db.getConnection).not.toHaveBeenCalled();
  });

  it('borra credencial+backups en 1 TX y registra auditoría (invariante: 0 auto-reset, callerId≠targetUserId permitido)', async () => {
    const conn = mockConnection();
    (db.getConnection as Mock).mockResolvedValue(conn);
    (MfaRepository.findCredentialByUserId as Mock).mockResolvedValue({ id: 9, is_confirmed: 1 });

    const result = await resetUserMfa(501, 1);

    expect(MfaRepository.deleteMfaCredentialAndBackups).toHaveBeenCalledWith(501, conn);
    expect(conn.commit).toHaveBeenCalled();
    expect(conn.rollback).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: true });
  });

  it('hace rollback y relanza si la eliminación falla a mitad de la transacción', async () => {
    const conn = mockConnection();
    (db.getConnection as Mock).mockResolvedValue(conn);
    (MfaRepository.findCredentialByUserId as Mock).mockResolvedValue({ id: 9, is_confirmed: 1 });
    (MfaRepository.deleteMfaCredentialAndBackups as Mock).mockRejectedValue(new Error('DB_DOWN'));

    await expect(resetUserMfa(501, 1)).rejects.toThrow('DB_DOWN');
    expect(conn.rollback).toHaveBeenCalled();
    expect(conn.commit).not.toHaveBeenCalled();
  });
});
