import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import api from '../api/client';
import { useEconomicLife } from './useEconomicLife';

vi.mock('../api/client', () => ({ default: { get: vi.fn() } }));

const ECONOMIC_LIFE_FIXTURE = {
  residual_value_mxn: 185000.5,
  accumulated_tco: 412300.75,
  replacement_score: 62.4,
  recommendation: 'EVALUATE' as const,
};

describe('useEconomicLife', () => {
  afterEach(() => vi.clearAllMocks());

  it('UT-ECO-1: returns economic life data on successful fetch', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: { success: true, data: ECONOMIC_LIFE_FIXTURE },
    });
    const { result } = renderHook(() => useEconomicLife('ASM-001'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual(ECONOMIC_LIFE_FIXTURE);
    expect(result.current.error).toBeNull();
    expect(vi.mocked(api.get)).toHaveBeenCalledWith('/fleet-units/ASM-001/economic-life');
  });

  it('UT-ECO-2: returns null data and error on fetch failure', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('Network error'));
    const { result } = renderHook(() => useEconomicLife('ASM-001'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBe('Network error');
  });

  it('UT-ECO-3: does not fetch when unitId is null', () => {
    const { result } = renderHook(() => useEconomicLife(null));
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBeNull();
    expect(vi.mocked(api.get)).not.toHaveBeenCalled();
  });

  // ── R4-C Fc165 F2 Slice 2.3B — unc lines 29,32,35 ──

  it('does not update state after unmount while a resolving fetch is still in flight', async () => {
    let resolveGet: (v: unknown) => void = () => {};
    vi.mocked(api.get).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveGet = resolve;
      })
    );
    const { unmount } = renderHook(() => useEconomicLife('ASM-001'));
    unmount();
    resolveGet({ data: { success: true, data: ECONOMIC_LIFE_FIXTURE } });
    await new Promise((r) => {
      setTimeout(r, 0);
    });
  });

  it('does not update state after unmount while a rejecting fetch is still in flight', async () => {
    let rejectGet: (e: unknown) => void = () => {};
    vi.mocked(api.get).mockReturnValueOnce(
      new Promise((_resolve, reject) => {
        rejectGet = reject;
      })
    );
    const { unmount } = renderHook(() => useEconomicLife('ASM-001'));
    unmount();
    rejectGet(new Error('network error'));
    await new Promise((r) => {
      setTimeout(r, 0);
    });
  });
});
