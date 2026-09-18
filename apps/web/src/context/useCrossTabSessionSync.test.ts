import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import useCrossTabSessionSync from './useCrossTabSessionSync';
import { SESSION_CHANNEL_NAME } from './useSessionBroadcast';
import api from '../api/client';
import { clearToken, setToken } from '../api/tokenStore';

vi.mock('../api/client', () => ({ default: { post: vi.fn() } }));
vi.mock('../api/tokenStore', () => ({
  setToken: vi.fn(),
  clearToken: vi.fn(),
  getToken: vi.fn(() => null),
}));

const mockedApi = api as { post: ReturnType<typeof vi.fn> };
const stubUser = { id: 1, username: 'grayman' } as never;

/** FC184 F1 — verifica que un evento LOGOUT/LOGIN recibido de OTRA pestaña real (via
 *  `BroadcastChannel`) produce exactamente el efecto descrito en el FC (Scenario 1) e integra el
 *  epoch guard de FC070 (Cond.R-184 R2), sin re-implementar `useSessionBroadcast` con un mock. */
describe('useCrossTabSessionSync', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, href: '' },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
  });

  function renderSync(): {
    sessionEpochRef: React.MutableRefObject<number>;
    bumpEpoch: ReturnType<typeof vi.fn>;
    setCurrentUser: ReturnType<typeof vi.fn>;
    setIsAuthenticated: ReturnType<typeof vi.fn>;
    broadcast: (type: 'LOGIN' | 'LOGOUT') => void;
  } {
    const sessionEpochRef = { current: 0 };
    const bumpEpoch = vi.fn(() => {
      sessionEpochRef.current += 1;
    });
    const setCurrentUser = vi.fn();
    const setIsAuthenticated = vi.fn();
    const { result } = renderHook(() =>
      useCrossTabSessionSync(sessionEpochRef, bumpEpoch, setCurrentUser, setIsAuthenticated)
    );
    return {
      sessionEpochRef,
      bumpEpoch,
      setCurrentUser,
      setIsAuthenticated,
      broadcast: result.current,
    };
  }

  it('LOGOUT remoto: limpia token/usuario, marca no autenticado y redirige — sin llamar a /auth/logout', async () => {
    const { setCurrentUser, setIsAuthenticated, bumpEpoch } = renderSync();
    const otherTab = new BroadcastChannel(SESSION_CHANNEL_NAME);

    act(() => {
      otherTab.postMessage({ type: 'LOGOUT' });
    });
    await vi.waitFor(() => expect(setIsAuthenticated).toHaveBeenCalledWith(false));

    expect(bumpEpoch).toHaveBeenCalledTimes(1);
    expect(clearToken).toHaveBeenCalledTimes(1);
    expect(setCurrentUser).toHaveBeenCalledWith(null);
    expect(window.location.href).toBe('/login');
    expect(mockedApi.post).not.toHaveBeenCalledWith('/auth/logout');
    otherTab.close();
  });

  it('LOGIN remoto: re-deriva el usuario vía /auth/refresh (mismo guard de epoch que el montaje)', async () => {
    mockedApi.post.mockResolvedValueOnce({
      data: { success: true, token: 'tok-from-other-tab', user: stubUser },
    });
    const { setCurrentUser, setIsAuthenticated, bumpEpoch } = renderSync();
    const otherTab = new BroadcastChannel(SESSION_CHANNEL_NAME);

    act(() => {
      otherTab.postMessage({ type: 'LOGIN' });
    });
    await vi.waitFor(() => expect(setIsAuthenticated).toHaveBeenCalledWith(true));

    expect(bumpEpoch).toHaveBeenCalledTimes(1);
    expect(mockedApi.post).toHaveBeenCalledWith('/auth/refresh');
    expect(setToken).toHaveBeenCalledWith('tok-from-other-tab');
    expect(setCurrentUser).toHaveBeenCalledWith(stubUser);
    otherTab.close();
  });

  it('LOGIN remoto stale: una acción local más reciente (epoch avanzado) descarta el refresh tardío', async () => {
    const deferred: { resolve?: (v: unknown) => void } = {};
    mockedApi.post.mockReturnValueOnce(
      new Promise((resolve) => {
        deferred.resolve = resolve;
      })
    );
    const { sessionEpochRef, setCurrentUser, setIsAuthenticated } = renderSync();
    const otherTab = new BroadcastChannel(SESSION_CHANNEL_NAME);

    act(() => {
      otherTab.postMessage({ type: 'LOGIN' });
    });
    await vi.waitFor(() => expect(mockedApi.post).toHaveBeenCalledWith('/auth/refresh'));

    // Una acción local (p. ej. un logout manual) avanza el epoch mientras el refresh sigue en vuelo.
    sessionEpochRef.current += 1;
    deferred.resolve?.({ data: { success: true, token: 'stale-tok', user: stubUser } });
    await new Promise((resolve) => {
      setTimeout(resolve, 20);
    });

    expect(setIsAuthenticated).not.toHaveBeenCalledWith(true);
    expect(setCurrentUser).not.toHaveBeenCalledWith(stubUser);
    otherTab.close();
  });

  it('broadcast() emitido localmente es recibido por otra pestaña real', async () => {
    const { broadcast } = renderSync();
    const otherTab = new BroadcastChannel(SESSION_CHANNEL_NAME);
    const received = new Promise<void>((resolve) => {
      otherTab.onmessage = (event): void => {
        expect(event.data).toEqual({ type: 'LOGOUT' });
        resolve();
      };
    });

    act(() => {
      broadcast('LOGOUT');
    });

    await received;
    otherTab.close();
  });
});
