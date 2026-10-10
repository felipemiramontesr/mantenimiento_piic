import { describe, it, expect, vi, beforeAll, beforeEach, Mock } from 'vitest';
import { hash as argon2Hash } from '@node-rs/argon2';
import buildApp from '../index';
import db from '../services/db';
import { botChallengeVerifier } from '../services/botChallenge.service';

/**
 * FC177 F2 — Public_Signup_Endpoint_And_Form. HTTP-shape + validation coverage for
 * `POST /v1/public/signup` — the one unauthenticated write surface in the API. Atomic-TX and
 * anti-enumeration coverage lives in `services/publicSignup.service.test.ts`; this file covers
 * what only the route layer can: Zod validation branches, status codes, 0-auth-required.
 */

vi.mock('@node-rs/argon2', () => ({ hash: vi.fn().mockResolvedValue('argon2_signup_hash') }));
vi.mock('../services/encryption', () => ({
  default: {
    encrypt: vi.fn((v: string) => `enc_${v}`),
    decrypt: vi.fn((v: string) => (typeof v === 'string' ? v.replace('enc_', '') : v)),
  },
}));

const mockConnection = {
  beginTransaction: vi.fn(),
  commit: vi.fn(),
  rollback: vi.fn(),
  release: vi.fn(),
  execute: vi.fn().mockResolvedValue([{ affectedRows: 1 }, undefined]),
};

// FC199 F3 — el motor PoW tiene sus propias pruebas; aquí se controla su veredicto.
vi.mock('../services/botChallenge.service', () => ({ botChallengeVerifier: { verify: vi.fn() } }));
// FC209 F2 — el alta del perfil de Arcsial tiene sus pruebas (arcsialProfiles.service.test.ts).
vi.mock('../services/arcsialProfiles.service', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/arcsialProfiles.service')>()),
  createProfileForNewUser: vi.fn().mockResolvedValue('arc_00000000'),
}));
vi.mock('../services/db', () => ({
  default: {
    execute: vi.fn().mockResolvedValue([[], undefined]),
    getConnection: vi.fn(() => Promise.resolve(mockConnection)),
  },
}));

const VALID_PAYLOAD = {
  fullName: 'Cliente Ejemplo',
  email: 'cliente@ejemplo.mx',
  password: 'PasswordSegura123',
  rfc: 'ABC010101AB9',
  razonSocial: 'Cliente Ejemplo SA de CV',
  regimenFiscal: '601',
  codigoPostalFiscal: '06600',
};

