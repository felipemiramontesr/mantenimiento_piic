import { describe, it, expect, beforeAll } from 'vitest';
import buildApp from '../index';

/** FC199 F3 — `GET /v1/public/bot-challenge`: anónimo, sin caché y con la forma ALTCHA. */

describe('GET /v1/public/bot-challenge', () => {
  const app = buildApp();

  beforeAll(async () => {
    await app.ready();
  });

  it('responde un reto nuevo sin sesión y con Cache-Control: no-store', async () => {
    const first = await app.inject({ method: 'GET', url: '/v1/public/bot-challenge' });
    const second = await app.inject({ method: 'GET', url: '/v1/public/bot-challenge' });

    expect(first.statusCode).toBe(200);
    expect(first.headers['cache-control']).toBe('no-store');
    const body = first.json();
    expect(body).toMatchObject({ algorithm: 'SHA-256' });
    expect(body.challenge).toMatch(/^[0-9a-f]{64}$/);
    expect(body.salt).toContain('?expires=');
    expect(second.json().challenge).not.toBe(body.challenge);
  });
});
