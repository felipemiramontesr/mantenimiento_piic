import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { InternalAxiosRequestConfig } from 'axios';
import api, {
  computeHostname,
  computeDefaultURL,
  logGatewayStartupIfNeeded,
  readProcessSignal,
} from './client';
import redirectUserToLogin from './navigation';

import { getToken, clearToken } from './tokenStore';

// 🔱 Mock the Navigation Bridge to prevent JSDOM proxy context crashes
vi.mock('./navigation', () => ({
  default: vi.fn(),
}));

// 🔱 Mock tokenStore — client now reads from in-memory store, not localStorage
vi.mock('./tokenStore', () => ({
  getToken: vi.fn(),
  clearToken: vi.fn(),
  setToken: vi.fn(),
}));

describe('Axios API Client (ARCHON CORE)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should add Authorization header if token exists in memory store', async () => {
    vi.mocked(getToken).mockReturnValue('mocked-token');

    const config = { headers: {} } as unknown as InternalAxiosRequestConfig;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const requestInterceptor = (api.interceptors.request as any).handlers[0].fulfilled;
    const result = await requestInterceptor(config);

    expect(getToken).toHaveBeenCalled();
    expect(result.headers.Authorization).toBe('Bearer mocked-token');
  });

  it('should not add Authorization header if no token', async () => {
    vi.mocked(getToken).mockReturnValue(null);

    const config = { headers: {} } as unknown as InternalAxiosRequestConfig;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const requestInterceptor = (api.interceptors.request as any).handlers[0].fulfilled;
    const result = await requestInterceptor(config);

    expect(result.headers.Authorization).toBeUndefined();
  });

  it('should call clearToken and redirect to login on 401 response error', async () => {
    vi.mocked(getToken).mockReturnValue('some-token');
    const errorWith401 = { response: { status: 401 } };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const responseInterceptorError = (api.interceptors.response as any).handlers[0].rejected;

    await expect(responseInterceptorError(errorWith401)).rejects.toEqual(errorWith401);

    expect(clearToken).toHaveBeenCalled();
    expect(redirectUserToLogin).toHaveBeenCalled();
  });

  it('should just reject if error is not 401', async () => {
    const errorWith500 = { response: { status: 500 } };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const responseInterceptorError = (api.interceptors.response as any).handlers[0].rejected;

    await expect(responseInterceptorError(errorWith500)).rejects.toEqual(errorWith500);

    expect(clearToken).not.toHaveBeenCalled();
    expect(redirectUserToLogin).not.toHaveBeenCalled();
  });

  it('should not redirect on 401 from /auth/login', async () => {
    vi.mocked(getToken).mockReturnValue('some-token');
    const error = { response: { status: 401 }, config: { url: '/auth/login' } };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const responseInterceptorError = (api.interceptors.response as any).handlers[0].rejected;
    await expect(responseInterceptorError(error)).rejects.toEqual(error);

    expect(clearToken).not.toHaveBeenCalled();
    expect(redirectUserToLogin).not.toHaveBeenCalled();
  });

  // ── R4-C Fc165 F2 Slice 2.3C Batch 1 — unc line 57 (fulfilled interceptor _startTime guard) ──
  it('does not update lastLatency when the response config has no _startTime (fulfilled interceptor)', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const responseInterceptorSuccess = (api.interceptors.response as any).handlers[0].fulfilled;
    const fakeResponse = { status: 200, config: {} };

    const result = responseInterceptorSuccess(fakeResponse);

    expect(result).toBe(fakeResponse);
  });

  it('should not redirect on 401 from /auth/refresh', async () => {
    vi.mocked(getToken).mockReturnValue('some-token');
    const error = { response: { status: 401 }, config: { url: '/auth/refresh' } };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const responseInterceptorError = (api.interceptors.response as any).handlers[0].rejected;
    await expect(responseInterceptorError(error)).rejects.toEqual(error);

    expect(clearToken).not.toHaveBeenCalled();
    expect(redirectUserToLogin).not.toHaveBeenCalled();
  });

  // 🛡️ Zero-Noise Test Shield — this console statement is gated behind `!isTest`
  // and only runs outside Vitest. It still executes for real users in
  // production, so we force the non-test path to genuinely exercise it. The
  // sibling module-load-time log (line 30, "Active Gateway") is NOT forced
  // here: doing so via vi.resetModules() + dynamic re-import destabilized v8's
  // coverage attribution for the rest of this file (lines 51-57/63/67 flipped
  // to "uncovered" in isolation, confirmed by reverting and re-measuring) —
  // documented as a residual rather than risking a flaky suite.
  describe('Zero-Noise Test Shield (forced non-test path)', () => {
    const originalVitest = process.env.VITEST;
    const originalNodeEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.VITEST = originalVitest;
      process.env.NODE_ENV = originalNodeEnv;
    });

    it('logs the Security Breach message on 401 redirect outside the test env', async () => {
      vi.mocked(getToken).mockReturnValue('some-token');
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const error = {
        response: { status: 401 },
        config: { url: '/dashboard/fleet', method: 'get' },
      };

      delete process.env.VITEST;
      process.env.NODE_ENV = 'production';

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const responseInterceptorError = (api.interceptors.response as any).handlers[0].rejected;
        await expect(responseInterceptorError(error)).rejects.toEqual(error);
      } finally {
        process.env.VITEST = originalVitest;
        process.env.NODE_ENV = originalNodeEnv;
      }

      expect(errorSpy).toHaveBeenCalledWith(
        '🔱 [Archon Centinel] Security Breach (401). Redirecting to Login.',
        expect.objectContaining({ url: '/dashboard/fleet' })
      );
      expect(clearToken).toHaveBeenCalled();
      expect(redirectUserToLogin).toHaveBeenCalled();
      errorSpy.mockRestore();
    });
  });

  // FC165 F3 Slice3.3 Lote C — createApiClient config helpers, testeados
  // directamente (sin red real, sin vi.resetModules()).
  describe('computeHostname / computeDefaultURL / logGatewayStartupIfNeeded (config puros)', () => {
    it('computeHostname usa window.location.hostname cuando window existe', () => {
      expect(computeHostname(window)).toBe(window.location.hostname);
    });

    it('computeHostname cae a "localhost" cuando window es undefined (SSR hipotético)', () => {
      expect(computeHostname(undefined)).toBe('localhost');
    });

    it('computeDefaultURL retorna la URL de producción cuando isProd=true', () => {
      expect(computeDefaultURL(true, 'ignored')).toBe('https://apiv1.piic.com.mx/v1');
    });

    it('computeDefaultURL retorna la URL local con el hostname cuando isProd=false', () => {
      expect(computeDefaultURL(false, 'dev.local')).toBe('http://dev.local:3001/v1');
    });

    it('readProcessSignal reporta hasProcess=true bajo el runtime real de Vitest', () => {
      expect(readProcessSignal()).toEqual({
        hasProcess: true,
        nodeEnv: process.env.NODE_ENV,
        isVitest: !!process.env.VITEST,
      });
    });

    it('readProcessSignal reporta hasProcess=false cuando `process` no existe (navegador de producción)', () => {
      const original = globalThis.process;
      // @ts-expect-error -- simula un runtime de navegador sin el global `process` de Node
      delete globalThis.process;
      try {
        expect(readProcessSignal()).toEqual({
          hasProcess: false,
          nodeEnv: undefined,
          isVitest: false,
        });
      } finally {
        globalThis.process = original;
      }
    });

    it('logGatewayStartupIfNeeded loguea cuando hasProcess=false (navegador de producción real)', () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
      logGatewayStartupIfNeeded(false, undefined, false, 'https://example.test/v1');
      expect(logSpy).toHaveBeenCalledWith(
        '🚀 [Archon API Client V2] Active Gateway:',
        'https://example.test/v1'
      );
      logSpy.mockRestore();
    });

    it('logGatewayStartupIfNeeded loguea cuando hasProcess=true pero NODE_ENV no es "test" ni VITEST', () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
      logGatewayStartupIfNeeded(true, 'production', false, 'https://example.test/v1');
      expect(logSpy).toHaveBeenCalled();
      logSpy.mockRestore();
    });

    it('logGatewayStartupIfNeeded NO loguea bajo un run de Vitest real (NODE_ENV=test)', () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
      logGatewayStartupIfNeeded(true, 'test', false, 'https://example.test/v1');
      expect(logSpy).not.toHaveBeenCalled();
      logSpy.mockRestore();
    });

    it('logGatewayStartupIfNeeded NO loguea cuando isVitest=true aunque NODE_ENV no sea "test"', () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
      logGatewayStartupIfNeeded(true, 'development', true, 'https://example.test/v1');
      expect(logSpy).not.toHaveBeenCalled();
      logSpy.mockRestore();
    });
  });
});
