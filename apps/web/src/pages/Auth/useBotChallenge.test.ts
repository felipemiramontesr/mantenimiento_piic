import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import useBotChallenge from './useBotChallenge';
import { obtainBotChallengePayload } from '../../api/botChallenge';

/** FC199 F3 — reto resuelto en segundo plano, de un solo uso y renovado si ya casi vence. */

vi.mock('../../api/botChallenge', () => ({ obtainBotChallengePayload: vi.fn() }));

const mockObtain = obtainBotChallengePayload as ReturnType<typeof vi.fn>;

beforeEach(() => {
  let n = 0;
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

    expect(await result.current.take()).toBe('payload-1');
    expect(mockObtain).toHaveBeenCalledTimes(2);
    expect(await result.current.take()).toBe('payload-2');
  });

  it('si el reto en curso tiene más de 4 min, pide uno nuevo en vez de mandar uno vencido', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const { result } = renderHook(() => useBotChallenge());
    vi.setSystemTime(Date.now() + 4 * 60 * 1000 + 1);

    expect(await result.current.take()).toBe('payload-2');
  });

  it('si el reto de segundo plano falló, take() intenta de nuevo', async () => {
    mockObtain.mockRejectedValueOnce(new Error('red')).mockResolvedValue('payload-ok');
    const { result } = renderHook(() => useBotChallenge());

    expect(await result.current.take()).toBe('payload-ok');
  });
});
