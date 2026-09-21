import { describe, it, expect, vi, beforeEach, beforeAll, afterAll, Mock } from 'vitest';
import Fastify, { FastifyInstance, LightMyRequestResponse } from 'fastify';
import withCapability from './capabilityGate';
import { getUniverseCapabilities } from '../services/universeCapabilities.service';

/**
 * FC193 F2 (D7) — el gate a nivel de PLUGIN: lo heredan las rutas del hijo bajo AMBOS prefijos, corre
 * antes que los `preHandler` del propio plugin y el hijo no duplica el prefijo. Scenario 2 del FC con
 * una ruta sintética de CRM (CRM no tiene ninguna ruta real: 372_AN R6).
 */

vi.mock('../services/universeCapabilities.service', () => ({ getUniverseCapabilities: vi.fn() }));

const capabilities = getUniverseCapabilities as Mock;
const order: string[] = [];

const crmPlugin = async (scope: FastifyInstance): Promise<void> => {
  scope.addHook('preHandler', async () => {
    order.push('preHandler-del-plugin');
  });
  scope.get('/crm/contacts', async () => ({ ok: true }));
};

const TENANT = JSON.stringify({ id: 20, roleId: 3, permissions: [], tenant_id: 5 });
const OMEGA = JSON.stringify({ id: 1, roleId: 0, permissions: ['*'], tenant_id: null });

describe('FC193 F2 — withCapability (D7)', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify();
    app.decorateRequest('user', undefined as never);
    app.addHook('onRequest', async (request) => {
      const raw = request.headers['x-test-user'];
      // eslint-disable-next-line no-param-reassign
      if (typeof raw === 'string') (request as unknown as { user: unknown }).user = JSON.parse(raw);
    });
    const gated = withCapability({ supercluster: 'CRM' }, crmPlugin);
    app.register(gated, { prefix: '/v1' });
    app.register(gated, { prefix: '/v1/mantenimiento' });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    order.length = 0;
  });

  const get = (url: string, user?: string): Promise<LightMyRequestResponse> =>
    app.inject({ method: 'GET', url, headers: user ? { 'x-test-user': user } : {} });

  it.each(['/v1/crm/contacts', '/v1/mantenimiento/crm/contacts'])(
    'Scenario 2 — universo sin CRM activo: %s ⇒ 403 CAPABILITY_NOT_ACTIVE (ambos prefijos heredan el gate)',
    async (url) => {
      capabilities.mockResolvedValue({ superclusters: new Set(['RASTREO']), clusters: new Set() });

      const res = await get(url, TENANT);

      expect(res.statusCode).toBe(403);
      expect(res.json()).toMatchObject({ success: false, code: 'CAPABILITY_NOT_ACTIVE' });
    }
  );

  it.each(['/v1/crm/contacts', '/v1/mantenimiento/crm/contacts'])(
    'Scenario 1 — universo con CRM activo: %s ⇒ 200',
    async (url) => {
      capabilities.mockResolvedValue({ superclusters: new Set(['CRM']), clusters: new Set() });

      const res = await get(url, TENANT);

      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ ok: true });
    }
  );

  it('Scenario 3 — Ω pasa sin consultar capacidades', async () => {
    const res = await get('/v1/crm/contacts', OMEGA);

    expect(res.statusCode).toBe(200);
    expect(capabilities).not.toHaveBeenCalled();
  });

  it('el gate corre ANTES que el preHandler del propio plugin: si deniega, el del plugin no se ejecuta', async () => {
    capabilities.mockResolvedValue({ superclusters: new Set(), clusters: new Set() });

    await get('/v1/crm/contacts', TENANT);
    expect(order).toEqual([]);

    capabilities.mockResolvedValue({ superclusters: new Set(['CRM']), clusters: new Set() });
    await get('/v1/crm/contacts', TENANT);
    expect(order).toEqual(['preHandler-del-plugin']);
  });

  it('el plugin hijo no duplica el prefijo del contenedor', async () => {
    capabilities.mockResolvedValue({ superclusters: new Set(['CRM']), clusters: new Set() });

    expect((await get('/v1/v1/crm/contacts', TENANT)).statusCode).toBe(404);
  });

  it('sin usuario ⇒ 401 UNAUTHORIZED', async () => {
    const res = await get('/v1/crm/contacts');

    expect(res.statusCode).toBe(401);
    expect(res.json()).toMatchObject({ code: 'UNAUTHORIZED' });
  });
});
