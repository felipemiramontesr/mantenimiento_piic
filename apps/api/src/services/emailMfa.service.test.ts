import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { hash as argon2Hash, verify as argon2Verify } from '@node-rs/argon2';
import * as MfaRepository from './mfa.repository';
import * as SessionRepository from './authSession.repository';
import * as TotpService from './totp.service';
import { isTotpRequired } from './mfaPolicy.service';
import { recordFailedAttempt } from './mfa.service';
import { recordAuditLog } from './auditService';
import { MemoryMailTransport, MailTransport } from './mailTransport';
import {
  maskEmail,
  startLoginChallenge,
  beginEmailSetup,
  confirmEmailSetup,
  resendEmailCode,
} from './emailMfa.service';

/**
 * FC195 F2 — `emailMfa.service.ts` en aislamiento (colaboradores mockeados en el límite del
 * módulo). El correo sale por un `MemoryMailTransport` real: se inspecciona el mensaje enviado.
 */

vi.mock('./db', () => ({ default: { getConnection: vi.fn() } }));
vi.mock('./mfa.repository', () => ({
  MAX_EMAIL_RESENDS: 2,
  listCredentials: vi.fn(),
  insertEmailChallenge: vi.fn(),
  findChallengeById: vi.fn(),
  rotateEmailChallengeCode: vi.fn(),
  revokeChallenge: vi.fn(),
  confirmEmailCredential: vi.fn(),
  replaceOtherMethods: vi.fn(),
  insertBackupCodes: vi.fn(),
  markEmailVerified: vi.fn(),
}));
vi.mock('./authSession.repository', () => ({
  findActiveUserWithRoleAndDepartmentById: vi.fn(),
}));
vi.mock('./encryption', () => ({
  default: { decrypt: vi.fn((v: string) => v.replace(/^enc_/, '')) },
}));
vi.mock('./totp.service', async () => {
  const actual = await vi.importActual<typeof import('./totp.service')>('./totp.service');
  return { ...actual, generateEmailCode: vi.fn(), generateBackupCodes: vi.fn() };
});
vi.mock('./mfaPolicy.service', () => ({ isTotpRequired: vi.fn() }));
vi.mock('./mfa.service', () => ({ recordFailedAttempt: vi.fn() }));
vi.mock('@node-rs/argon2', () => ({ hash: vi.fn(), verify: vi.fn() }));
vi.mock('./auditService', () => ({ recordAuditLog: vi.fn() }));

// eslint-disable-next-line import/first
import db from './db';

const ARC_ROW = { id: 30, role_id: 3, email: 'enc_arc.user@piic.com.mx', is_active: 1 };
const LIVE_EMAIL_CHALLENGE = {
  id: 7,
  challenge_id: 'uuid-7',
  user_id: 30,
  attempts_used: 0,
  revoked: 0,
  channel: 'email',
  code_hash: 'argon2-of-ABCDEFGH',
  resend_count: 0,
  is_live: 1,
  cooldown_over: 1,
};

let transport: MemoryMailTransport;

function givenUser(row: object | null): void {
  (SessionRepository.findActiveUserWithRoleAndDepartmentById as Mock).mockResolvedValue(row);
}

function givenChallenge(row: object | null): void {
  (MfaRepository.findChallengeById as Mock).mockResolvedValue(row);
}

const failingTransport: MailTransport = {
  send: () => Promise.resolve({ status: 'failed', reason: 'ETIMEDOUT' }),
};

beforeEach(() => {
  vi.clearAllMocks();
  transport = new MemoryMailTransport();
  (TotpService.generateEmailCode as Mock).mockReturnValue('ABCDEFGH');
  (argon2Hash as Mock).mockImplementation(async (v: string) => `argon2-of-${v}`);
  (isTotpRequired as Mock).mockResolvedValue(false);
  (MfaRepository.listCredentials as Mock).mockResolvedValue([]);
  givenUser(ARC_ROW);
});

describe('maskEmail', () => {
  it.each([
    ['felipe@gmail.com', 'fe•••@gmail.com'],
    ['a@piic.com.mx', 'a•••@piic.com.mx'],
    ['@sin-local', '•••'],
    ['sin-arroba', '•••'],
  ])('%s → %s', (email, masked) => {
    expect(maskEmail(email)).toBe(masked);
  });
});

