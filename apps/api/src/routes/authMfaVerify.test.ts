import { describe, it, expect, vi, beforeEach, beforeAll, Mock } from 'vitest';
import buildApp from '../index';
import * as MfaService from '../services/mfa.service';

/**
 * FC185 F2 — POST /v1/auth/mfa/verify. Igual que `authLoginMfa.test.ts`, mockea
 * `mfa.service.ts::verifyChallenge` directamente para probar SOLO la capa HTTP (parseo del body,
 * decodificación/validación del `mfaToken`, chequeo de `scope`, mapeo del resultado a status/code)
 * — la lógica de negocio de `verifyChallenge` (TOTP/backup/anti-brute-force) ya está cubierta a
 * fondo en `mfa.service.test.ts`.
 */

vi.mock('../services/mfa.service', () => ({
  verifyChallenge: vi.fn(),
}));

describe('POST /v1/auth/mfa/verify (FC185 F2)', () => {
  const app = buildApp();

  beforeAll(async () => {
    await app.ready();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function signMfaToken(payload: Record<string, unknown>, opts?: { expiresIn: string }): string {
    const { jwt } = app as unknown as { jwt: { sign: (p: object, o?: object) => string } };
    return jwt.sign(payload, opts);
  }

  it('400 VALIDATION_ERROR cuando falta mfaToken o code', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/mfa/verify',
      payload: { code: '123456' },
    });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).code).toBe('VALIDATION_ERROR');
    expect(MfaService.verifyChallenge).not.toHaveBeenCalled();
  });

  it('401 TOKEN_EXPIRED_OR_REVOKED cuando el mfaToken es basura/inválido', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/mfa/verify',
      payload: { mfaToken: 'not-a-real-jwt', code: '123456' },
    });
    expect(res.statusCode).toBe(401);
    expect(JSON.parse(res.body).code).toBe('TOKEN_EXPIRED_OR_REVOKED');
  });

  it('401 TOKEN_EXPIRED_OR_REVOKED cuando el mfaToken expiró', async () => {
    const expiredToken = signMfaToken(
      { id: 501, challengeId: 'uuid-1', scope: 'mfa_challenge' },
      { expiresIn: '-1s' }
    );
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/mfa/verify',
      payload: { mfaToken: expiredToken, code: '123456' },
    });
    expect(res.statusCode).toBe(401);
    expect(JSON.parse(res.body).code).toBe('TOKEN_EXPIRED_OR_REVOKED');
  });

  it('401 TOKEN_EXPIRED_OR_REVOKED cuando el JWT es válido pero de otro scope (p. ej. access/refresh reciclado)', async () => {
    const wrongScopeToken = signMfaToken({ id: 501, type: 'access' });
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/mfa/verify',
      payload: { mfaToken: wrongScopeToken, code: '123456' },
    });
    expect(res.statusCode).toBe(401);
    expect(JSON.parse(res.body).code).toBe('TOKEN_EXPIRED_OR_REVOKED');
    expect(MfaService.verifyChallenge).not.toHaveBeenCalled();
  });

  it('200 — canjea challengeId+code por sesión completa (issueSessionResponse real)', async () => {
    const mfaToken = signMfaToken({ id: 501, challengeId: 'uuid-1', scope: 'mfa_challenge' });
    (MfaService.verifyChallenge as Mock).mockResolvedValue({
      ok: true,
      userId: 501,
      username: 'archie',
      mapped: { id: 501, roleId: 3, roleName: 'Arc' },
      tenantId: null,
      permissions: ['social:post:view:own'],
      ownerType: null,
      availableTenants: [],
    });

    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/mfa/verify',
      payload: { mfaToken, code: '123456' },
    });

    expect(MfaService.verifyChallenge).toHaveBeenCalledWith('uuid-1', '123456');
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(typeof body.token).toBe('string');
    expect(res.cookies.some((c) => c.name === 'refresh_token')).toBe(true);
  });

  it('propaga el status/code de negocio (MFA_INVALID_CODE) sin envolverlo en 500', async () => {
    const mfaToken = signMfaToken({ id: 501, challengeId: 'uuid-1', scope: 'mfa_challenge' });
    (MfaService.verifyChallenge as Mock).mockResolvedValue({
      ok: false,
      status: 401,
      code: 'MFA_INVALID_CODE',
      message: 'El código ingresado no es válido',
    });

    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/mfa/verify',
      payload: { mfaToken, code: '000000' },
    });

    expect(res.statusCode).toBe(401);
    expect(JSON.parse(res.body).code).toBe('MFA_INVALID_CODE');
  });

  it('500 INTERNAL_ERROR cuando verifyChallenge lanza (fallo de infraestructura, no de negocio)', async () => {
    const mfaToken = signMfaToken({ id: 501, challengeId: 'uuid-1', scope: 'mfa_challenge' });
    (MfaService.verifyChallenge as Mock).mockRejectedValue(new Error('DB_DOWN'));

    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/mfa/verify',
      payload: { mfaToken, code: '123456' },
    });

    expect(res.statusCode).toBe(500);
    expect(JSON.parse(res.body).code).toBe('INTERNAL_ERROR');
  });
});
