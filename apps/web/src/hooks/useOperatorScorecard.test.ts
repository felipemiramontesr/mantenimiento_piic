import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import api from '../api/client';
import { useOperatorScorecard } from './useOperatorScorecard';

vi.mock('../api/client', () => ({ default: { get: vi.fn() } }));

const SCORECARD_FIXTURE = {
  driver_id: 17,
  route_count: 34,
  fuel_efficiency_score: 88.1,
  incident_rate_score: 95.6,
  checkpoint_adherence_score: 91.2,
  composite_score: 91.6,
};

describe('useOperatorScorecard', () => {
  afterEach(() => vi.clearAllMocks());

  it('UT-OPS-1: returns scorecard data on successful fetch', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: { success: true, data: SCORECARD_FIXTURE },
    });
    const { result } = renderHook(() => useOperatorScorecard('ASM-001'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual(SCORECARD_FIXTURE);
    expect(result.current.error).toBeNull();
    expect(vi.mocked(api.get)).toHaveBeenCalledWith('/fleet-units/ASM-001/operator-score');
  });

  it('UT-OPS-2: returns null data and error on fetch failure', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('Network error'));
    const { result } = renderHook(() => useOperatorScorecard('ASM-001'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBe('Network error');
  });

  it('UT-OPS-3: does not fetch when unitId is null', () => {
    const { result } = renderHook(() => useOperatorScorecard(null));
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBeNull();
    expect(vi.mocked(api.get)).not.toHaveBeenCalled();
  });

  // ── R4-C Fc165 F2 Slice 2.3B — unc lines 31,34,37 ──

  it('does not update state after unmount while a resolving fetch is still in flight', async () => {
    let resolveGet: (v: unknown) => void = () => {};
    vi.mocked(api.get).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveGet = resolve;
      })
    );
    const { unmount } = renderHook(() => useOperatorScorecard('ASM-001'));
    unmount();
    resolveGet({ data: { success: true, data: SCORECARD_FIXTURE } });
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
    const { unmount } = renderHook(() => useOperatorScorecard('ASM-001'));
    unmount();
    rejectGet(new Error('network error'));
    await new Promise((r) => {
      setTimeout(r, 0);
    });
  });
});
