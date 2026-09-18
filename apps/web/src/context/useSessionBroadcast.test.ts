import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import useSessionBroadcast, { SESSION_CHANNEL_NAME } from './useSessionBroadcast';

/** FC184 F1 — usa instancias REALES de `BroadcastChannel` (disponible nativamente en el runtime
 *  de Node que corre estos tests) para simular otras pestañas del mismo origen, en vez de un mock
 *  — verifica el comportamiento real del canal, incluido que nunca se auto-entrega un mensaje. */
describe('useSessionBroadcast', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('emite un mensaje que otra pestaña (otra instancia del canal) recibe', async () => {
    const { result } = renderHook(() => useSessionBroadcast(vi.fn()));
    const otherTab = new BroadcastChannel(SESSION_CHANNEL_NAME);
    const received = new Promise<void>((resolve) => {
      otherTab.onmessage = (event): void => {
        expect(event.data).toEqual({ type: 'LOGIN' });
        resolve();
      };
    });

    act(() => {
      result.current('LOGIN');
    });

    await received;
    otherTab.close();
  });

  it('invoca onMessage cuando otra pestaña emite un evento', async () => {
    const onMessage = vi.fn();
    renderHook(() => useSessionBroadcast(onMessage));
    const otherTab = new BroadcastChannel(SESSION_CHANNEL_NAME);

    otherTab.postMessage({ type: 'LOGOUT' });
    await vi.waitFor(() => expect(onMessage).toHaveBeenCalledWith('LOGOUT'));
    otherTab.close();
  });

  it('nunca recibe su propio mensaje (comportamiento nativo de BroadcastChannel)', async () => {
    const onMessage = vi.fn();
    const { result } = renderHook(() => useSessionBroadcast(onMessage));

    act(() => {
      result.current('LOGIN');
    });
    await new Promise((resolve) => {
      setTimeout(resolve, 30);
    });
    expect(onMessage).not.toHaveBeenCalled();
  });

  it('deja de escuchar tras desmontar (cierra el canal)', async () => {
    const onMessage = vi.fn();
    const { unmount } = renderHook(() => useSessionBroadcast(onMessage));
    unmount();
    const otherTab = new BroadcastChannel(SESSION_CHANNEL_NAME);

    otherTab.postMessage({ type: 'LOGOUT' });
    await new Promise((resolve) => {
      setTimeout(resolve, 30);
    });
    expect(onMessage).not.toHaveBeenCalled();
    otherTab.close();
  });

  it('degrada con elegancia si BroadcastChannel no existe en el entorno', () => {
    const original = globalThis.BroadcastChannel;
    // @ts-expect-error — simula un entorno sin soporte de BroadcastChannel (scope FC184 F1)
    delete globalThis.BroadcastChannel;

    const { result } = renderHook(() => useSessionBroadcast(vi.fn()));
    expect(() => result.current('LOGIN')).not.toThrow();

    globalThis.BroadcastChannel = original;
  });
});
