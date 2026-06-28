import { describe, it, expect, vi, beforeAll } from 'vitest';
import buildApp from '../index';

/**
 * AT-FC18-C1: UniverseContext Plugin — Global Tenancy Middleware
 * Verifies that request.universeCtx is decorated correctly for all request types.
 * ownerId resolution is deferred to FaseD-2 (requireOwnership) — tested there.
 */

vi.mock('../services/db', () => ({
  default: {
    execute: vi.fn().mockResolvedValue([[], undefined]),
    query: vi.fn().mockResolvedValue([[], undefined]),
    getConnection: vi.fn(() =>
      Promise.resolve({
        beginTransaction: vi.fn(),
        commit: vi.fn(),
        rollback: vi.fn(),
        release: vi.fn(),
        execute: vi.fn().mockResolvedValue([[], undefined]),
        query: vi.fn().mockResolvedValue([[], undefined]),
      })
    ),
  },
}));

vi.mock('../services/encryption', () => ({
  default: {
    encrypt: vi.fn((v: string) => `enc_${v}`),
    decrypt: vi.fn((v: string) => (v ? v.replace('enc_', '') : v)),
    generateBlindIndex: vi.fn((v: string) => `hash_${v}`),
  },
}));

describe('FC-18 FaseC-1 — UniverseContextPlugin (AT-FC18-C1)', () => {
  const app = buildApp();

  // Probe route must be registered BEFORE app.ready() — Fastify rejects route addition after start
  app.get(
    '/v1/_test/universe-ctx',
    {
      onRequest: async (request, reply) => {
        try {
          await request.jwtVerify();
        } catch {
          reply.code(401).send({ error: 'UNAUTHORIZED' });
        }
      },
    },
    async (request): Promise<Record<string, unknown>> => ({ universeCtx: request.universeCtx })
  );

  beforeAll(async () => {
    await app.ready();
  });

  type Ctx = {
    universeCtx: { universeId: number; isOmnipotent: boolean; ownerId: null; tenantId: number };
  };

  const sign = (payload: object): Promise<string> =>
    (app as unknown as { jwt: { sign: (_p: object) => Promise<string> } }).jwt.sign(payload);

  // AT-FC18-C1-UC-1: Archon (permissions:['*']) → isOmnipotent=true, ownerId=null
  it('AT-FC18-C1-UC-1 — Archon (permissions:["*"]) obtiene isOmnipotent=true', async () => {
    const token = await sign({
      id: 1,
      username: 'archon',
      roleId: 1,
      roleName: 'Admin',
      permissions: ['*'],
    });
    const res = await app.inject({
      method: 'GET',
      url: '/v1/_test/universe-ctx',
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    const { universeCtx } = res.json() as Ctx;
    expect(universeCtx.isOmnipotent).toBe(true);
    expect(universeCtx.ownerId).toBeNull();
    expect(universeCtx.universeId).toBe(1);
  });

  // AT-FC18-C1-UC-2: roleId=0 → isOmnipotent=true (independiente de permissions)
  it('AT-FC18-C1-UC-2 — roleId=0 activa isOmnipotent independientemente de permissions', async () => {
    const token = await sign({
      id: 1,
      username: 'archon2',
      roleId: 0,
      roleName: 'Archon',
      permissions: [],
    });
    const res = await app.inject({
      method: 'GET',
      url: '/v1/_test/universe-ctx',
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    const { universeCtx } = res.json() as Ctx;
    expect(universeCtx.isOmnipotent).toBe(true);
  });

  // AT-FC18-C1-UC-3: Usuario scoped (no Archon) → isOmnipotent=false, universeCtx poblado
  it('AT-FC18-C1-UC-3 — Usuario scoped obtiene isOmnipotent=false y universeCtx no nulo', async () => {
    const token = await sign({
      id: 99,
      username: 'gestor',
      roleId: 4,
      roleName: 'Gestor Flotilla',
      permissions: ['fleet:unit:view:any'],
    });
    const res = await app.inject({
      method: 'GET',
      url: '/v1/_test/universe-ctx',
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    const { universeCtx } = res.json() as Ctx;
    expect(universeCtx).not.toBeNull();
    expect(universeCtx.isOmnipotent).toBe(false);
    expect(universeCtx.universeId).toBe(1);
    // ownerId deferred to FaseD-2 requireOwnership (always null aquí)
    expect(universeCtx.ownerId).toBeNull();
  });

  // AT-FC18-C1-UC-4: Sin token → 401 (preHandler no debe ejecutarse)
  it('AT-FC18-C1-UC-4 — Petición sin token devuelve 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/_test/universe-ctx' });
    expect(res.statusCode).toBe(401);
  });

  // AT-FC18-C1-UC-5: Plugin no rompe ruta existente /v1/fleet (zero-regression)
  it('AT-FC18-C1-UC-5 — GET /v1/fleet con Archon token responde sin 500', async () => {
    const token = await sign({
      id: 1,
      username: 'archon',
      roleId: 0,
      roleName: 'Archon',
      permissions: ['*'],
    });
    const res = await app.inject({
      method: 'GET',
      url: '/v1/fleet',
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).not.toBe(500);
    expect(res.statusCode).not.toBe(404);
  });

  // AT-FC18-C1-UC-6: universeCtx existe como propiedad de request (decorateRequest aplicado)
  it('AT-FC18-C1-UC-6 — universeCtx es un objeto estructurado (no null) para usuario autenticado', async () => {
    const token = await sign({
      id: 5,
      username: 'user5',
      roleId: 3,
      roleName: 'Director Finanzas',
      permissions: ['finance:dashboard:view:any'],
    });
    const res = await app.inject({
      method: 'GET',
      url: '/v1/_test/universe-ctx',
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as Ctx;
    expect(body.universeCtx).toMatchObject({ universeId: 1, isOmnipotent: false, ownerId: null });
  });
});
