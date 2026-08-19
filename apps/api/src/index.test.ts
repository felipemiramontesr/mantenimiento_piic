import { describe, it, expect, vi, afterEach } from 'vitest';
import buildApp from './index';
import db from './services/db';

/**
 * FC162 F1-T7 — `index.ts` came out of the blanket Sonar/Vitest exclude
 * (Cond.R-162-F1): it isn't pure bootstrap, it mixes real security logic
 * (CORS/CSP/rate-limit/error-handler) with the startup block. Every existing
 * route test already exercises `registerCorePlugins`/`registerObservabilityHooks`
 * indirectly via `buildApp()` — this file closes the remaining branch gaps
 * that only fire under `NODE_ENV=production`/`development`, which no
 * existing test touches (all run under the default test env).
 */

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.resetModules();
});

describe('production fail-fast (module load time)', () => {
  // `dotenv.config()` re-runs on every fresh import (vi.resetModules() clears
  // the cache) and only fills in keys ABSENT from process.env — `delete`ing a
  // key lets the repo-root .env file's real value silently repopulate it. An
  // empty string stays "present" to dotenv but is still falsy to the `!var` check.
  it('throws when NODE_ENV=production and JWT_SECRET is missing', async () => {
    vi.resetModules();
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = '';
    process.env.DB_ENCRYPTION_KEY = 'test-key';
    await expect(import('./index')).rejects.toThrow('JWT_SECRET env var is required in production');
  });

  it('throws when NODE_ENV=production and DB_ENCRYPTION_KEY is missing', async () => {
    vi.resetModules();
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'test-secret';
    process.env.DB_ENCRYPTION_KEY = '';
    await expect(import('./index')).rejects.toThrow(
      'DB_ENCRYPTION_KEY env var is required in production'
    );
  });

  it('does not throw when NODE_ENV=production and both secrets are present', async () => {
    vi.resetModules();
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'test-secret';
    process.env.DB_ENCRYPTION_KEY = 'test-key';
    const mod = await import('./index');
    expect(mod.default).toBeTypeOf('function');
  });
});

describe('environment-dependent error handler', () => {
  it('hides the real error message behind a generic one when NODE_ENV=production', async () => {
    vi.resetModules();
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'test-secret';
    process.env.DB_ENCRYPTION_KEY = 'test-key';
    const { default: buildProdApp } = await import('./index');
    const app = buildProdApp();
    app.get('/__fc162-throw-test', async () => {
      throw new Error('sensitive internal detail');
    });
    const res = await app.inject({ method: 'GET', url: '/__fc162-throw-test' });
    expect(res.statusCode).toBe(500);
    const body = JSON.parse(res.body);
    expect(body.message).toBe('Internal Server Error');
    expect(body.message).not.toContain('sensitive internal detail');
  });

  it('surfaces the real error message outside production (dev/test ergonomics)', async () => {
    const app = buildApp();
    app.get('/__fc162-throw-test-2', async () => {
      throw new Error('debug detail visible outside production');
    });
    const res = await app.inject({ method: 'GET', url: '/__fc162-throw-test-2' });
    expect(res.statusCode).toBe(500);
    expect(JSON.parse(res.body).message).toBe('debug detail visible outside production');
  });
});

describe('JWT secret fallback (100% mandatorio, FC162 R3)', () => {
  it('boots with the dev fallback secret when JWT_SECRET is truly absent outside production', async () => {
    vi.resetModules();
    // dotenv.config() only fills ABSENT process.env keys — the repo-root .env
    // always has a real JWT_SECRET, so it would silently refill a `delete`d
    // key. Stub dotenv itself so the fallback literal in index.ts is the only
    // thing that can supply a secret.
    vi.doMock('dotenv', () => ({ default: { config: vi.fn() } }));
    process.env.NODE_ENV = 'test';
    delete process.env.JWT_SECRET;
    const { default: buildDevApp } = await import('./index');
    const app = buildDevApp();
    await app.ready();
    const token = app.jwt.sign({ id: 1, permissions: ['*'] });
    expect(typeof token).toBe('string');
    vi.doUnmock('dotenv');
  });
});

describe('rate-limit ceiling by environment', () => {
  it('builds without error under NODE_ENV=development (5000 req/min branch)', async () => {
    vi.resetModules();
    process.env.NODE_ENV = 'development';
    const { default: buildDevApp } = await import('./index');
    expect(() => buildDevApp()).not.toThrow();
  });
});

describe('diagnostic routes', () => {
  it('GET / returns the service identity payload', async () => {
    const res = await buildApp().inject({ method: 'GET', url: '/' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.service).toBe('Archon API (Fleet Core)');
    expect(body.status).toBe('online');
  });

  it('GET /metrics returns a Prometheus-formatted text payload', async () => {
    const res = await buildApp().inject({ method: 'GET', url: '/metrics' });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/plain');
  });
});

describe('GET /health/db (DB-1045 P4 probe)', () => {
  // Incidente DB-1045 (FC082, Alfa/Bravo P4) — /health no probaba la DB
  // (ciego a caídas de conexión). Restaurado en FC162 F1-T7 tras haber sido
  // sobrescrito por error al crear este archivo de test sin leerlo primero
  // (violación del flujo Read-antes-de-Write) — mismas 2 aserciones
  // originales (200/SELECT 1 llamado, 503/sin fuga del error crudo),
  // adaptadas al helper `buildApp()` + `vi.spyOn` de este archivo.
  it('returns 200 operational when the DB probe query succeeds', async () => {
    const spy = vi.spyOn(db, 'execute').mockResolvedValueOnce([[{ '1': 1 }], []] as never);
    const res = await buildApp().inject({ method: 'GET', url: '/health/db' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.status).toBe('operational');
    expect(typeof body.latencyMs).toBe('number');
    expect(db.execute).toHaveBeenCalledWith('SELECT 1');
    spy.mockRestore();
  });

  it('returns 503 down when the DB probe query fails, without leaking the raw error to the client', async () => {
    const spy = vi.spyOn(db, 'execute').mockRejectedValueOnce({
      message: "Access denied for user 'u701509674_Felipe'@'127.0.0.1' (using password: YES)",
      errno: 1045,
      code: 'ER_ACCESS_DENIED_ERROR',
      sqlState: '28000',
    });
    const res = await buildApp().inject({ method: 'GET', url: '/health/db' });
    expect(res.statusCode).toBe(503);
    const body = JSON.parse(res.body);
    expect(body.status).toBe('down');
    expect(JSON.stringify(body)).not.toContain('u701509674_Felipe');
    spy.mockRestore();
  });
});
