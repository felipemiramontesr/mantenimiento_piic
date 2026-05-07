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

  it('should initialize with cached data if available', () => {
    vi.mocked(archonCache.get).mockReturnValue(mockData);

    const { result } = renderHook(() => useSilkHydration({ key: mockKey, endpoint: mockEndpoint }));

    expect(result.current.data).toEqual(mockData);
    expect(archonCache.get).toHaveBeenCalledWith(mockKey);
  });

  it('should initialize with initialData if cache is empty', () => {
    vi.mocked(archonCache.get).mockReturnValue(null);
    const initial = [{ id: 0 }];

    const { result } = renderHook(() =>
      useSilkHydration({ key: mockKey, endpoint: mockEndpoint, initialData: initial })
    );

    expect(result.current.data).toEqual(initial);
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
});
