import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { InternalAxiosRequestConfig } from 'axios';
import api from './client';
import { redirectUserToLogin } from './navigation';

import { getToken, clearToken } from './tokenStore';

// 🔱 Mock the Navigation Bridge to prevent JSDOM proxy context crashes
vi.mock('./navigation', () => ({
  redirectUserToLogin: vi.fn(),
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
});
