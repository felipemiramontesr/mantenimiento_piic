import { describe, it, expect, vi, beforeEach, beforeAll, Mock } from 'vitest';
import buildApp from '../index';
import * as SessionService from '../services/authSession.service';
import * as AuthThrottle from '../services/authThrottle.service';

/**
 * FC199 F2 — POST /v1/auth/login con el freno progresivo: la ruta consulta el par usuario|IP ANTES
 * de validar la contraseña (0 argon2 si está frenado, Inv-1), responde 429 con `Retry-After` y
 * registra el resultado de las credenciales. El servicio de sesión y el freno van mockeados.
 */

vi.mock('../services/authSession.service', () => ({ login: vi.fn() }));
vi.mock('../services/authThrottle.service', () => ({
  checkLoginThrottle: vi.fn(),
  recordLoginOutcome: vi.fn(),
}));
vi.mock('../services/mfa.service', () => ({ createChallenge: vi.fn() }));

const LOGIN = {
  method: 'POST' as const,
  url: '/v1/auth/login',
  remoteAddress: '127.0.0.1',
  headers: { 'x-forwarded-for': '203.0.113.1' },
  payload: { username: 'grayman', password: 'Archon2026!' },
};

describe('POST /v1/auth/login — freno progresivo (FC199 F2)', () => {
  const app = buildApp();

  beforeAll(async () => {
    await app.ready();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    (AuthThrottle.checkLoginThrottle as Mock).mockResolvedValue({ allowed: true });
  });

  it('frenado: 429 con Retry-After y sin tocar la contraseña ni registrar nada', async () => {
    (AuthThrottle.checkLoginThrottle as Mock).mockResolvedValue({
      allowed: false,
      retryAfterSeconds: 8,
    });

    const res = await app.inject(LOGIN);

    expect(res.statusCode).toBe(429);
    expect(res.headers['retry-after']).toBe('8');
    expect(res.json()).toEqual({ error: 'LOGIN_THROTTLED', retryAfterSeconds: 8 });
    expect(AuthThrottle.checkLoginThrottle).toHaveBeenCalledWith('grayman', '203.0.113.1');
    expect(SessionService.login).not.toHaveBeenCalled();
    expect(AuthThrottle.recordLoginOutcome).not.toHaveBeenCalled();
  });

  it.each([
    ['L3', 401],
    ['L4', 401],
  ])('%s cuenta como fallo de credenciales del par', async (errorCode, status) => {
    (SessionService.login as Mock).mockResolvedValue({ ok: false, status, errorCode });

    const res = await app.inject(LOGIN);

    expect(res.statusCode).toBe(status);
    expect(AuthThrottle.recordLoginOutcome).toHaveBeenCalledWith('grayman', '203.0.113.1', true);
  });

  it('contraseña correcta (reto MFA): limpia el par', async () => {
    (SessionService.login as Mock).mockResolvedValue({
      ok: false,
      status: 200,
      errorCode: 'MFA_REQUIRED',
      userId: 1,
      channel: 'totp',
    });

    const res = await app.inject(LOGIN);

    expect(res.statusCode).toBe(200);
    expect(AuthThrottle.recordLoginOutcome).toHaveBeenCalledWith('grayman', '203.0.113.1', false);
  });

  it('cuenta pendiente de activación: la contraseña fue correcta, también limpia', async () => {
    (SessionService.login as Mock).mockResolvedValue({
      ok: false,
      status: 403,
      errorCode: 'ACCOUNT_PENDING_ACTIVATION',
    });

    await app.inject(LOGIN);

    expect(AuthThrottle.recordLoginOutcome).toHaveBeenCalledWith('grayman', '203.0.113.1', false);
  });
});
