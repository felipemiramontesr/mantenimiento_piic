import { describe, it, expect, vi, beforeEach, beforeAll, Mock } from 'vitest';
import type { LightMyRequestResponse } from 'fastify';
import buildApp from '../index';
import * as SessionService from '../services/authSession.service';
import * as AuthThrottle from '../services/authThrottle.service';
import { reportSecurityEvent } from '../services/securityEvents.service';
import { TRAP_ACCOUNTS } from './loginTraps';

/**
 * FC201 F2 · HP2/HP3 — trampas del login en modo detección (T1.1 filas 3–5): registran en segundo
 * plano y la respuesta es EXACTAMENTE la de un login sin trampa. El mock de `login()` invoca el
 * gancho con la cuenta localizada (`null` = no existe), igual que el servicio real.
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
vi.mock('../services/securityEvents.service', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/securityEvents.service')>()),
  reportSecurityEvent: vi.fn(),
}));

const L3 = { ok: false, status: 401, errorCode: 'L3' };
const L4 = { ok: false, status: 401, errorCode: 'L4' };

function givenLogin(accountId: number | null, result: Record<string, unknown>): void {
  (SessionService.login as Mock).mockImplementation(
    async (_u: string, _p: string, hook: SessionService.BeforePasswordCheck) => {
      const verdict = await hook(accountId);
      return verdict ? { ok: false, status: 400, errorCode: verdict } : result;
    }
  );
}

const app = buildApp();

const login = (payload: Record<string, unknown>): Promise<LightMyRequestResponse> =>
  app.inject({ method: 'POST', url: '/v1/auth/login', remoteAddress: '127.0.0.1', payload });

const reported = (): { type: string; targetPattern: string; sample?: string }[] =>
  (reportSecurityEvent as Mock).mock.calls.map(([event]) => event);

describe('POST /v1/auth/login — trampas en modo detección (FC201 F2)', () => {
  beforeAll(async () => {
    await app.ready();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    (AuthThrottle.checkLoginThrottle as Mock).mockResolvedValue({ allowed: true });
    (AuthThrottle.evaluateLoginChallenge as Mock).mockResolvedValue(null);
  });

  it('fila 3 · HP2: cuenta señuelo inexistente → misma respuesta que un desconocido + TRAP_ACCOUNT', async () => {
    givenLogin(null, L3);
    const unknown = await login({ username: 'zz-nadie', password: 'x' });
    expect(reported()).toEqual([]);

    const trap = await login({ username: '  Admin ', password: 'x' });

    expect(trap.statusCode).toBe(unknown.statusCode);
    expect(trap.body).toBe(unknown.body);
    expect(reported()).toEqual([
      {
        type: 'TRAP_ACCOUNT',
        ip: '127.0.0.1',
        targetPattern: 'login:trap-account',
        sample: 'admin',
      },
    ]);
  });

  it.each([...TRAP_ACCOUNTS])('HP2: "%s" es señuelo', async (name) => {
    givenLogin(null, L3);
    await login({ username: name, password: 'x' });

    expect(reported().map((e) => e.type)).toEqual(['TRAP_ACCOUNT']);
  });

  it('HP2: si una cuenta real se llamara como un señuelo, su login NO cuenta como ataque', async () => {
    givenLogin(7, L4);
    const res = await login({ username: 'admin', password: 'mala' });

    expect(res.json()).toEqual({ error: 'L4' });
    expect(reportSecurityEvent).not.toHaveBeenCalled();
  });

  it('fila 3 · HP3: campo trampa lleno → misma respuesta + TRAP_FIELD sin guardar lo escrito', async () => {
    givenLogin(null, L3);
    const res = await login({ username: 'zz-nadie', password: 'x', website_url: 'http://spam' });

    expect(res.json()).toEqual({ error: 'L3' });
    expect(reported()).toEqual([
      { type: 'TRAP_FIELD', ip: '127.0.0.1', targetPattern: 'login:website_url' },
    ]);
  });

  it('HP3 (B2): trampa llena con contraseña correcta NO corta el login (detección pasiva)', async () => {
    givenLogin(1, { ok: false, status: 200, errorCode: 'MFA_SETUP_REQUIRED', setupToken: 't' });
    const res = await login({ username: 'grayman', password: 'buena', website_url: 'autofill' });

    expect(res.statusCode).toBe(200);
    expect(reported().map((e) => e.type)).toEqual(['TRAP_FIELD']);
  });

  it('fila 5 · error de credencial sin trampa → 401 estándar y ningún evento', async () => {
    givenLogin(3, L4);
    const res = await login({ username: 'grayman', password: 'mala', website_url: '   ' });

    expect(res.statusCode).toBe(401);
    expect(reportSecurityEvent).not.toHaveBeenCalled();
  });

  it('un fallo al registrar solo va al log: la respuesta no cambia', async () => {
    givenLogin(null, L3);
    const res = await login({ username: 'root', password: 'x' });
    const [, onError] = (reportSecurityEvent as Mock).mock.calls[0];

    expect(() => onError(new Error('db down'))).not.toThrow();
    expect(res.json()).toEqual({ error: 'L3' });
  });
});
