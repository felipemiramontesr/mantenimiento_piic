import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';

import buildApp from './index';
import { resetSecurityMetrics } from './services/securityLog';

/**
 * 🔱 FC 062 F3 — A09_Security_Logging (Scenario 3, integración)
 * Un request rechazado (401/403) incrementa los contadores de /metrics
 * y queda registrado como evento de seguridad — sin tocar cada ruta.
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

describe('FC062-F3 — /metrics + security events (integration)', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = buildApp({ logger: false });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    resetSecurityMetrics();
  });

  it('A09-7: GET /metrics responds text/plain in Prometheus exposition format', async () => {
    await app.inject({ method: 'GET', url: '/health' });
    const res = await app.inject({ method: 'GET', url: '/metrics' });
    expect(res.statusCode).toBe(200);
    expect(String(res.headers['content-type'])).toContain('text/plain');
    expect(res.body).toContain('# TYPE archon_http_responses_total counter');
    expect(res.body).toContain('archon_http_responses_total{code="200"}');
  });

  it('A09-8 (Scenario 3): request con JWT inválido → 401 contado y evento AUTH_FAILURE', async () => {
    const denied = await app.inject({
      method: 'POST',
      url: '/v1/security/panic',
      headers: { authorization: 'Bearer not-a-real-token' },
      payload: {},
    });
    expect(denied.statusCode).toBe(401);

    const res = await app.inject({ method: 'GET', url: '/metrics' });
    expect(res.body).toContain('archon_http_responses_total{code="401"} 1');
    expect(res.body).toContain('archon_security_events_total{event="AUTH_FAILURE"} 1');
  });

  it('A09-9: /metrics no expone PII — solo contadores agregados', async () => {
    await app.inject({
      method: 'POST',
      url: '/v1/security/panic',
      headers: { authorization: 'Bearer nope' },
      payload: {},
    });
    const res = await app.inject({ method: 'GET', url: '/metrics' });
    expect(res.body).not.toMatch(/email|placas|numeroSerie|authorization|Bearer/i);
  });
});
