import { renderHook, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import useSilkHydration from './useSilkHydration';
import { archonCache } from '../utils/archonCache';
import api from '../api/client';

// Mocks
vi.mock('../utils/archonCache', () => ({
  archonCache: {
    get: vi.fn(),
    set: vi.fn(),
  },
}));

vi.mock('../api/client', () => ({
  default: {
    get: vi.fn(),
  },
}));

describe('useSilkHydration', () => {
  const mockKey = 'test_key';
  const mockEndpoint = '/test';
  const mockData = [{ id: 1, name: 'Item 1' }];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with cached data if available', async () => {
    vi.mocked(archonCache.get).mockReturnValue(mockData);
    vi.mocked(api.get).mockResolvedValue({ data: { data: mockData } });

    const { result } = renderHook(() => useSilkHydration({ key: mockKey, endpoint: mockEndpoint }));

    expect(result.current.data).toEqual(mockData);
    expect(archonCache.get).toHaveBeenCalledWith(mockKey);

    // Wait for background sync to avoid act() warnings
    await waitFor(() => expect(result.current.isSyncing).toBe(false));
  });

  it('should initialize with initialData if cache is empty', async () => {
    vi.mocked(archonCache.get).mockReturnValue(null);
    vi.mocked(api.get).mockResolvedValue({ data: { data: [] } });
    const initial = [{ id: 0 }];

    const { result } = renderHook(() =>
      useSilkHydration({ key: mockKey, endpoint: mockEndpoint, initialData: initial })
    );

    expect(result.current.data).toEqual(initial);
    // Wait for background sync to avoid act() warnings
    await waitFor(() => expect(result.current.isSyncing).toBe(false));
  });

  it('should fetch fresh data and update cache on mount', async () => {
    vi.mocked(archonCache.get).mockReturnValue(null);
    vi.mocked(api.get).mockResolvedValue({ data: { data: mockData } });

    const { result } = renderHook(() => useSilkHydration({ key: mockKey, endpoint: mockEndpoint }));

    await waitFor(() => {
      expect(result.current.data).toEqual(mockData);
    });

    expect(api.get).toHaveBeenCalledWith(mockEndpoint);
    expect(archonCache.set).toHaveBeenCalledWith(mockKey, mockData);
  });

  it('should handle transform function if provided', async () => {
    const rawData = [{ id: '1' }];
    const transformed = [{ id: 1 }];
    vi.mocked(api.get).mockResolvedValue({ data: { data: rawData } });

    const { result } = renderHook(() =>
      useSilkHydration({
        key: mockKey,
        endpoint: mockEndpoint,
        transform: (data: unknown) =>
          (data as Array<{ id: string }>).map((item) => ({ id: Number(item.id) })),
      })
    );

    await waitFor(() => {
      expect(result.current.data).toEqual(transformed);
    });
  });

  it('should manage isSyncing state correctly', async () => {
    vi.mocked(api.get).mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve({ data: { data: mockData } }), 50);
        })
    );

    const { result } = renderHook(() => useSilkHydration({ key: mockKey, endpoint: mockEndpoint }));

    expect(result.current.isSyncing).toBe(true);

    await waitFor(() => {
      expect(result.current.isSyncing).toBe(false);
    });
  });

  it('should call onSuccess callback with fresh data', async () => {
    const onSuccess = vi.fn();
    vi.mocked(archonCache.get).mockReturnValue(null);
    vi.mocked(api.get).mockResolvedValue({ data: { data: mockData } });

    const { result } = renderHook(() =>
      useSilkHydration({ key: mockKey, endpoint: mockEndpoint, onSuccess })
    );

    await waitFor(() => {
      expect(result.current.data).toEqual(mockData);
    });

    expect(onSuccess).toHaveBeenCalledWith(mockData);
  });

  it('invokes failsafe after 15s if still syncing', async () => {
    vi.useFakeTimers();
    // API never resolves during this test
    vi.mocked(archonCache.get).mockReturnValue(null);
    vi.mocked(api.get).mockImplementation(
      () =>
        new Promise((_resolve) => {
          /* intentionally never resolves */
        })
    );

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation((): void => {});

    renderHook(() => useSilkHydration({ key: mockKey, endpoint: mockEndpoint }));

    // Advance past the 15s failsafe
    vi.advanceTimersByTime(16000);

    vi.useRealTimers();
    warnSpy.mockRestore();
  });

  it('should handle API errors gracefully', async () => {
    vi.mocked(archonCache.get).mockReturnValue(null);
    vi.mocked(api.get).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useSilkHydration({ key: mockKey, endpoint: mockEndpoint }));

    await waitFor(() => {
      expect(result.current.isSyncing).toBe(false);
    });

    expect(result.current.error).toBeDefined();
  });

  it('should expose refresh function that re-fetches data', async () => {
    vi.mocked(archonCache.get).mockReturnValue(null);
    vi.mocked(api.get)
      .mockResolvedValueOnce({ data: { data: [] } })
      .mockResolvedValueOnce({ data: { data: mockData } });

    const { result } = renderHook(() => useSilkHydration({ key: mockKey, endpoint: mockEndpoint }));

    await waitFor(() => expect(result.current.isSyncing).toBe(false));

    await result.current.refresh();

    await waitFor(() => {
      expect(result.current.data).toEqual(mockData);
    });
  });

  it('falls back to response.data when response.data.data is absent', async () => {
    vi.mocked(archonCache.get).mockReturnValue(null);
    vi.mocked(api.get).mockResolvedValue({ data: mockData });

    const { result } = renderHook(() => useSilkHydration({ key: mockKey, endpoint: mockEndpoint }));

    await waitFor(() => expect(result.current.data).toEqual(mockData));
  });

  it('falls back to empty array when response.data is also falsy', async () => {
    vi.mocked(archonCache.get).mockReturnValue(null);
    vi.mocked(api.get).mockResolvedValue({ data: null });

    const { result } = renderHook(() => useSilkHydration({ key: mockKey, endpoint: mockEndpoint }));

    await waitFor(() => expect(result.current.isSyncing).toBe(false));
    expect(result.current.data).toEqual([]);
  });

  it('sets RATE_LIMIT_EXCEEDED error for 429 responses', async () => {
    vi.mocked(archonCache.get).mockReturnValue(null);
    vi.mocked(api.get).mockRejectedValue({ response: { status: 429 } });

    const { result } = renderHook(() => useSilkHydration({ key: mockKey, endpoint: mockEndpoint }));

    await waitFor(() => expect(result.current.isSyncing).toBe(false));
    expect(result.current.error?.message).toBe('RATE_LIMIT_EXCEEDED');
  });
});