describe('POST /v1/public/signup', () => {
  const app = buildApp();

  beforeAll(async () => {
    await app.ready();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    // FC199 F3 — los casos que cortan en el reto no consumen la fila encolada abajo:
    // mockReset vacía la cola de mockResolvedValueOnce (clearAllMocks no la toca).
    (db.execute as Mock).mockReset();
    (db.execute as Mock).mockResolvedValue([[], undefined]);
    // FC182 — findArcCosmonautRoleId (Cosmology_repository) is the FIRST db.execute call in
    // publicSignup(), fail-closed before any duplicate check runs; queue its row so every test
    // below reaches the actual signup logic instead of short-circuiting on ARC_ROLE_NOT_CONFIGURED.
    (db.execute as Mock).mockResolvedValueOnce([[{ id: 9 }], undefined]);
    mockConnection.execute.mockResolvedValue([{ affectedRows: 1, insertId: 501 }, undefined]);
    (botChallengeVerifier.verify as Mock).mockResolvedValue(true);
  });

  it('FC199 F3 — reto válido: se verifica con el piso de 1.5 s y el signup marca origen public', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/public/signup',
      payload: { ...VALID_PAYLOAD, altcha_payload: 'resuelto', website_url: '' },
    });

    expect(res.statusCode).toBe(201);
    expect(botChallengeVerifier.verify).toHaveBeenCalledWith('resuelto', { minAgeMs: 1500 });
    expect(mockConnection.execute).toHaveBeenCalledWith(
      "UPDATE users SET signup_source = 'public' WHERE id = ?",
      [501]
    );
  });

  it.each([
    ['reto ausente/inválido', { altcha_payload: 'falso' }, false],
    [
      'campo trampa lleno',
      { altcha_payload: 'resuelto', website_url: 'http://spam.example' },
      true,
    ],
  ])(
    'FC199 F3 — %s: 400 BOT_CHALLENGE_FAILED sin argon2, sin DB y sin decir el motivo',
    async (_label, extra, verdict) => {
      (botChallengeVerifier.verify as Mock).mockResolvedValue(verdict);

      const res = await app.inject({
        method: 'POST',
        url: '/v1/public/signup',
        payload: { ...VALID_PAYLOAD, ...extra },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json()).toEqual({ success: false, code: 'BOT_CHALLENGE_FAILED' });
      expect(argon2Hash).not.toHaveBeenCalled();
      expect(db.execute).not.toHaveBeenCalled();
      expect(db.getConnection).not.toHaveBeenCalled();
    }
  );

  it('FC199 F3 — sin cuerpo: el reto se evalúa como ausente y responde 400 BOT_CHALLENGE_FAILED', async () => {
    (botChallengeVerifier.verify as Mock).mockResolvedValue(false);

    const res = await app.inject({ method: 'POST', url: '/v1/public/signup' });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ success: false, code: 'BOT_CHALLENGE_FAILED' });
    expect(botChallengeVerifier.verify).toHaveBeenCalledWith(undefined, { minAgeMs: 1500 });
    expect(db.execute).not.toHaveBeenCalled();
  });

  it('SIGNUP-1 (Scenario 1): payload válido → 201, sin necesidad de JWT (endpoint público)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/public/signup',
      payload: VALID_PAYLOAD,
    });
    expect(res.statusCode).toBe(201);
    expect(JSON.parse(res.body)).toEqual({ success: true });
    expect(mockConnection.commit).toHaveBeenCalled();
  });

  it('SIGNUP-2: usoCfdi por defecto es S01 cuando el cliente no lo envía', async () => {
    await app.inject({ method: 'POST', url: '/v1/public/signup', payload: VALID_PAYLOAD });
    const insertCall = mockConnection.execute.mock.calls.find(([sql]) =>
      sql.includes('user_billing_profiles')
    );
    expect(insertCall?.[1]).toContain('S01');
  });

  it('SIGNUP-3: RFC con formato inválido → 400 VALIDATION_ERROR, 0 escritura', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/public/signup',
      payload: { ...VALID_PAYLOAD, rfc: 'NO-ES-UN-RFC' },
    });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).code).toBe('VALIDATION_ERROR');
    expect(mockConnection.beginTransaction).not.toHaveBeenCalled();
  });

  it('SIGNUP-4: código postal fiscal con menos de 5 dígitos → 400 VALIDATION_ERROR', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/public/signup',
      payload: { ...VALID_PAYLOAD, codigoPostalFiscal: '123' },
    });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).code).toBe('VALIDATION_ERROR');
  });

  it('SIGNUP-5: password menor a 8 caracteres → 400 VALIDATION_ERROR', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/public/signup',
      payload: { ...VALID_PAYLOAD, password: 'short' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('SIGNUP-6: email duplicado (decrypt-and-compare) → 409 SIGNUP_CONFLICT genérico', async () => {
    (db.execute as Mock)
      .mockResolvedValueOnce([[{ id: 9, email: `enc_${VALID_PAYLOAD.email}` }], undefined]) // findAllActiveUsers → 1 candidato
      .mockResolvedValueOnce([[{ id: 9, email: `enc_${VALID_PAYLOAD.email}` }], undefined]); // findUserWithRoleAndDepartmentById(9)
    const res = await app.inject({
      method: 'POST',
      url: '/v1/public/signup',
      payload: VALID_PAYLOAD,
    });
    expect(res.statusCode).toBe(409);
    expect(JSON.parse(res.body).code).toBe('SIGNUP_CONFLICT');
    expect(mockConnection.beginTransaction).not.toHaveBeenCalled();
  });

  it('SIGNUP-8 (FC182): rol Arc no configurado → 500 ARC_ROLE_NOT_CONFIGURED, 0 TX abierta', async () => {
    (db.execute as Mock).mockReset();
    (db.execute as Mock).mockResolvedValue([[], undefined]); // Arc lookup → no row → null
    const res = await app.inject({
      method: 'POST',
      url: '/v1/public/signup',
      payload: VALID_PAYLOAD,
    });
    expect(res.statusCode).toBe(500);
    expect(JSON.parse(res.body).code).toBe('ARC_ROLE_NOT_CONFIGURED');
    expect(mockConnection.beginTransaction).not.toHaveBeenCalled();
  });

  it('SIGNUP-7: rollback total si la escritura del billing profile falla a medio camino — 500', async () => {
    mockConnection.execute
      .mockResolvedValueOnce([{ affectedRows: 1, insertId: 501 }, undefined]) // insertSeedUser
      .mockRejectedValueOnce(new Error('DB write failed')); // insertBillingProfile
    const res = await app.inject({
      method: 'POST',
      url: '/v1/public/signup',
      payload: VALID_PAYLOAD,
    });
    expect(res.statusCode).toBe(500);
    expect(mockConnection.rollback).toHaveBeenCalled();
    expect(mockConnection.commit).not.toHaveBeenCalled();
  });
});
