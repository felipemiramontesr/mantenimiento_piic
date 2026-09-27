import { describe, it, expect, vi, beforeAll } from 'vitest';
import buildApp from '../index';

/**
 * FC199 F1 — sonda temporal de red. Cubre el contrato que usamos para medir en producción qué IP ve
 * Fastify detrás del proxy/CDN de Hostinger: sin sesión, solo cabeceras de proxy con valor, sin DB.
 */

vi.mock('../services/db', () => ({
  default: { execute: vi.fn().mockResolvedValue([[], undefined]), getConnection: vi.fn() },
}));

describe('GET /v1/public/net-probe', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  it('responde sin sesión con la vista de red de quien consulta', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/public/net-probe',
      remoteAddress: '10.0.0.7',
      headers: { 'x-forwarded-for': '203.0.113.9, 10.0.0.1', 'x-real-ip': '203.0.113.9' },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.socket).toBe('10.0.0.7');
    expect(body.ip).toBe('10.0.0.7');
    expect(body.proxyHeaders).toEqual({
      'x-forwarded-for': '203.0.113.9, 10.0.0.1',
      'x-real-ip': '203.0.113.9',
    });
    expect(body.headerNames).toContain('x-forwarded-for');
  });

  it('no copia valores de cabeceras ajenas al proxy (ej. authorization)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/public/net-probe',
      headers: { authorization: 'Bearer secreto', 'user-agent': 'probe' },
    });

    const body = res.json();
    expect(body.proxyHeaders).toEqual({});
    expect(JSON.stringify(body)).not.toContain('secreto');
    expect(body.headerNames).toContain('authorization');
  });
});
