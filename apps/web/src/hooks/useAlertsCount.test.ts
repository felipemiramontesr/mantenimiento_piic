import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from '@testing-library/react';
import { renderHook } from '../test/testUtils';
import useAlertsCount from './useAlertsCount';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

vi.mock('../api/client', () => ({
  default: { get: vi.fn() },
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  AuthProvider: ({ children }: { children: any }): any => children,
}));

// Flush the microtask queue inside act so React processes state updates
const flushAsync = async (): Promise<void> => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
};

describe('useAlertsCount', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      getSessionEpoch: (): number => 0,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns count from API on mount', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, count: 7 } });
    const { result } = renderHook(() => useAlertsCount());
    await flushAsync();
    expect(result.current.count).toBe(7);
  });

  it('returns 0 and isLoading false when API errors (fail silently)', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => useAlertsCount());
    await flushAsync();
    expect(result.current.count).toBe(0);
    expect(result.current.isLoading).toBe(false);
  });

  it('starts with isLoading true, false after fetch completes', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, count: 3 } });
    const { result } = renderHook(() => useAlertsCount());
    expect(result.current.isLoading).toBe(true);
    await flushAsync();
    expect(result.current.isLoading).toBe(false);
  });

  it('polls every 60 seconds and updates count', async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce({ data: { success: true, count: 1 } })
      .mockResolvedValueOnce({ data: { success: true, count: 5 } });
    const { result } = renderHook(() => useAlertsCount());
    await flushAsync();
    expect(result.current.count).toBe(1);
    await act(async () => {
      vi.advanceTimersByTime(60_000);
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(result.current.count).toBe(5);
    expect(vi.mocked(api.get)).toHaveBeenCalledTimes(2);
  });

  it('calls /alerts/count endpoint', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, count: 0 } });
    renderHook(() => useAlertsCount());
    await flushAsync();
    expect(vi.mocked(api.get)).toHaveBeenCalledWith('/alerts/count');
  });

  it('discards a stale response when the session epoch changes mid-flight (I10)', async () => {
    let epoch = 0;
    vi.mocked(useAuth).mockReturnValue({
      getSessionEpoch: (): number => epoch,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    // getAlertsCount resolves only after the epoch has already moved on —
    // simulates a logout/login landing before the in-flight request settles.
    vi.mocked(api.get).mockImplementation(async () => {
      epoch += 1;
      return { data: { success: true, count: 9 } };
    });

    const { result } = renderHook(() => useAlertsCount());
    await flushAsync();

    expect(result.current.count).toBe(0);
    expect(result.current.isLoading).toBe(true);
  });
});
