import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import api from './client';
import type { InternalAxiosRequestConfig } from 'axios';

describe('Axios API Client (ARCHON CORE)', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    vi.clearAllMocks();
    // Setup localStorage mock
    Storage.prototype.getItem = vi.fn();
    Storage.prototype.removeItem = vi.fn();

    // Mock window.location
    delete (window as any).location;
    window.location = { ...originalLocation, href: '' } as any;
  });

  afterEach(() => {
    window.location = originalLocation;
  });

  it('should add Authorization header if token exists in localStorage', async () => {
    (localStorage.getItem as any).mockReturnValue('mocked-token');

    // Manually trigger request interceptor
    const config: InternalAxiosRequestConfig = { headers: {} as any } as any;
    const requestInterceptor = (api.interceptors.request as any).handlers[0].fulfilled;
    const result = await requestInterceptor(config);

    expect(localStorage.getItem).toHaveBeenCalledWith('auth_token');
    expect(result.headers.Authorization).toBe('Bearer mocked-token');
  });

  it('should not add Authorization header if no token', async () => {
    (localStorage.getItem as any).mockReturnValue(null);

    const config: InternalAxiosRequestConfig = { headers: {} as any } as any;
    const requestInterceptor = (api.interceptors.request as any).handlers[0].fulfilled;
    const result = await requestInterceptor(config);

    expect(result.headers.Authorization).toBeUndefined();
  });

  it('should remove token and redirect to login on 401 response error', async () => {
    const errorWith401 = { response: { status: 401 } };

    const responseInterceptorError = (api.interceptors.response as any).handlers[0].rejected;

    await expect(responseInterceptorError(errorWith401)).rejects.toEqual(errorWith401);

    expect(localStorage.removeItem).toHaveBeenCalledWith('auth_token');
    expect(window.location.href).toBe('/login');
  });

  it('should just reject if error is not 401', async () => {
    const errorWith500 = { response: { status: 500 } };

    const responseInterceptorError = (api.interceptors.response as any).handlers[0].rejected;

    await expect(responseInterceptorError(errorWith500)).rejects.toEqual(errorWith500);

    expect(localStorage.removeItem).not.toHaveBeenCalled();
    expect(window.location.href).not.toBe('/login');
  });
});
