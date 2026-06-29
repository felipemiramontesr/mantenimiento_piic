import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify from 'fastify';
import * as fs from 'fs';
import devTelemetryPlugin from './devTelemetry';

vi.mock('fs', async (importOriginal) => {
  const original = await importOriginal<typeof import('fs')>();
  return {
    ...original,
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
  };
});

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
    expect(fileWritten).toContain('HANDOFF_CC_TO_AG.md');
    expect(contentWritten).toContain('**Archon → CC/AG**');
    expect(contentWritten).toContain('API_RUNTIME_ERROR');
    expect(contentWritten).toContain('Test unhandled API exception');
  });

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
