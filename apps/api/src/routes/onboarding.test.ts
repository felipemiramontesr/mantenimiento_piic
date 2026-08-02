import { describe, it, expect, beforeAll } from 'vitest';
import buildApp from '../index';

/**
 * FC 082 F3c3 Cond.4 (Bravo) — onboarding.ts retirado a guard 501 puro.
 * Los 4 endpoints conservan su guard de auth/permiso original (401/403);
 * un caller autenticado y autorizado recibe 501, nunca la lógica legacy.
 */
describe('Onboarding Routes — retirado FC 082 F3c3 (guard 501)', () => {
  const app = buildApp();
  let archonToken: string;
  let noPermToken: string;

  beforeAll(async () => {
    await app.ready();
    const { jwt } = app as unknown as { jwt: { sign: (_p: object) => string } };
    archonToken = jwt.sign({ id: 1, username: 'archon', roleId: 0, permissions: ['*'] });
    noPermToken = jwt.sign({ id: 2, username: 'nadie', roleId: 2, permissions: ['fleet:view'] });
  });

  const auth = (token: string): Record<string, string> => ({ Authorization: `Bearer ${token}` });

  const endpoints: { method: 'GET' | 'POST'; url: string; permission: string }[] = [
    { method: 'POST', url: '/v1/onboarding/universe', permission: '*' },
    { method: 'POST', url: '/v1/onboarding/client', permission: 'onboarding:client:create' },
    { method: 'GET', url: '/v1/onboarding/universes', permission: '*' },
    { method: 'POST', url: '/v1/onboarding/member', permission: 'onboarding:member:create' },
  ];

  it.each(endpoints)('$method $url — 401 sin sesión', async ({ method, url }) => {
    const res = await app.inject({ method, url });
    expect(res.statusCode).toBe(401);
  });

  it.each(endpoints)('$method $url — 403 sin el permiso requerido', async ({ method, url }) => {
    const res = await app.inject({ method, url, headers: auth(noPermToken) });
    expect(res.statusCode).toBe(403);
  });

  it.each(endpoints)(
    '$method $url — 501 NOT_IMPLEMENTED con sesión y permiso válidos',
    async ({ method, url }) => {
      const res = await app.inject({ method, url, headers: auth(archonToken) });
      expect(res.statusCode).toBe(501);
      expect(JSON.parse(res.payload).code).toBe('NOT_IMPLEMENTED');
    }
  );
});