describe('startLoginChallenge (login de un Arc con 2FA por correo)', () => {
  it('guarda solo el hash del código y lo envía al correo registrado', async () => {
    const result = await startLoginChallenge(30, transport);

    expect(MfaRepository.insertEmailChallenge).toHaveBeenCalledWith(
      result.challengeId,
      30,
      'argon2-of-ABCDEFGH'
    );
    expect(result).toMatchObject({ maskedEmail: 'ar•••@piic.com.mx', codeSent: true });
    expect(transport.outbox).toHaveLength(1);
    expect(transport.outbox[0].to).toBe('arc.user@piic.com.mx');
    expect(transport.outbox[0].text).toContain('ABCDEFGH');
    expect(transport.outbox[0].subject).toContain('ABCDEFGH');
  });

  it('si el correo no sale, el reto existe igual (reenvío o respaldo) y lo dice', async () => {
    const result = await startLoginChallenge(30, failingTransport);

    expect(result).toMatchObject({ maskedEmail: 'ar•••@piic.com.mx', codeSent: false });
    expect(MfaRepository.insertEmailChallenge).toHaveBeenCalled();
  });

  it('sin correo registrado (o usuario ya inactivo): reto sin envío, sin dirección', async () => {
    givenUser({ ...ARC_ROW, email: null });
    expect(await startLoginChallenge(30, transport)).toMatchObject({
      maskedEmail: null,
      codeSent: false,
    });

    givenUser(null);
    expect(await startLoginChallenge(30, transport)).toMatchObject({ codeSent: false });
    expect(transport.outbox).toHaveLength(0);
  });
});

describe('beginEmailSetup', () => {
  it('Arc sin 2FA y con correo: envía el código de activación y guarda el reto', async () => {
    const result = await beginEmailSetup(30, transport);

    expect(result).toMatchObject({ ok: true, maskedEmail: 'ar•••@piic.com.mx' });
    if (!result.ok) return;
    expect(MfaRepository.insertEmailChallenge).toHaveBeenCalledWith(
      result.challengeId,
      30,
      'argon2-of-ABCDEFGH'
    );
    expect(transport.outbox[0].html).toContain('Activa tu verificación por correo');
    expect(isTotpRequired).toHaveBeenCalledWith(30, 3);
  });

  it('Scenario 2 — Ω o MU en cualquier universo: 403 MFA_METHOD_NOT_ALLOWED, sin enviar', async () => {
    (isTotpRequired as Mock).mockResolvedValue(true);

    const result = await beginEmailSetup(30, transport);

    expect(result).toMatchObject({ ok: false, status: 403, code: 'MFA_METHOD_NOT_ALLOWED' });
    expect(transport.outbox).toHaveLength(0);
  });

  it('con un método ya confirmado: 409 MFA_ALREADY_ENROLLED (el correo no reemplaza a TOTP)', async () => {
    (MfaRepository.listCredentials as Mock).mockResolvedValue([{ type: 'totp', confirmed: true }]);

    const result = await beginEmailSetup(30, transport);

    expect(result).toMatchObject({ ok: false, status: 409, code: 'MFA_ALREADY_ENROLLED' });
  });

  it('un TOTP solo pendiente no bloquea el enrolamiento por correo', async () => {
    (MfaRepository.listCredentials as Mock).mockResolvedValue([{ type: 'totp', confirmed: false }]);

    expect((await beginEmailSetup(30, transport)).ok).toBe(true);
  });

  it('sin correo registrado: 400 EMAIL_NOT_CONFIGURED', async () => {
    givenUser({ ...ARC_ROW, email: '' });

    const result = await beginEmailSetup(30, transport);

    expect(result).toMatchObject({ ok: false, status: 400, code: 'EMAIL_NOT_CONFIGURED' });
  });

  it('si el correo no sale: 503 MAIL_DELIVERY_FAILED y NO guarda un reto que nadie recibió', async () => {
    const result = await beginEmailSetup(30, failingTransport);

    expect(result).toMatchObject({ ok: false, status: 503, code: 'MAIL_DELIVERY_FAILED' });
    expect(MfaRepository.insertEmailChallenge).not.toHaveBeenCalled();
  });

  it('usuario inactivo o inexistente: 401 TOKEN_EXPIRED_OR_REVOKED', async () => {
    givenUser(null);

    const result = await beginEmailSetup(30, transport);

    expect(result).toMatchObject({ ok: false, status: 401, code: 'TOKEN_EXPIRED_OR_REVOKED' });
  });
});

