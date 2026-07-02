import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify from 'fastify';
import * as fs from 'fs';
import devTelemetryPlugin from './devTelemetry';

vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

describe('devTelemetryPlugin Integration Tests', () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('should intercept error and write to handoff in development mode', async () => {
    process.env.NODE_ENV = 'development';

    // Mock filesystem methods
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(`
# HANDOFF CC → AG — Archon ERP
Versión activa  : V.78.101.204_AG_Session_Initialization
Último mensaje  : **AG → CC** · 2026-06-14 14:04:56
## CANAL DE MENSAJES CC ↔ AG
`);

    const app = Fastify({ logger: false });
    await app.register(devTelemetryPlugin);

    // Register a route that throws an error
    app.get('/test-error', async () => {
      const err = new Error('Test unhandled API exception');
      (err as Error & { statusCode?: number }).statusCode = 500;
      throw err;
    });

    const response = await app.inject({
      method: 'GET',
      url: '/test-error',
    });

    await app.close();

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({
      success: false,
      code: 'INTERNAL_ERROR',
      message: 'Test unhandled API exception',
    });

    // Check that the filesystem mock was triggered to write to the handoff
    expect(fs.writeFileSync).toHaveBeenCalled();
    const [fileWritten, contentWritten] = vi.mocked(fs.writeFileSync).mock.calls[0];
    expect(fileWritten).toContain('002_NS_HandoffCcToAg.md');
    expect(contentWritten).toContain('**Archon → CC/AG**');
    expect(contentWritten).toContain('API_RUNTIME_ERROR');
    expect(contentWritten).toContain('Test unhandled API exception');
  }, 30000); // Higher timeout: heavy parallel test runs (pool:forks, 97 files) can slow fs mock resolution

  it('DT-3: existing Archon block + old inner title → compacts block and rewrites title (lines 57-62, 85-89)', async () => {
    process.env.NODE_ENV = 'development';
    vi.mocked(fs.existsSync).mockReturnValue(true);
    // Content with: (1) old inner title HANDOFF CC → AG\n═══... and (2) existing Archon block at end
    vi.mocked(fs.readFileSync).mockReturnValue(
      `# HANDOFF Archon → CC/AG\nHANDOFF CC → AG\n═══════════════════════════════════════════════════════════════\nÚltimo mensaje  : **CC → AG** · 2026-06-30 10:00:00\n## CANAL DE MENSAJES CC ↔ AG\n\n---\nArchon → CC/AG · 2026-06-30 10:00:00\n[DIAGNÓSTICO PREVIO] Previous error body here\n`
    );

    const app = Fastify({ logger: false });
    await app.register(devTelemetryPlugin);
    app.get('/test-error', async () => {
      const err = new Error('Second runtime exception');
      (err as Error & { statusCode?: number }).statusCode = 500;
      throw err;
    });

    const response = await app.inject({ method: 'GET', url: '/test-error' });
    await app.close();

    expect(response.statusCode).toBe(500);
    expect(fs.writeFileSync).toHaveBeenCalled();
    const [, contentWritten] = vi.mocked(fs.writeFileSync).mock.calls[0] as [string, string];
    // Archon block compactor ran (existing body preserved + new entry appended)
    expect(contentWritten).toContain('Previous error body here');
    expect(contentWritten).toContain('Second runtime exception');
    // Old inner title was replaced
    expect(contentWritten).toContain(
      'HANDOFF Archon → CC/AG\n═══════════════════════════════════════════════════════════════'
    );
  }, 15000);

  it('DT-4: writeFileSync throws → catch silencia el error y responde 500 normal (line 96)', async () => {
    process.env.NODE_ENV = 'development';
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(
      `# HANDOFF Archon → CC/AG\nÚltimo mensaje  : **CC → AG** · 2026-06-30 10:00:00\n## CANAL`
    );
    vi.mocked(fs.writeFileSync).mockImplementation(() => {
      throw new Error('ENOENT: no such file or directory');
    });

    const app = Fastify({ logger: false });
    await app.register(devTelemetryPlugin);
    app.get('/test-error', async () => {
      const err = new Error('FS write will fail');
      (err as Error & { statusCode?: number }).statusCode = 500;
      throw err;
    });

    const response = await app.inject({ method: 'GET', url: '/test-error' });
    await app.close();

    // Error handler catches writeFileSync throw silently and still returns 500
    expect(response.statusCode).toBe(500);
    expect(response.json().success).toBe(false);
  }, 15000);

  it('DT-5: statusCode=400 → errorCode=VALIDATION_ERROR (lines 99-100)', async () => {
    process.env.NODE_ENV = 'development';
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(
      `# HANDOFF Archon → CC/AG\nÚltimo mensaje  : **CC → AG** · 2026-07-01 01:00:00\n## CANAL`
    );

    const app = Fastify({ logger: false });
    await app.register(devTelemetryPlugin);
    app.get('/test-400', async () => {
      const err = new Error('Validation failed');
      (err as Error & { statusCode?: number }).statusCode = 400;
      throw err;
    });

    const response = await app.inject({ method: 'GET', url: '/test-400' });
    await app.close();

    expect(response.statusCode).toBe(400);
    expect(response.json().code).toBe('VALIDATION_ERROR');
  }, 15000);

  it('DT-6: error.stack falsy → usa error.toString() (line 32)', async () => {
    process.env.NODE_ENV = 'development';
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(
      `# HANDOFF Archon → CC/AG\nÚltimo mensaje  : **CC → AG** · 2026-07-01 01:00:00\n## CANAL`
    );

    const app = Fastify({ logger: false });
    await app.register(devTelemetryPlugin);
    app.get('/test-no-stack', async () => {
      const err = new Error('No stack error');
      Object.defineProperty(err, 'stack', { value: '', configurable: true, writable: true });
      (err as Error & { statusCode?: number }).statusCode = 500;
      throw err;
    });

    const response = await app.inject({ method: 'GET', url: '/test-no-stack' });
    await app.close();

    expect(response.statusCode).toBe(500);
    expect(response.json().code).toBe('INTERNAL_ERROR');
  }, 15000);

  it('DT-7: error without statusCode → falls back to 500 via || 500 (line 99)', async () => {
    process.env.NODE_ENV = 'development';
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(
      `# HANDOFF Archon → CC/AG\nÚltimo mensaje  : **CC → AG** · 2026-07-01 01:00:00\n## CANAL`
    );

    const app = Fastify({ logger: false });
    await app.register(devTelemetryPlugin);
    app.get('/test-no-status', async () => {
      throw new Error('Error without statusCode'); // statusCode = undefined → || 500 fires
    });

    const response = await app.inject({ method: 'GET', url: '/test-no-status' });
    await app.close();

    expect(response.statusCode).toBe(500);
    expect(response.json().code).toBe('INTERNAL_ERROR');
  }, 15000);

  it('should bypass filesystem write and execute standard handler in production mode', async () => {
    process.env.NODE_ENV = 'production';

    vi.mocked(fs.existsSync).mockReturnValue(true);

    const app = Fastify({ logger: false });
    await app.register(devTelemetryPlugin);

    app.get('/test-error', async () => {
      throw new Error('Prod test exception');
    });

    const response = await app.inject({
      method: 'GET',
      url: '/test-error',
    });

    await app.close();

    // Fastify default error response since plugin should return early and not override
    expect(response.statusCode).toBe(500);

    // File system should NEVER have been accessed/written to
    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });
});
