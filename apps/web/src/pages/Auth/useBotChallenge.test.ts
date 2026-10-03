import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import useBotChallenge, { REFRESH_AFTER_MS, SUBMIT_FLOOR_MS } from './useBotChallenge';
import { obtainBotChallengePayload } from '../../api/botChallenge';

/**
 * FC199 F3 — reto resuelto en segundo plano, de un solo uso. FC203 F2 (A3-DEF1 · Invariante 3) —
 * renovación preventiva cada 3 min y nunca se entrega un reto más joven que el piso de la API.
 */

vi.mock('../../api/botChallenge', () => ({ obtainBotChallengePayload: vi.fn() }));

const mockObtain = obtainBotChallengePayload as ReturnType<typeof vi.fn>;

/** `take()` con el reloj simulado: avanza lo necesario para que resuelva la espera del piso. */
async function takeWithClock(
  take: () => Promise<string>
): Promise<{ payload: string; waitedMs: number }> {
  const start = Date.now();
  const pending = take();
  await vi.advanceTimersByTimeAsync(SUBMIT_FLOOR_MS);
  const payload = await pending;
  return { payload, waitedMs: Date.now() - start };
}

beforeEach(() => {
  vi.useFakeTimers();
  let n = 0;
  mockObtain.mockReset();
  mockObtain.mockImplementation(async () => {
    n += 1;
    return `payload-${n}`;
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useBotChallenge', () => {
  it('empieza a resolver al montar: take() entrega ese payload y deja el siguiente en curso', async () => {
    const { result } = renderHook(() => useBotChallenge());
    expect(mockObtain).toHaveBeenCalledTimes(1);

    expect((await takeWithClock(result.current.take)).payload).toBe('payload-1');
    expect(mockObtain).toHaveBeenCalledTimes(2);
    expect((await takeWithClock(result.current.take)).payload).toBe('payload-2');
  });

  it('Invariante 3 · un reto recién emitido se entrega solo tras cumplir el piso', async () => {
    const { result } = renderHook(() => useBotChallenge());
    let delivered = false;
    const pending = result.current.take().then((p) => {
      delivered = true;
      return p;
    });

    await vi.advanceTimersByTimeAsync(SUBMIT_FLOOR_MS - 1);
    expect(delivered).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(await pending).toBe('payload-1');
  });

  it('un reto con antigüedad de sobra se entrega sin esperar', async () => {
    const { result } = renderHook(() => useBotChallenge());
    await vi.advanceTimersByTimeAsync(60 * 1000);

    const start = Date.now();
    expect(await result.current.take()).toBe('payload-1');
    expect(Date.now() - start).toBe(0);
  });

  it('Scenario 3 · el reto de fondo se renueva cada 3 min, así que tras 4.5 min hay uno vigente y maduro', async () => {
    const { result } = renderHook(() => useBotChallenge());
    await vi.advanceTimersByTimeAsync(REFRESH_AFTER_MS);
    expect(mockObtain).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(90 * 1000);

    const start = Date.now();
    expect(await result.current.take()).toBe('payload-2');
    expect(Date.now() - start).toBe(0);
  });

  it('si el reto en curso es más viejo que el umbral, pide uno nuevo y respeta el piso', async () => {
    const { result } = renderHook(() => useBotChallenge());
    vi.setSystemTime(Date.now() + REFRESH_AFTER_MS + 1);

    const { payload, waitedMs } = await takeWithClock(result.current.take);
    expect(payload).toBe('payload-2');
    expect(waitedMs).toBeGreaterThanOrEqual(SUBMIT_FLOOR_MS);
  });

  it('si el reto de segundo plano falló, take() pide otro y también respeta el piso', async () => {
    mockObtain.mockRejectedValueOnce(new Error('red'));
    const { result } = renderHook(() => useBotChallenge());

    const { payload, waitedMs } = await takeWithClock(result.current.take);
    expect(payload).toBe('payload-2');
    expect(waitedMs).toBeGreaterThanOrEqual(SUBMIT_FLOOR_MS);
  });

  it('al desmontar se detiene la renovación de fondo', async () => {
    const { unmount } = renderHook(() => useBotChallenge());
    unmount();
    await vi.advanceTimersByTimeAsync(REFRESH_AFTER_MS * 2);

    expect(mockObtain).toHaveBeenCalledTimes(1);
  });
});