describe('confirmEmailSetup', () => {
  const conn = {
    beginTransaction: vi.fn(),
    commit: vi.fn(),
    rollback: vi.fn(),
    release: vi.fn(),
  };

  beforeEach(() => {
    (db.getConnection as Mock).mockResolvedValue(conn);
    givenChallenge(LIVE_EMAIL_CHALLENGE);
    (argon2Verify as Mock).mockResolvedValue(true);
    (TotpService.generateBackupCodes as Mock).mockReturnValue(['AAAAA-11111', 'BBBBB-22222']);
  });

  it('Scenario 1 — código correcto: en UNA TX quema el reto, activa email, retira otros métodos, guarda respaldos y sella el correo', async () => {
    const result = await confirmEmailSetup(30, 'uuid-7', 'abcd efgh');

    expect(argon2Verify).toHaveBeenCalledWith('argon2-of-ABCDEFGH', 'ABCDEFGH');
    expect(MfaRepository.revokeChallenge).toHaveBeenCalledWith(7, conn);
    expect(MfaRepository.confirmEmailCredential).toHaveBeenCalledWith(30, conn);
    expect(MfaRepository.replaceOtherMethods).toHaveBeenCalledWith(30, 'email', conn);
    expect(MfaRepository.insertBackupCodes).toHaveBeenCalledWith(
      30,
      ['argon2-of-AAAAA-11111', 'argon2-of-BBBBB-22222'],
      conn
    );
    expect(MfaRepository.markEmailVerified).toHaveBeenCalledWith(30, conn);
    expect(conn.commit).toHaveBeenCalled();
    expect(conn.release).toHaveBeenCalled();
    expect(recordAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ entity_id: '30', snapshot_after: expect.any(Object) })
    );
    expect(result).toEqual({ ok: true, backupCodes: ['AAAAA-11111', 'BBBBB-22222'] });
  });

  it('código incorrecto: cuenta el intento (límite de 5) y responde 401 MFA_INVALID_CODE', async () => {
    (argon2Verify as Mock).mockResolvedValue(false);

    const result = await confirmEmailSetup(30, 'uuid-7', 'ZZZZZZZZ');

    expect(result).toMatchObject({ ok: false, status: 401, code: 'MFA_INVALID_CODE' });
    expect(recordFailedAttempt).toHaveBeenCalledWith(LIVE_EMAIL_CHALLENGE);
    expect(db.getConnection).not.toHaveBeenCalled();
  });

  it('formato que no es de 8 caracteres del alfabeto: fallo sin llegar a Argon2id', async () => {
    const result = await confirmEmailSetup(30, 'uuid-7', '123456');

    expect(result).toMatchObject({ code: 'MFA_INVALID_CODE' });
    expect(argon2Verify).not.toHaveBeenCalled();
    expect(recordFailedAttempt).toHaveBeenCalled();
  });

  it('reto sin hash guardado: fallo, sin llegar a Argon2id', async () => {
    givenChallenge({ ...LIVE_EMAIL_CHALLENGE, code_hash: null });

    const result = await confirmEmailSetup(30, 'uuid-7', 'ABCDEFGH');

    expect(result).toMatchObject({ code: 'MFA_INVALID_CODE' });
    expect(argon2Verify).not.toHaveBeenCalled();
  });

  it.each([
    ['inexistente', null],
    ['de otro usuario', { ...LIVE_EMAIL_CHALLENGE, user_id: 99 }],
    ['de canal TOTP', { ...LIVE_EMAIL_CHALLENGE, channel: 'totp' }],
    ['revocado', { ...LIVE_EMAIL_CHALLENGE, revoked: 1 }],
    ['caducado (reloj de la DB)', { ...LIVE_EMAIL_CHALLENGE, is_live: 0 }],
  ])('reto %s: 401 TOKEN_EXPIRED_OR_REVOKED sin contar intento', async (_label, row) => {
    givenChallenge(row);

    const result = await confirmEmailSetup(30, 'uuid-7', 'ABCDEFGH');

    expect(result).toMatchObject({ ok: false, status: 401, code: 'TOKEN_EXPIRED_OR_REVOKED' });
    expect(recordFailedAttempt).not.toHaveBeenCalled();
  });

  it('Invariante 9 — si mientras tanto se volvió MU: 403 y no activa nada', async () => {
    (isTotpRequired as Mock).mockResolvedValue(true);

    const result = await confirmEmailSetup(30, 'uuid-7', 'ABCDEFGH');

    expect(result).toMatchObject({ status: 403, code: 'MFA_METHOD_NOT_ALLOWED' });
    expect(MfaRepository.findChallengeById).not.toHaveBeenCalled();
  });

  it('usuario inactivo: 401 sin tocar el reto', async () => {
    givenUser(null);

    const result = await confirmEmailSetup(30, 'uuid-7', 'ABCDEFGH');

    expect(result).toMatchObject({ status: 401, code: 'TOKEN_EXPIRED_OR_REVOKED' });
  });

  it('si la transacción falla: rollback, relanza y no audita', async () => {
    (MfaRepository.insertBackupCodes as Mock).mockRejectedValueOnce(new Error('DB_DOWN'));

    await expect(confirmEmailSetup(30, 'uuid-7', 'ABCDEFGH')).rejects.toThrow('DB_DOWN');
    expect(conn.rollback).toHaveBeenCalled();
    expect(conn.commit).not.toHaveBeenCalled();
    expect(conn.release).toHaveBeenCalled();
    expect(recordAuditLog).not.toHaveBeenCalled();
  });
});

