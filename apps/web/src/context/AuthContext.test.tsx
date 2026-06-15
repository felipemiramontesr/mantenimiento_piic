import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext';
import api from '../api/client';
import { setToken, clearToken } from '../api/tokenStore';

// Mock api client
vi.mock('../api/client', () => ({
  default: {
    post: vi.fn(),
  },
}));

// Mock tokenStore
vi.mock('../api/tokenStore', () => ({
  setToken: vi.fn(),
  clearToken: vi.fn(),
  getToken: vi.fn(() => null),
}));

const mockedApi = api as { post: ReturnType<typeof vi.fn> };
const mockedSetToken = setToken as ReturnType<typeof vi.fn>;
const mockedClearToken = clearToken as ReturnType<typeof vi.fn>;

const wrapper = ({ children }: { children: React.ReactNode }): React.JSX.Element => (
  <AuthProvider>{children}</AuthProvider>
);

const stubUser = { id: 1, username: 'grayman', roleId: 1, roleName: 'Admin' } as never;

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: refresh fails (no active session)
    mockedApi.post.mockImplementation((url: string) => {
      if (url === '/auth/refresh') return Promise.reject(new Error('No session'));
      return Promise.resolve({ data: { success: true } });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes with isLoading=true and isAuthenticated=false before refresh resolves', () => {
    // Never resolves during this synchronous check
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    mockedApi.post.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('after failed /auth/refresh, isLoading=false and isAuthenticated=false', async () => {
    mockedApi.post.mockRejectedValueOnce(new Error('No session'));
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isAuthenticated).toBe(false);
    expect(mockedClearToken).toHaveBeenCalled();
  });

  it('after successful /auth/refresh, isLoading=false and isAuthenticated=true', async () => {
    mockedApi.post.mockResolvedValueOnce({
      data: { success: true, token: 'tok-refreshed', user: stubUser },
    });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.currentUser).toMatchObject({ username: 'grayman' });
    expect(mockedSetToken).toHaveBeenCalledWith('tok-refreshed');
  });

  it('login calls setToken, sets user, and marks authenticated', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      result.current.login('tok-xyz', stubUser);
    });
    expect(mockedSetToken).toHaveBeenCalledWith('tok-xyz');
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.currentUser).toMatchObject({ username: 'grayman' });
    expect(result.current.ownerType).toBeNull();
  });

  it('logout calls /auth/logout, calls clearToken, marks unauthenticated', async () => {
    mockedApi.post
      .mockResolvedValueOnce({ data: { success: true, token: 'tok-r', user: stubUser } }) // refresh
      .mockResolvedValueOnce({ data: { success: true } }); // logout
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.logout();
    });
    expect(mockedApi.post).toHaveBeenCalledWith('/auth/logout');
    expect(mockedClearToken).toHaveBeenCalled();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('logout marks unauthenticated even if API call fails', async () => {
    mockedApi.post
      .mockResolvedValueOnce({ data: { success: true, token: 'tok-r', user: stubUser } })
      .mockRejectedValueOnce(new Error('Network error'));
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.logout();
    });
    expect(mockedClearToken).toHaveBeenCalled();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('updateCurrentUser merges data into currentUser', async () => {
    const userWithEmail = { ...stubUser, email: 'old@piic.com' } as never;
    mockedApi.post.mockResolvedValueOnce({
      data: { success: true, token: 'tok-r', user: userWithEmail },
    });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      result.current.updateCurrentUser({ email: 'new@piic.com' });
    });
    expect(result.current.currentUser).toMatchObject({ email: 'new@piic.com' });
  });

  it('updateCurrentUser is a no-op when currentUser is null', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      result.current.updateCurrentUser({ email: 'any@piic.com' });
    });
    expect(result.current.currentUser).toBeNull();
  });

  it('useAuth throws when used outside AuthProvider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(vi.fn());
    expect(() => renderHook(() => useAuth())).toThrow(
      'useAuth must be used within an AuthProvider'
    );
    consoleError.mockRestore();
  });

  // Impersonation
  it('startImpersonation sets effectiveUser and isImpersonating', async () => {
    mockedApi.post.mockResolvedValueOnce({
      data: { success: true, token: 'tok-r', user: stubUser },
    });
    const target = {
      id: 3,
      username: '[Operador]',
      roleId: 3,
      roleName: 'Operador',
    } as never;
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      result.current.startImpersonation(target);
    });
    expect(result.current.isImpersonating).toBe(true);
    expect(result.current.effectiveUser).toMatchObject({ username: '[Operador]' });
    expect(result.current.currentUser).toMatchObject({ username: 'grayman' });
  });

  it('stopImpersonation restores effectiveUser to currentUser', async () => {
    mockedApi.post.mockResolvedValueOnce({
      data: { success: true, token: 'tok-r', user: stubUser },
    });
    const target = {
      id: 3,
      username: '[Operador]',
      roleId: 3,
      roleName: 'Operador',
    } as never;
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      result.current.startImpersonation(target);
    });
    await act(async () => {
      result.current.stopImpersonation();
    });
    expect(result.current.isImpersonating).toBe(false);
    expect(result.current.effectiveUser).toMatchObject({ username: 'grayman' });
  });

  it('effectiveUser equals currentUser when not impersonating', async () => {
    mockedApi.post.mockResolvedValueOnce({
      data: { success: true, token: 'tok-r', user: stubUser },
    });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.effectiveUser).toMatchObject({ username: 'grayman' });
    expect(result.current.isImpersonating).toBe(false);
  });
});
