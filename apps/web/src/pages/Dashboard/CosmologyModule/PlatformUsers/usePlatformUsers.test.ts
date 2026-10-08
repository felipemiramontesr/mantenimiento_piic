import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import api from '../../../../api/client';
import usePlatformUsers from './usePlatformUsers';
import { fetchPlatformUsers, PlatformUser } from './platformUsersApi';

/**
 * FC204 F4 — datos de la consola: respuestas incompletas del servidor y cargas que llegan después
 * de desmontar la tarjeta (no deben tocar el estado de un componente que ya no existe).
 */

vi.mock('../../../../api/client', () => ({
  default: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}));

const USER: PlatformUser = {
  id: 20,
  username: 'arc.user',
  fullName: 'Arc User',
  email: 'arc@piic.mx',
  isActive: true,
  roleId: 2,
  tenantId: 41,
  tenantName: 'Flota Norte',
  cosmonautType: 'ARC',
};

/** Una promesa que el test resuelve o rechaza cuando quiere. */
function deferred<T>(): {
  promise: Promise<T>;
  resolve: (v: T) => void;
  reject: (e: unknown) => void;
} {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('fetchPlatformUsers — respuestas incompletas', () => {
  it('sin cuerpo: lista vacía y total 0', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({});
    expect(await fetchPlatformUsers({ scope: '', search: '', page: 1 })).toEqual({
      users: [],
      total: 0,
    });
  });

  it('sin total: el total es el largo de la lista', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: { success: true, data: [USER] } });
    expect(await fetchPlatformUsers({ scope: 41, search: '  ', page: 2 })).toEqual({
      users: [USER],
      total: 1,
    });
    expect(api.get).toHaveBeenCalledWith('/cosmology/users', {
      params: { page: 2, pageSize: 25, tenantId: 41 },
    });
  });
});

describe('usePlatformUsers — carga después de desmontar', () => {
  it('una respuesta que llega tras desmontar no actualiza nada', async () => {
    const pending = deferred<unknown>();
    vi.mocked(api.get).mockReturnValueOnce(pending.promise as never);
    const { result, unmount } = renderHook(() => usePlatformUsers());
    expect(result.current.loading).toBe(true);
    unmount();
    await act(async () => {
      pending.resolve({ data: { success: true, data: [USER], total: 1 } });
      await pending.promise;
    });
    expect(result.current.users).toEqual([]);
    expect(result.current.loading).toBe(true);
  });

  it('un error que llega tras desmontar tampoco', async () => {
    const pending = deferred<unknown>();
    vi.mocked(api.get).mockReturnValueOnce(pending.promise as never);
    const { result, unmount } = renderHook(() => usePlatformUsers());
    unmount();
    await act(async () => {
      pending.reject(new Error('500'));
      await pending.promise.catch(() => undefined);
    });
    expect(result.current.error).toBe(false);
  });

  it('cambiar el filtro vuelve a la página 1', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, data: [USER], total: 60 } });
    const { result } = renderHook(() => usePlatformUsers());
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.setPage(3));
    await waitFor(() => expect(result.current.page).toBe(3));
    act(() => result.current.setScope('itinerant'));
    await waitFor(() => expect(result.current.page).toBe(1));
    expect(result.current.scope).toBe('itinerant');
    expect(result.current.pageCount).toBe(3);
  });
});
