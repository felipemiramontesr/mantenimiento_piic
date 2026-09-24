import { describe, it, expect, vi, beforeEach, beforeAll, Mock } from 'vitest';
import buildApp from '../index';
import * as SessionService from '../services/authSession.service';
import * as MfaService from '../services/mfa.service';
import * as EmailMfaService from '../services/emailMfa.service';

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
vi.mock('../services/emailMfa.service', () => ({
  startLoginChallenge: vi.fn(),
}));

type DecodedToken = Record<string, unknown> & { iat: number; exp: number };

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
      channel: 'totp',
    });
    (MfaService.createChallenge as Mock).mockResolvedValue('challenge-uuid-1');

    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { username: 'grayman', password: 'Archon2026!' },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body).toMatchObject({ success: true, mfaRequired: true, channel: 'totp' });
    expect(typeof body.mfaToken).toBe('string');

    const { jwt } = app as unknown as { jwt: { decode: (t: string) => DecodedToken } };
    const decoded = jwt.decode(body.mfaToken);
    expect(decoded).toMatchObject({
      id: 501,
      scope: 'mfa_challenge',
      challengeId: 'challenge-uuid-1',
    });
    // El reto TOTP conserva su vida de 5 min (R8, 387_AN).
    expect(decoded.exp - decoded.iat).toBe(300);
    expect(EmailMfaService.startLoginChallenge).not.toHaveBeenCalled();
  });

  it('FC195 Scenario 3 — reto por correo: envía el código y firma el mfaToken a 10 min', async () => {
    (SessionService.login as Mock).mockResolvedValue({
      ok: false,
      status: 200,
      errorCode: 'MFA_REQUIRED',
      userId: 30,
      channel: 'email',
    });
    (EmailMfaService.startLoginChallenge as Mock).mockResolvedValue({
      challengeId: 'challenge-email-1',
      maskedEmail: 'ar•••@piic.com.mx',
      codeSent: true,
    });

    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { username: 'arc', password: 'pw' },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body).toMatchObject({
      success: true,
      mfaRequired: true,
      channel: 'email',
      maskedEmail: 'ar•••@piic.com.mx',
      codeSent: true,
    });
    const { jwt } = app as unknown as { jwt: { decode: (t: string) => DecodedToken } };
    const decoded = jwt.decode(body.mfaToken);
    expect(decoded).toMatchObject({
      id: 30,
      scope: 'mfa_challenge',
      challengeId: 'challenge-email-1',
    });
    expect(decoded.exp - decoded.iat).toBe(600);
    expect(MfaService.createChallenge).not.toHaveBeenCalled();
  });

  it('MFA_SETUP_REQUIRED (Ω/MU sin enrolar): responde mfaSetupRequired:true con un setupToken firmado', async () => {
    (SessionService.login as Mock).mockResolvedValue({
      ok: false,
      status: 200,
      errorCode: 'MFA_SETUP_REQUIRED',
      userId: 1,
      username: 'grayman',
      allowedMethods: ['totp'],
    });

    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { username: 'grayman', password: 'Archon2026!' },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body).toMatchObject({
      success: true,
      mfaSetupRequired: true,
      allowedMethods: ['totp'],
    });
    expect(typeof body.setupToken).toBe('string');

    const { jwt } = app as unknown as { jwt: { decode: (t: string) => Record<string, unknown> } };
    const decoded = jwt.decode(body.setupToken);
    expect(decoded).toMatchObject({ id: 1, username: 'grayman', type: 'mfa_setup' });
  });

  it('fallo de credenciales (L4) sigue respondiendo {error} con su status — nunca sesión', async () => {
    (SessionService.login as Mock).mockResolvedValue({ ok: false, status: 401, errorCode: 'L4' });

    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { username: 'arc_itinerante', password: 'bad' },
    });

    expect(res.statusCode).toBe(401);
    expect(JSON.parse(res.body)).toEqual({ error: 'L4' });
  });
});
