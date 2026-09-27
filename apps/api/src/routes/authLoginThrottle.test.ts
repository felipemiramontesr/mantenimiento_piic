import { describe, it, expect, vi, beforeEach, beforeAll, Mock } from 'vitest';
import buildApp from '../index';
import * as SessionService from '../services/authSession.service';
import * as AuthThrottle from '../services/authThrottle.service';

/**
 * FC199 F2/F3 — POST /v1/auth/login con el freno progresivo (F2) y el reto adaptativo (F3). La ruta
 * consulta el par usuario|IP ANTES de la contraseña (0 argon2 si está frenado, Inv-1), pasa a
 * `login()` un gancho que decide el reto con la cuenta ya localizada, y registra qué probó el
 * intento. El servicio de sesión va mockeado; su mock invoca el gancho como lo hace el real.
 */

vi.mock('../services/authSession.service', () => ({ login: vi.fn() }));
vi.mock('../services/authThrottle.service', () => ({
  checkLoginThrottle: vi.fn(),
  recordLoginOutcome: vi.fn(),
  loginAccountRef: vi.fn((id: number | null, name: string) =>
    id === null ? `name:${name}` : `id:${id}`
  ),
  evaluateLoginChallenge: vi.fn(),
}));
vi.mock('../services/mfa.service', () => ({ createChallenge: vi.fn() }));

const LOGIN = {
  method: 'POST' as const,
  url: '/v1/auth/login',
  remoteAddress: '127.0.0.1',
  headers: { 'x-forwarded-for': '203.0.113.1' },
  payload: { username: 'grayman', password: 'Archon2026!', altcha_payload: 'resuelto' },
};

/** `login()` localiza la cuenta `accountId`, corre el gancho y, si no corta, responde `result`. */
function givenLogin(accountId: number | null, result: Record<string, unknown>): void {
  (SessionService.login as Mock).mockImplementation(
    async (_u: string, _p: string, hook: SessionService.BeforePasswordCheck) => {
      const verdict = await hook(accountId);
      return verdict ? { ok: false, status: 400, errorCode: verdict } : result;
    }
  );
}

const MFA_REQUIRED = {
  ok: false,
  status: 200,
  errorCode: 'MFA_REQUIRED',
  userId: 1,
  channel: 'totp',
};

describe('POST /v1/auth/login — freno progresivo y reto adaptativo (FC199)', () => {
  const app = buildApp();

  beforeAll(async () => {
    await app.ready();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    (AuthThrottle.checkLoginThrottle as Mock).mockResolvedValue({ allowed: true });
    (AuthThrottle.evaluateLoginChallenge as Mock).mockResolvedValue(null);
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

  it('el gancho decide el reto con el id de la cuenta y el payload recibido', async () => {
    givenLogin(1, MFA_REQUIRED);

    await app.inject(LOGIN);

    expect(AuthThrottle.evaluateLoginChallenge).toHaveBeenCalledWith(
      'id:1',
      '203.0.113.1',
      'resuelto'
    );
  });

  it.each([['BOT_CHALLENGE_REQUIRED'], ['BOT_CHALLENGE_FAILED']])(
    '%s: 400 para que la web resuelva y reintente; no suma ni limpia contadores',
    async (verdict) => {
      (AuthThrottle.evaluateLoginChallenge as Mock).mockResolvedValue(verdict);
      givenLogin(1, MFA_REQUIRED);

      const res = await app.inject(LOGIN);

      expect(res.statusCode).toBe(400);
      expect(res.json()).toEqual({ error: verdict });
      expect(AuthThrottle.recordLoginOutcome).toHaveBeenCalledWith(
        { username: 'grayman', ip: '203.0.113.1', accountRef: 'id:1' },
        'untested'
      );
    }
  );

  it.each([
    ['L3', null, 'name:grayman'],
    ['L4', 1, 'id:1'],
  ])(
    '%s: fallo de credenciales con la cuenta %s → %s',
    async (errorCode, accountId, accountRef) => {
      givenLogin(accountId, { ok: false, status: 401, errorCode });

      const res = await app.inject(LOGIN);

      expect(res.statusCode).toBe(401);
      expect(AuthThrottle.recordLoginOutcome).toHaveBeenCalledWith(
        { username: 'grayman', ip: '203.0.113.1', accountRef },
        'failed'
      );
    }
  );

  it.each([
    ['reto MFA', MFA_REQUIRED, 200],
    ['cuenta pendiente', { ok: false, status: 403, errorCode: 'ACCOUNT_PENDING_ACTIVATION' }, 403],
  ])('contraseña correcta (%s): limpia', async (_label, result, status) => {
    givenLogin(1, result);

    const res = await app.inject(LOGIN);

    expect(res.statusCode).toBe(status);
    expect(AuthThrottle.recordLoginOutcome).toHaveBeenCalledWith(
      { username: 'grayman', ip: '203.0.113.1', accountRef: 'id:1' },
      'passed'
    );
  });
});
