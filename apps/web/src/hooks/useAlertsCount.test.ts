import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from '@testing-library/react';
import { renderHook } from '../test/testUtils';
import useAlertsCount from './useAlertsCount';
import api from '../api/client';

vi.mock('../api/client', () => ({
  default: { get: vi.fn() },
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
    vi.mocked(api.get).mockResolvedValue({ data: { count: 3 } });
    const { result } = renderHook(() => useAlertsCount());
    expect(result.current.isLoading).toBe(true);
    await flushAsync();
    expect(result.current.isLoading).toBe(false);
  });

  it('polls every 60 seconds and updates count', async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce({ data: { count: 1 } })
      .mockResolvedValueOnce({ data: { count: 5 } });
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
    vi.mocked(api.get).mockResolvedValue({ data: { count: 0 } });
    renderHook(() => useAlertsCount());
    await flushAsync();
    expect(vi.mocked(api.get)).toHaveBeenCalledWith('/alerts/count');
  });
});
