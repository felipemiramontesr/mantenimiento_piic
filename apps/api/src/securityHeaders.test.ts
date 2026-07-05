import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import buildApp from './index';

/**
 * 🔱 FC 062 F1 — A05_Config_Hardening (Scenario 1)
 * Asserts hardened headers, explicit CORS allowlist, production-safe
 * error handler (§8.2) and payload limits on every API response.
 */

vi.mock('./services/db', () => ({
  default: {
    execute: vi.fn().mockResolvedValue([[], undefined]),
    getConnection: vi.fn(() =>
      Promise.resolve({
        beginTransaction: vi.fn(),
        commit: vi.fn(),
        rollback: vi.fn(),
        release: vi.fn(),
        execute: vi.fn().mockResolvedValue([[], undefined]),
      })
    ),
  },
}));

const INTERNAL_SECRET_MSG = 'internal detail: connection string leaked';

const buildTestApp = (): FastifyInstance => {
  const app = buildApp({ logger: false });
  app.get('/fc062-boom', async () => {
    throw new Error(INTERNAL_SECRET_MSG);
  });
  app.post('/fc062-echo', async () => ({ ok: true }));
  return app;
};

describe('FC062-F1 — A05 hardened headers (non-production)', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = buildTestApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('A05-1: CSP includes frame-ancestors, object-src, base-uri and form-action', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    const csp = String(res.headers['content-security-policy']);
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
    expect(csp).toContain("default-src 'self'");
  });

  it('A05-2: HSTS, nosniff and frameguard present on every response', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(String(res.headers['strict-transport-security'])).toContain('max-age=31536000');
    expect(String(res.headers['strict-transport-security'])).toContain('includeSubDomains');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('DENY');
  });

  it('A05-3: X-Powered-By is never emitted', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('A05-4: CORS allows loopback origins in non-production', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/health',
      headers: { origin: 'http://localhost:5173' },
    });
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });

  it('A05-5: CORS rejects foreign origins in non-production', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/health',
      headers: { origin: 'https://evil.example.com' },
    });
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('A05-6: unhandled 5xx in non-production keeps the message for debugging (§8.2 shape)', async () => {
    const res = await app.inject({ method: 'GET', url: '/fc062-boom' });
    expect(res.statusCode).toBe(500);
    const body = JSON.parse(res.body) as { success: boolean; code: string; message: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('INTERNAL_ERROR');
    expect(body.message).toContain(INTERNAL_SECRET_MSG);
    expect(res.body).not.toContain('at '); // no stack frames serialized
  });

  it('A05-7: 4xx errors keep default behavior (404 unknown route)', async () => {
    const res = await app.inject({ method: 'GET', url: '/fc062-nope' });
    expect(res.statusCode).toBe(404);
  });

  it('A05-8: payload above 10MB bodyLimit is rejected with 413', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/fc062-echo',
      headers: { 'content-type': 'application/json' },
      payload: `{"blob":"${'x'.repeat(11 * 1024 * 1024)}"}`,
    });
    expect(res.statusCode).toBe(413);
  });
});

describe('FC062-F1 — A05 production mode', () => {
  let prodApp: FastifyInstance;
  const origEnv = process.env.NODE_ENV;

  beforeAll(async () => {
    process.env.NODE_ENV = 'production';
    prodApp = buildTestApp();
    await prodApp.ready();
  });

  afterAll(async () => {
    process.env.NODE_ENV = origEnv;
    await prodApp.close();
  });

  it('A05-9: CORS in production only allows the configured frontend origin', async () => {
    const allowed = process.env.FRONTEND_URL ?? 'https://mantenimiento.piic.com.mx';
    const okRes = await prodApp.inject({
      method: 'GET',
      url: '/health',
      headers: { origin: allowed },
    });
    expect(okRes.headers['access-control-allow-origin']).toBe(allowed);

    const evilRes = await prodApp.inject({
      method: 'GET',
      url: '/health',
      headers: { origin: 'http://localhost:5173' },
    });
    expect(evilRes.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('A05-10: unhandled 5xx in production is scrubbed — §8.2 INTERNAL_ERROR without internals', async () => {
    const res = await prodApp.inject({ method: 'GET', url: '/fc062-boom' });
    expect(res.statusCode).toBe(500);
    const body = JSON.parse(res.body) as { success: boolean; code: string; message: string };
    expect(body.success).toBe(false);
    expect(body.code).toBe('INTERNAL_ERROR');
    expect(body.message).toBe('Internal Server Error');
    expect(res.body).not.toContain(INTERNAL_SECRET_MSG);
    expect(res.body).not.toContain('stack');
  });
});
