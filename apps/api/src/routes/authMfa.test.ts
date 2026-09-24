import { describe, it, expect, vi, beforeEach, beforeAll, Mock } from 'vitest';
import buildApp from '../index';
import db from '../services/db';
import { currentTotpStep, computeTotpCode } from '../services/totp.service';

/**
 * FC185 F1 — Sovereign_MFA_TOTP_Two_Step_Authentication. Integration test de
 * POST /v1/auth/mfa/setup + /mfa/confirm sobre la app real (`buildApp()`), mismo molde de mocks
 * que `authOwners.test.ts` (solo la frontera SQL/cifrado/hash se mockea — `totp.service.ts` y
 * `mfa.service.ts`/`mfa.repository.ts` corren de verdad, así que el código TOTP del happy path se
 * calcula aquí mismo con el motor real, exactamente como lo haría una app autenticadora).
 */

const mockConnection = {
  beginTransaction: vi.fn(),
  commit: vi.fn(),
  rollback: vi.fn(),
  release: vi.fn(),
  execute: vi.fn().mockResolvedValue([[], undefined]),
  query: vi.fn().mockResolvedValue([[], undefined]),
};

vi.mock('../services/db', () => ({
  default: {
    execute: vi.fn().mockResolvedValue([[], undefined]),
    query: vi.fn().mockResolvedValue([[], undefined]),
    getConnection: vi.fn(() => Promise.resolve(mockConnection)),
  },
}));

vi.mock('../services/encryption', () => ({
  default: {
    encrypt: vi.fn((v: string) => `enc_${v}`),
    decrypt: vi.fn((v: string) => (v && typeof v === 'string' ? v.replace('enc_', '') : v)),
    generateBlindIndex: vi.fn((v: string) => `hash_${v}`),
  },
}));

vi.mock('@node-rs/argon2', () => ({
  hash: vi.fn((v: string) => Promise.resolve(`hashed_${v}`)),
  verify: vi.fn(() => Promise.resolve(true)),
}));

