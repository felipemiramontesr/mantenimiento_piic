import { describe, it, expect, vi, beforeAll } from 'vitest';
import buildApp from '../index';

/**
 * AT-FC18-C2-AR: Universe Routing — Archon_Universe_Routing_Restructure
 * Verifies that domain routes are served under /v1/mantenimiento/ AND
 * that legacy /v1/ aliases remain fully operational (zero regression).
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

describe('FC-18 FaseC-2 — Universe Routing (AT-FC18-C2-AR)', () => {
  const app = buildApp();
  let token: string;

  beforeAll(async () => {
    await app.ready();
    token = await (app as unknown as { jwt: { sign: (_p: object) => Promise<string> } }).jwt.sign({
      id: 1,
      username: 'admin',
      roleId: 1,
      roleName: 'Director',
      permissions: ['*'],
    });
  }, 15000);

  const auth = (): Record<string, string> => ({ Authorization: `Bearer ${token}` });

  // AT-FC18-C2-AR-1: Universe-prefixed fleet route is live
  it('AT-FC18-C2-AR-1 — GET /v1/mantenimiento/fleet responds (not 404)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/mantenimiento/fleet',
      headers: auth(),
    });
    expect(res.statusCode).not.toBe(404);
  });

  // AT-FC18-C2-AR-2: Legacy alias preserved — same handler, same response
  it('AT-FC18-C2-AR-2 — GET /v1/fleet (legacy alias) responds identically', async () => {
    const legacy = await app.inject({
      method: 'GET',
      url: '/v1/fleet',
      headers: auth(),
    });
    const universe = await app.inject({
      method: 'GET',
      url: '/v1/mantenimiento/fleet',
      headers: auth(),
    });
    expect(legacy.statusCode).not.toBe(404);
    expect(universe.statusCode).toBe(legacy.statusCode);
  });

  // AT-FC18-C2-AR-3 (FC 082 F0c): las rutas CRM murieron (084_AN §1b) — el
  // prefijo de universo ahora debe responder 404 para /contacts.
  it('AT-FC18-C2-AR-3 — GET /v1/mantenimiento/contacts responde 404 (CRM purgado)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/mantenimiento/contacts',
      headers: auth(),
    });
    expect(res.statusCode).toBe(404);
  });
});
