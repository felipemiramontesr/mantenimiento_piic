import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { InternalAxiosRequestConfig } from 'axios';
import api from './client';
import { redirectUserToLogin } from './navigation';

// 🔱 Mock the Navigation Bridge to prevent JSDOM proxy context crashes
vi.mock('./navigation', () => ({
  redirectUserToLogin: vi.fn(),
}));

describe('Axios API Client (ARCHON CORE)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Storage.prototype.getItem = vi.fn();
    Storage.prototype.removeItem = vi.fn();
  });

  it('should add Authorization header if token exists in localStorage', async () => {
    vi.mocked(localStorage.getItem).mockReturnValue('mocked-token');

    const config = { headers: {} } as unknown as InternalAxiosRequestConfig;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const requestInterceptor = (api.interceptors.request as any).handlers[0].fulfilled;
    const result = await requestInterceptor(config);

    expect(localStorage.getItem).toHaveBeenCalledWith('auth_token');
    expect(result.headers.Authorization).toBe('Bearer mocked-token');
  });

  it('should not add Authorization header if no token', async () => {
    vi.mocked(localStorage.getItem).mockReturnValue(null);

    const config = { headers: {} } as unknown as InternalAxiosRequestConfig;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const requestInterceptor = (api.interceptors.request as any).handlers[0].fulfilled;
    const result = await requestInterceptor(config);

    expect(result.headers.Authorization).toBeUndefined();
  });

  it('should remove token and redirect to login on 401 response error', async () => {
    const errorWith401 = { response: { status: 401 } };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const responseInterceptorError = (api.interceptors.response as any).handlers[0].rejected;

    await expect(responseInterceptorError(errorWith401)).rejects.toEqual(errorWith401);

    expect(localStorage.removeItem).toHaveBeenCalledWith('auth_token');
    expect(redirectUserToLogin).toHaveBeenCalled();
  });

  it('should just reject if error is not 401', async () => {
    const errorWith500 = { response: { status: 500 } };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const responseInterceptorError = (api.interceptors.response as any).handlers[0].rejected;

    await expect(responseInterceptorError(errorWith500)).rejects.toEqual(errorWith500);

    expect(localStorage.removeItem).not.toHaveBeenCalled();
    expect(redirectUserToLogin).not.toHaveBeenCalled();
  });
});
