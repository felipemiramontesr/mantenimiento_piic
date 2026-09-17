import { describe, it, expect, vi, beforeEach, beforeAll, Mock } from 'vitest';
import buildApp from '../index';
import * as SessionService from '../services/authSession.service';
import * as MfaService from '../services/mfa.service';

/**
 * FC185 F2 — POST /v1/auth/login: prueba SOLO cómo la ruta traduce los nuevos resultados de
 * `SessionService.login()` a HTTP (firma de `mfaToken`/`setupToken`, forma de la respuesta) —
 * mockeando `authSession.service` directamente en vez de encadenar la cadena real de `db.execute`
 * (eso ya lo cubre `authSession.mfaGate.test.ts` a nivel de servicio, con más precisión y sin
 * duplicar 6-7 mocks de SQL por escenario). `/mfa/verify` sigue viviendo en `authMfa.test.ts`,
 * que SÍ corre el motor TOTP real.
 */

vi.mock('../services/authSession.service', () => ({
  login: vi.fn(),
}));
vi.mock('../services/mfa.service', () => ({
  createChallenge: vi.fn(),
}));

describe('POST /v1/auth/login — ramas MFA (FC185 F2)', () => {
  const app = buildApp();

  beforeAll(async () => {
    await app.ready();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Scenario 1 — MFA_REQUIRED: responde mfaRequired:true con un mfaToken firmado (scope mfa_challenge)', async () => {
    (SessionService.login as Mock).mockResolvedValue({
      ok: false,
      status: 200,
      errorCode: 'MFA_REQUIRED',
      userId: 501,
    });
    (MfaService.createChallenge as Mock).mockResolvedValue('challenge-uuid-1');

    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { username: 'grayman', password: 'Archon2026!' },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body).toMatchObject({ success: true, mfaRequired: true });
    expect(typeof body.mfaToken).toBe('string');

    const { jwt } = app as unknown as { jwt: { decode: (t: string) => Record<string, unknown> } };
    const decoded = jwt.decode(body.mfaToken);
    expect(decoded).toMatchObject({
      id: 501,
      scope: 'mfa_challenge',
      challengeId: 'challenge-uuid-1',
    });
  });

  it('MFA_SETUP_REQUIRED (Ω/MU sin enrolar): responde mfaSetupRequired:true con un setupToken firmado', async () => {
    (SessionService.login as Mock).mockResolvedValue({
      ok: false,
      status: 200,
      errorCode: 'MFA_SETUP_REQUIRED',
      userId: 1,
      username: 'grayman',
    });

    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { username: 'grayman', password: 'Archon2026!' },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body).toMatchObject({ success: true, mfaSetupRequired: true });
    expect(typeof body.setupToken).toBe('string');

    const { jwt } = app as unknown as { jwt: { decode: (t: string) => Record<string, unknown> } };
    const decoded = jwt.decode(body.setupToken);
    expect(decoded).toMatchObject({ id: 1, username: 'grayman', type: 'mfa_setup' });
  });

  it('sin MFA de por medio (ok:true) sigue emitiendo la sesión completa de siempre — 0 regresión', async () => {
    (SessionService.login as Mock).mockResolvedValue({
      ok: true,
      userId: 20,
      username: 'arc_itinerante',
      mapped: { id: 20, roleId: 3, roleName: 'Arc' },
      tenantId: null,
      permissions: ['social:post:view:own'],
      ownerType: null,
      availableTenants: [],
    });

    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { username: 'arc_itinerante', password: 'pw' },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(typeof body.token).toBe('string');
    expect(body.mfaRequired).toBeUndefined();
    expect(body.mfaSetupRequired).toBeUndefined();
  });
});