describe('resendEmailCode', () => {
  beforeEach(() => {
    givenChallenge(LIVE_EMAIL_CHALLENGE);
    (MfaRepository.rotateEmailChallengeCode as Mock).mockResolvedValue(true);
  });

  it('código NUEVO (reemplaza al anterior), reenviado al correo registrado; queda 1 reenvío', async () => {
    (TotpService.generateEmailCode as Mock).mockReturnValue('NEWCODE2');

    const result = await resendEmailCode(30, 'uuid-7', 'login', transport);

    expect(MfaRepository.rotateEmailChallengeCode).toHaveBeenCalledWith(7, 'argon2-of-NEWCODE2');
    expect(result).toEqual({
      ok: true,
      maskedEmail: 'ar•••@piic.com.mx',
      codeSent: true,
      resendsLeft: 1,
    });
    expect(transport.outbox[0].text).toContain('NEWCODE2');
    expect(transport.outbox[0].html).toContain('Tu código para iniciar sesión');
  });

  it('para el enrolamiento usa la plantilla de activación', async () => {
    await resendEmailCode(30, 'uuid-7', 'setup', transport);

    expect(transport.outbox[0].html).toContain('Activa tu verificación por correo');
  });

  it('Scenario 5 — límite de 3 envíos: 429 RESEND_LIMIT_EXCEEDED', async () => {
    givenChallenge({ ...LIVE_EMAIL_CHALLENGE, resend_count: 2 });

    const result = await resendEmailCode(30, 'uuid-7', 'login', transport);

    expect(result).toMatchObject({ ok: false, status: 429, code: 'RESEND_LIMIT_EXCEEDED' });
    expect(MfaRepository.rotateEmailChallengeCode).not.toHaveBeenCalled();
  });

  it('Scenario 5 — antes de 60 s: 429 RESEND_COOLDOWN_ACTIVE', async () => {
    givenChallenge({ ...LIVE_EMAIL_CHALLENGE, cooldown_over: 0 });

    const result = await resendEmailCode(30, 'uuid-7', 'login', transport);

    expect(result).toMatchObject({ ok: false, status: 429, code: 'RESEND_COOLDOWN_ACTIVE' });
  });

  it('dos reenvíos simultáneos: el que pierde el UPDATE atómico recibe 429 y no envía', async () => {
    (MfaRepository.rotateEmailChallengeCode as Mock).mockResolvedValue(false);

    const result = await resendEmailCode(30, 'uuid-7', 'login', transport);

    expect(result).toMatchObject({ status: 429, code: 'RESEND_COOLDOWN_ACTIVE' });
    expect(transport.outbox).toHaveLength(0);
  });

  it('un código caducado (no revocado) sí se puede reenviar', async () => {
    givenChallenge({ ...LIVE_EMAIL_CHALLENGE, is_live: 0, resend_count: 1 });

    const result = await resendEmailCode(30, 'uuid-7', 'login', transport);

    expect(result).toMatchObject({ ok: true, resendsLeft: 0 });
  });

  it.each([
    ['inexistente', null],
    ['de otro usuario', { ...LIVE_EMAIL_CHALLENGE, user_id: 99 }],
    ['de canal TOTP', { ...LIVE_EMAIL_CHALLENGE, channel: 'totp' }],
    ['revocado', { ...LIVE_EMAIL_CHALLENGE, revoked: 1 }],
  ])('reto %s: 401 TOKEN_EXPIRED_OR_REVOKED', async (_label, row) => {
    givenChallenge(row);

    const result = await resendEmailCode(30, 'uuid-7', 'login', transport);

    expect(result).toMatchObject({ ok: false, status: 401, code: 'TOKEN_EXPIRED_OR_REVOKED' });
  });

  it('usuario sin correo al reenviar: rota el código pero no envía nada', async () => {
    givenUser({ ...ARC_ROW, email: null });

    const result = await resendEmailCode(30, 'uuid-7', 'login', transport);

    expect(result).toEqual({ ok: true, maskedEmail: null, codeSent: false, resendsLeft: 1 });
    expect(transport.outbox).toHaveLength(0);
  });
});
