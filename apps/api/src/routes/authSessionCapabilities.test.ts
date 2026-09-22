import { describe, it, expect, vi, beforeAll, beforeEach, Mock } from 'vitest';
import type { LightMyRequestResponse } from 'fastify';
import buildApp from '../index';
import * as SessionService from '../services/authSession.service';
import * as MfaService from '../services/mfa.service';
import { getUniverseCapabilities } from '../services/universeCapabilities.service';

/**
 * FC193 F3 — `activeCapabilities` viaja en TODAS las respuestas de sesión (login, refresh,
 * switch-tenant, MFA verify y GET /me), con la misma fuente que el gate. Se simulan los servicios de
 * sesión y el de capacidades: aquí se prueba el cableado y la forma del payload.
 */

vi.mock('../services/encryption', () => ({
  default: { encrypt: vi.fn((v: string) => v), decrypt: vi.fn((v: string) => v) },
}));
vi.mock('../services/db', () => ({
  default: {
    execute: vi.fn().mockResolvedValue([[], undefined]),
    query: vi.fn().mockResolvedValue([[], undefined]),
    getConnection: vi.fn(),
  },
}));
vi.mock('../services/authSession.service', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/authSession.service')>()),
  login: vi.fn(),
  refresh: vi.fn(),
  getMe: vi.fn(),
  switchTenant: vi.fn(),
}));
vi.mock('../services/mfa.service', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/mfa.service')>()),
  verifyChallenge: vi.fn(),
}));
vi.mock('../services/universeCapabilities.service', () => ({
  getUniverseCapabilities: vi.fn(),
  invalidateUniverseCapabilities: vi.fn(),
}));

const svc = SessionService as unknown as Record<string, Mock>;
const mfa = MfaService as unknown as Record<string, Mock>;
const capabilities = getUniverseCapabilities as Mock;

const TENANT_MAPPED = { id: 20, roleId: 3, roleName: 'Admin', username: 'tenant.user' };
const OMEGA_MAPPED = { id: 1, roleId: 0, roleName: 'GrayMan', username: 'GrayMan' };
const ARC_MAPPED = { id: 30, roleId: 7, roleName: 'Arc', username: 'arc.user' };

const success = (
  mapped: typeof TENANT_MAPPED,
  tenantId: number | null,
  permissions: string[]
): Record<string, unknown> => ({
  ok: true,
  userId: mapped.id,
  username: mapped.username,
  mapped,
  tenantId,
  permissions,
  ownerType: null,
  availableTenants: [],
});

const activeOfTenant = (superclusters: string[], clusters: string[] = []): void => {
  capabilities.mockResolvedValue({
    superclusters: new Set(superclusters),
    clusters: new Set(clusters),
  });
};

const ALL = {
  superclusters: ['CRM', 'RASTREO', 'MANTENIMIENTO', 'FINANZAS', 'RRHH'],
  clusters: ['GASTOS_EGRESOS'],
};

