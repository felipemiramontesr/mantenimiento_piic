import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext';

const wrapper = ({ children }: { children: React.ReactNode }): React.JSX.Element => (
  <AuthProvider>{children}</AuthProvider>
);

const flushEffects = (): Promise<void> => act(() => Promise.resolve());

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes as unauthenticated when localStorage is empty', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.currentUser).toBeNull();
  });

  it('initializes as authenticated when auth_token is in localStorage', () => {
    localStorage.setItem('auth_token', 'tok-abc');
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('login stores token, sets user, and marks authenticated', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    const user = { id: '1', username: 'grayman' } as never;
    await act(async () => {
      result.current.login('tok-xyz', user);
    });
    expect(localStorage.getItem('auth_token')).toBe('tok-xyz');
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.currentUser).toMatchObject({ username: 'grayman' });
  });

  it('logout clears storage and marks unauthenticated', async () => {
    localStorage.setItem('auth_token', 'tok-abc');
    localStorage.setItem('user_data', JSON.stringify({ username: 'grayman' }));
    const { result } = renderHook(() => useAuth(), { wrapper });
    await flushEffects();
    const errSpy = vi.spyOn(console, 'error').mockImplementation((): void => undefined);
    await act(async () => {
      result.current.logout();
    });
    errSpy.mockRestore();
    expect(localStorage.getItem('auth_token')).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('restores currentUser from valid user_data in localStorage', async () => {
    const stored = { username: 'grayman', id: '1' };
    localStorage.setItem('user_data', JSON.stringify(stored));
    const { result } = renderHook(() => useAuth(), { wrapper });
    await flushEffects();
    expect(result.current.currentUser).toMatchObject({ username: 'grayman' });
  });

  it('calls logout (clears storage) when user_data is missing username', async () => {
    localStorage.setItem('user_data', JSON.stringify({ id: '99' }));
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation((): void => undefined);
    renderHook(() => useAuth(), { wrapper });
    await flushEffects();
    expect(warnSpy).toHaveBeenCalled();
    expect(localStorage.getItem('user_data')).toBeNull();
    warnSpy.mockRestore();
  });

  it('calls logout when user_data is corrupt JSON', async () => {
    localStorage.setItem('user_data', '{ NOT VALID JSON !!!');
    localStorage.setItem('auth_token', 'tok-abc');
    renderHook(() => useAuth(), { wrapper });
    await flushEffects();
    expect(localStorage.getItem('auth_token')).toBeNull();
  });

  it('updateCurrentUser merges data and persists to localStorage', async () => {
    const stored = { username: 'grayman', id: '1', email: 'old@piic.com' };
    localStorage.setItem('user_data', JSON.stringify(stored));
    const { result } = renderHook(() => useAuth(), { wrapper });
    await flushEffects();
    await act(async () => {
      result.current.updateCurrentUser({ email: 'new@piic.com' });
    });
    const saved = JSON.parse(localStorage.getItem('user_data') ?? '{}');
    expect(saved.email).toBe('new@piic.com');
  });

  it('updateCurrentUser is a no-op when currentUser is null', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {
      result.current.updateCurrentUser({ email: 'any@piic.com' });
    });
    expect(result.current.currentUser).toBeNull();
  });

  it('useAuth throws when used outside AuthProvider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation((): void => undefined);
    expect(() => renderHook(() => useAuth())).toThrow(
      'useAuth must be used within an AuthProvider'
    );
    consoleError.mockRestore();
  });
});
