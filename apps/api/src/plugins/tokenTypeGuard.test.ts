import { describe, it, expect, vi, beforeAll, beforeEach, Mock } from 'vitest';
import buildApp from '../index';
import * as SessionService from '../services/authSession.service';
import { isTokenAllowed } from './tokenTypeGuard';

/**
 * FC195 F2 — guardia global del tipo de token. Reproduce los dos ataques que cerraba: con SOLO la
 * contraseña (`mfaToken` o `setupToken`) ya no se obtiene sesión por `/switch-tenant` ni se lee
 * `/me`; y el `setupToken` sigue sirviendo exactamente para enrolar.
 */

vi.mock('../services/authSession.service', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/authSession.service')>()),
  switchTenant: vi.fn(),
  getMe: vi.fn(),
}));

describe('isTokenAllowed (regla pura)', () => {
  it.each([
    ['access en cualquier ruta', { type: 'access' }, '/v1/fleet', true],
    ['formato previo sin type ni scope', { id: 1 }, '/v1/fleet', true],
    ['token malformado (la ruta decide)', null, '/v1/fleet', true],
    ['mfa_setup en ruta de enrolamiento', { type: 'mfa_setup' }, '/v1/auth/mfa/setup', true],
    [
      'mfa_setup en enrolamiento por correo',
      { type: 'mfa_setup' },
      '/v1/auth/mfa/email/setup',
      true,
    ],
    ['mfa_setup fuera del enrolamiento', { type: 'mfa_setup' }, '/v1/auth/switch-tenant', false],
    ['mfa_setup en ruta desconocida (404)', { type: 'mfa_setup' }, undefined, false],
    ['reto de login (scope)', { scope: 'mfa_challenge' }, '/v1/auth/mfa/setup', false],
    ['reto de enrolamiento (scope)', { scope: 'mfa_email_setup' }, '/v1/auth/me', false],
    ['refresh en el encabezado', { type: 'refresh' }, '/v1/auth/me', false],
  ])('%s → %s', (_label, claims, url, allowed) => {
    expect(isTokenAllowed(claims as Parameters<typeof isTokenAllowed>[0], url)).toBe(allowed);
  });
});

describe('tokenTypeGuard sobre la app real', () => {
  const app = buildApp();
  let sign: (_p: object) => string;

  beforeAll(async () => {
    await app.ready();
    sign = (app as unknown as { jwt: { sign: (_p: object) => string } }).jwt.sign;
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const bearer = (t: string): Record<string, string> => ({ Authorization: `Bearer ${t}` });

  it('ataque 1 — mfaToken (solo contraseña) en /switch-tenant: 401, nunca llega a emitir sesión', async () => {
    const mfaToken = sign({ id: 30, challengeId: 'c', scope: 'mfa_challenge' });

    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/switch-tenant',
      headers: bearer(mfaToken),
      payload: { tenantId: 4 },
    });

    expect(res.statusCode).toBe(401);
    expect(res.json().code).toBe('TOKEN_TYPE_NOT_ALLOWED');
    expect(SessionService.switchTenant).not.toHaveBeenCalled();
  });

  it('ataque 2 — setupToken (enrolamiento obligatorio pendiente) en /switch-tenant: 401', async () => {
    const setupToken = sign({ id: 30, username: 'arc', type: 'mfa_setup' });

    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/switch-tenant',
      headers: bearer(setupToken),
      payload: { tenantId: 4 },
    });

    expect(res.statusCode).toBe(401);
    expect(SessionService.switchTenant).not.toHaveBeenCalled();
  });

  it('un token de reto tampoco lee el perfil (/me)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/auth/me',
      headers: bearer(sign({ id: 30, challengeId: 'c', scope: 'mfa_challenge' })),
    });

    expect(res.statusCode).toBe(401);
    expect(SessionService.getMe).not.toHaveBeenCalled();
  });

  it('un access token sí pasa la guardia (la ruta sigue su curso)', async () => {
    (SessionService.switchTenant as Mock).mockResolvedValue({
      ok: false,
      status: 403,
      code: 'FORBIDDEN',
    });

    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/switch-tenant',
      headers: bearer(sign({ id: 30, roleId: 3, type: 'access' })),
      payload: { tenantId: 4 },
    });

    expect(res.statusCode).toBe(403);
    expect(SessionService.switchTenant).toHaveBeenCalled();
  });

  it.each([
    ['un token malformado lo sigue rechazando la propia ruta', 'Bearer not-a-jwt'],
    ['Authorization que no es Bearer: la guardia no interviene', 'Basic abc'],
  ])('%s (401 de jwtVerify)', async (_label, authorization) => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/switch-tenant',
      headers: { Authorization: authorization },
      payload: { tenantId: 4 },
    });

    expect(res.statusCode).toBe(401);
    expect(SessionService.switchTenant).not.toHaveBeenCalled();
  });

  it('"Bearer" sin token: la guardia no interviene (la respuesta es la de jwtVerify, previa a FC195)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/switch-tenant',
      headers: { Authorization: 'Bearer    ' },
      payload: { tenantId: 4 },
    });

    expect(res.json().code).not.toBe('TOKEN_TYPE_NOT_ALLOWED');
    expect(SessionService.switchTenant).not.toHaveBeenCalled();
  });
});