describe('FC193 F3 — activeCapabilities en el payload de sesión', () => {
  const app = buildApp();
  let bearer: Record<string, string>;
  let refreshCookie: Record<string, string>;

  beforeAll(async () => {
    await app.ready();
    const { jwt } = app as unknown as { jwt: { sign: (_p: object, _o?: object) => string } };
    bearer = {
      authorization: `Bearer ${jwt.sign({ id: 20, roleId: 3, permissions: [], tenant_id: 5 })}`,
    };
    refreshCookie = {
      refresh_token: jwt.sign({ id: 20, type: 'refresh', tenant_id: 5 }, { expiresIn: '7d' }),
    };
  });

  beforeEach(() => {
    vi.clearAllMocks();
    activeOfTenant(['FINANZAS', 'RASTREO'], ['GASTOS_EGRESOS']);
  });

  const login = (): Promise<LightMyRequestResponse> =>
    app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { username: 'u', password: 'p' },
    });

  describe('POST /login', () => {
    it('tenant normal ⇒ las capacidades ACTIVE de su universo (5), ordenadas', async () => {
      svc.login.mockResolvedValue(success(TENANT_MAPPED, 5, ['fleet:unit:view:own']));

      const res = await login();

      expect(res.statusCode).toBe(200);
      expect(res.json().user.activeCapabilities).toEqual({
        superclusters: ['FINANZAS', 'RASTREO'],
        clusters: ['GASTOS_EGRESOS'],
      });
      expect(capabilities).toHaveBeenCalledWith(5);
    });

    it('universo con MANTENIMIENTO suspendido ⇒ no aparece en el payload', async () => {
      activeOfTenant(['RASTREO']);
      svc.login.mockResolvedValue(success(TENANT_MAPPED, 5, ['fleet:unit:view:own']));

      const res = await login();

      expect(res.json().user.activeCapabilities).toEqual({
        superclusters: ['RASTREO'],
        clusters: [],
      });
    });

    it('Ω ⇒ todo el manifiesto, sin consultar capacidades', async () => {
      svc.login.mockResolvedValue(success(OMEGA_MAPPED, null, ['*']));

      const res = await login();

      expect(res.json().user.activeCapabilities).toEqual(ALL);
      expect(capabilities).not.toHaveBeenCalled();
    });

    it('Arc itinerante (tenant_id null) ⇒ ninguna capacidad', async () => {
      svc.login.mockResolvedValue(success(ARC_MAPPED, null, ['social:post:view']));

      const res = await login();

      expect(res.json().user.activeCapabilities).toEqual({ superclusters: [], clusters: [] });
      expect(capabilities).not.toHaveBeenCalled();
    });

    it('fail-closed: si no se pueden leer las capacidades NO se emite la sesión (500 LOGIN_FAIL)', async () => {
      svc.login.mockResolvedValue(success(TENANT_MAPPED, 5, []));
      capabilities.mockRejectedValue(new Error('db down'));

      const res = await login();

      expect(res.statusCode).toBe(500);
      expect(res.json()).toEqual({ error: 'LOGIN_FAIL' });
      expect(res.headers['set-cookie']).toBeUndefined();
    });
  });

  it('POST /refresh ⇒ activeCapabilities del universo del refresh token', async () => {
    svc.refresh.mockResolvedValue(success(TENANT_MAPPED, 5, ['fleet:unit:view:own']));

    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/refresh',
      cookies: refreshCookie,
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().user.activeCapabilities).toEqual({
      superclusters: ['FINANZAS', 'RASTREO'],
      clusters: ['GASTOS_EGRESOS'],
    });
  });

  it('POST /switch-tenant ⇒ activeCapabilities del universo AL QUE se cambió', async () => {
    activeOfTenant(['MANTENIMIENTO', 'RASTREO']);
    svc.switchTenant.mockResolvedValue(success(TENANT_MAPPED, 7, ['maint:record:view:own']));

    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/switch-tenant',
      headers: bearer,
      payload: { tenantId: 7 },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().user.activeCapabilities.superclusters).toEqual(['MANTENIMIENTO', 'RASTREO']);
    expect(capabilities).toHaveBeenCalledWith(7);
  });

  it('POST /mfa/verify ⇒ la sesión completa también trae activeCapabilities', async () => {
    const { jwt } = app as unknown as { jwt: { sign: (_p: object) => string } };
    mfa.verifyChallenge.mockResolvedValue(success(OMEGA_MAPPED, null, ['*']));

    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/mfa/verify',
      payload: {
        mfaToken: jwt.sign({ id: 1, challengeId: 9, scope: 'mfa_challenge' }),
        code: '123456',
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().user.activeCapabilities).toEqual(ALL);
  });

  describe('GET /me', () => {
    it('data.activeCapabilities (paridad login/me)', async () => {
      svc.getMe.mockResolvedValue({
        mapped: TENANT_MAPPED,
        permissions: ['fleet:unit:view:own'],
        tenantId: 5,
        ownerType: null,
        availableTenants: [],
      });

      const res = await app.inject({ method: 'GET', url: '/v1/auth/me', headers: bearer });

      expect(res.statusCode).toBe(200);
      expect(res.json().data.activeCapabilities).toEqual({
        superclusters: ['FINANZAS', 'RASTREO'],
        clusters: ['GASTOS_EGRESOS'],
      });
      expect(res.json().data.capabilities).toEqual(['fleet:unit:view:own']);
    });
  });
});
