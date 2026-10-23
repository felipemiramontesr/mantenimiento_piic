import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { fetchOwnActorCard } from '../pages/Social/arcsialCoreApi';
import useOwnDisplayName, { DISPLAY_NAME_FALLBACK } from './useOwnDisplayName';

/**
 * FC212 F2 (T3) — nombre visible del actor USER para la cabecera del menú: «Archonauta» sin sesión,
 * mientras carga, sin actor, con nombre vacío o con error; nunca el correo.
 */

vi.mock('../pages/Social/arcsialCoreApi', () => ({ fetchOwnActorCard: vi.fn() }));

const CARD = { handle: 'ana', displayName: 'Ana Visible', avatarUrl: null };

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useOwnDisplayName', () => {
  it('sin sesión no consulta y muestra el respaldo', () => {
    const { result } = renderHook(() => useOwnDisplayName(undefined));
    expect(result.current).toBe(DISPLAY_NAME_FALLBACK);
    expect(fetchOwnActorCard).not.toHaveBeenCalled();
  });

  it('muestra «Archonauta» mientras carga y luego el nombre visible', async () => {
    vi.mocked(fetchOwnActorCard).mockResolvedValue(CARD);
    const { result } = renderHook(() => useOwnDisplayName('7'));
    expect(result.current).toBe('Archonauta');
    await waitFor(() => expect(result.current).toBe('Ana Visible'));
  });

  it('un nombre en blanco o un error dejan el respaldo', async () => {
    vi.mocked(fetchOwnActorCard).mockResolvedValueOnce({ ...CARD, displayName: '   ' });
    const blank = renderHook(() => useOwnDisplayName('7'));
    await waitFor(() => expect(fetchOwnActorCard).toHaveBeenCalledTimes(1));
    expect(blank.result.current).toBe('Archonauta');
    vi.mocked(fetchOwnActorCard).mockRejectedValueOnce(new Error('404'));
    const failed = renderHook(() => useOwnDisplayName('8'));
    await waitFor(() => expect(fetchOwnActorCard).toHaveBeenCalledTimes(2));
    expect(failed.result.current).toBe('Archonauta');
  });

  it('una respuesta que llega después de desmontar no se aplica', async () => {
    let answer: ((card: typeof CARD) => void) | undefined;
    vi.mocked(fetchOwnActorCard).mockReturnValue(
      new Promise((resolve) => {
        answer = resolve;
      })
    );
    const { result, unmount } = renderHook(() => useOwnDisplayName('7'));
    unmount();
    answer?.(CARD);
    await Promise.resolve();
    expect(result.current).toBe('Archonauta');
  });

  it('al cambiar de sesión vuelve al respaldo y consulta otra vez', async () => {
    vi.mocked(fetchOwnActorCard).mockResolvedValue(CARD);
    const { result, rerender } = renderHook(({ id }) => useOwnDisplayName(id), {
      initialProps: { id: '7' as string | undefined },
    });
    await waitFor(() => expect(result.current).toBe('Ana Visible'));
    rerender({ id: undefined });
    expect(result.current).toBe('Archonauta');
  });
});