describe('POST /v1/auth/mfa/setup + /v1/auth/mfa/confirm (FC185 F1)', () => {
  const app = buildApp();
  let token: string;

  beforeAll(async () => {
    await app.ready();
    const { jwt } = app as unknown as { jwt: { sign: (_p: object) => string } };
    // Arc opt-in (338/339_AN) — el mandato Ω/MU no aplica hasta F2 (login), setup/confirm son
    // simétricos para cualquier usuario autenticado.
    token = jwt.sign({
      id: 501,
      username: 'archie',
      roleId: 3,
      permissions: ['social:post:view:own'],
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();
    (db.execute as Mock).mockReset();
    mockConnection.execute.mockReset();
    (db.execute as Mock).mockResolvedValue([[], undefined]);
    mockConnection.execute.mockResolvedValue([[], undefined]);
  });

  const authHeader = (t: string): Record<string, string> => ({ Authorization: `Bearer ${t}` });

  describe('POST /mfa/setup', () => {
    it('401 sin sesión', async () => {
      const res = await app.inject({ method: 'POST', url: '/v1/auth/mfa/setup' });
      expect(res.statusCode).toBe(401);
    });

    it('200 — genera un secreto Base32 nuevo y la URI otpauth:// correspondiente', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/v1/auth/mfa/setup',
        headers: authHeader(token),
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.secretBase32).toMatch(/^[A-Z2-7]{32}$/);
      expect(body.data.otpauthUri).toContain(`secret=${body.data.secretBase32}`);
      expect(body.data.otpauthUri).toContain('Archon');

      // 1ª consulta: ¿ya hay TOTP confirmado? (FC195). 2ª: se persiste cifrado como pendiente.
      const [sql, params] = (db.execute as Mock).mock.calls[1];
      expect(sql).toContain('INSERT INTO user_mfa_credentials');
      expect(params[0]).toBe(501);
      expect(params[2]).toBe(`enc_${body.data.secretBase32}`);
    });

    it('FC195 — 409 MFA_ALREADY_ENROLLED con un TOTP ya confirmado: no lo devuelve a pendiente', async () => {
      (db.execute as Mock).mockResolvedValueOnce([
        [{ id: 9, user_id: 501, type: 'totp', secret_encrypted: 'enc_X', is_confirmed: 1 }],
        undefined,
      ]);
      const res = await app.inject({
        method: 'POST',
        url: '/v1/auth/mfa/setup',
        headers: authHeader(token),
      });
      expect(res.statusCode).toBe(409);
      expect(JSON.parse(res.body).code).toBe('MFA_ALREADY_ENROLLED');
      expect(db.execute).toHaveBeenCalledTimes(1);
    });

    it('FC195 — el setupToken de /login (type mfa_setup) sí sirve para enrolar', async () => {
      const { jwt } = app as unknown as { jwt: { sign: (_p: object) => string } };
      const setupToken = jwt.sign({ id: 501, username: 'archie', type: 'mfa_setup' });
      const res = await app.inject({
        method: 'POST',
        url: '/v1/auth/mfa/setup',
        headers: authHeader(setupToken),
      });
      expect(res.statusCode).toBe(200);
    });

    it('FC195 — el mfaToken del reto (solo contraseña) NO sirve para enrolar: 401', async () => {
      const { jwt } = app as unknown as { jwt: { sign: (_p: object) => string } };
      const mfaToken = jwt.sign({ id: 501, challengeId: 'c', scope: 'mfa_challenge' });
      const res = await app.inject({
        method: 'POST',
        url: '/v1/auth/mfa/setup',
        headers: authHeader(mfaToken),
      });
      expect(res.statusCode).toBe(401);
      expect(JSON.parse(res.body).code).toBe('TOKEN_TYPE_NOT_ALLOWED');
      expect(db.execute).not.toHaveBeenCalled();
    });

    it('500 INTERNAL_ERROR cuando la persistencia falla', async () => {
      (db.execute as Mock).mockRejectedValueOnce(new Error('DB_DOWN'));
      const res = await app.inject({
        method: 'POST',
        url: '/v1/auth/mfa/setup',
        headers: authHeader(token),
      });
      expect(res.statusCode).toBe(500);
      expect(JSON.parse(res.body).code).toBe('INTERNAL_ERROR');
    });
  });

  describe('POST /mfa/confirm', () => {
    it('401 sin sesión', async () => {
      const res = await app.inject({ method: 'POST', url: '/v1/auth/mfa/confirm', payload: {} });
      expect(res.statusCode).toBe(401);
    });

    it('400 VALIDATION_ERROR cuando el código no son 6 dígitos', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/v1/auth/mfa/confirm',
        headers: authHeader(token),
        payload: { code: '123' },
      });
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body).code).toBe('VALIDATION_ERROR');
    });

    it('404 SETUP_NOT_FOUND cuando no hay un enrolamiento pendiente', async () => {
      (db.execute as Mock).mockResolvedValueOnce([[], undefined]); // findCredentialByUserId → sin fila
      const res = await app.inject({
        method: 'POST',
        url: '/v1/auth/mfa/confirm',
        headers: authHeader(token),
        payload: { code: '123456' },
      });
      expect(res.statusCode).toBe(404);
      expect(JSON.parse(res.body).code).toBe('SETUP_NOT_FOUND');
    });

    it('401 MFA_INVALID_CODE con un código incorrecto — no abre transacción', async () => {
      (db.execute as Mock).mockResolvedValueOnce([
        [
          {
            id: 9,
            user_id: 501,
            type: 'totp',
            secret_encrypted: 'enc_JBSWY3DPEHPK3PXP',
            is_confirmed: 0,
            last_used_step: null,
          },
        ],
        undefined,
      ]);
      const res = await app.inject({
        method: 'POST',
        url: '/v1/auth/mfa/confirm',
        headers: authHeader(token),
        payload: { code: '000000' },
      });
      expect(res.statusCode).toBe(401);
      expect(JSON.parse(res.body).code).toBe('MFA_INVALID_CODE');
      expect(db.getConnection).not.toHaveBeenCalled();
    });

    it('Scenario 2 (FC185 Gherkin) — 200 con el código TOTP real: confirma y entrega 8 backups', async () => {
      const secretBase32 = 'JBSWY3DPEHPK3PXP';
      const realCode = computeTotpCode(secretBase32, currentTotpStep());
      (db.execute as Mock).mockResolvedValueOnce([
        [
          {
            id: 9,
            user_id: 501,
            type: 'totp',
            secret_encrypted: `enc_${secretBase32}`,
            is_confirmed: 0,
            last_used_step: null,
          },
        ],
        undefined,
      ]);

      const res = await app.inject({
        method: 'POST',
        url: '/v1/auth/mfa/confirm',
        headers: authHeader(token),
        payload: { code: realCode },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.backupCodes).toHaveLength(8);
      expect(new Set(body.data.backupCodes).size).toBe(8);
      expect(mockConnection.commit).toHaveBeenCalled();
      expect(mockConnection.rollback).not.toHaveBeenCalled();

      // FC195 — un solo método: se retira cualquier otro tipo y los respaldos previos, en la TX.
      const replaceCall = mockConnection.execute.mock.calls.find(([sql]) =>
        String(sql).includes('AND type <> ?')
      );
      expect(replaceCall?.[1]).toEqual([501, 'totp']);
      // confirmCredential graba el step consumido.
      const confirmCall = mockConnection.execute.mock.calls.find(([sql]) =>
        String(sql).includes('SET is_confirmed = 1')
      );
      expect(confirmCall).toBeDefined();
      // insertBackupCodes persiste 8 hashes, nunca los códigos en claro.
      const backupCall = mockConnection.execute.mock.calls.find(([sql]) =>
        String(sql).includes('INSERT INTO user_mfa_backup_codes')
      );
      expect(backupCall).toBeDefined();
      (body.data.backupCodes as string[]).forEach((plain) => {
        expect(backupCall![1]).not.toContain(plain);
      });
    });

    it('500 INTERNAL_ERROR cuando la búsqueda de la credencial falla', async () => {
      (db.execute as Mock).mockRejectedValueOnce(new Error('DB_DOWN'));
      const res = await app.inject({
        method: 'POST',
        url: '/v1/auth/mfa/confirm',
        headers: authHeader(token),
        payload: { code: '123456' },
      });
      expect(res.statusCode).toBe(500);
      expect(JSON.parse(res.body).code).toBe('INTERNAL_ERROR');
    });
  });
});
