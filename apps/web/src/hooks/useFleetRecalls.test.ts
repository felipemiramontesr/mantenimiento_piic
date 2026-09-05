import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import api from '../api/client';
import { useFleetRecalls } from './useFleetRecalls';

vi.mock('../api/client', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}));

const RECALL_ITEM_FIXTURE = {
  recall_id: 9,
  campaign_code: '24V-112',
  description: 'Falla en sistema de frenos',
  make: 'FORD',
  model: 'F-150',
  year: 2022,
  published_date: '2024-03-10',
  status: 'PENDING' as const,
  resolved_at: null,
  work_order_id: null,
};

describe('useFleetRecalls', () => {
  afterEach(() => vi.clearAllMocks());

  it('UT-REC-1: returns recall list on successful fetch', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: { success: true, count: 1, data: [RECALL_ITEM_FIXTURE] },
    });
    const { result } = renderHook(() => useFleetRecalls('ASM-001'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.recalls).toEqual([RECALL_ITEM_FIXTURE]);
    expect(result.current.error).toBeNull();
    expect(vi.mocked(api.get)).toHaveBeenCalledWith('/fleet-units/ASM-001/recalls');
  });

  it('UT-REC-2: returns error on fetch failure', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('Network error'));
    const { result } = renderHook(() => useFleetRecalls('ASM-001'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.recalls).toEqual([]);
    expect(result.current.error).toBe('Network error');
  });

  it('UT-REC-3: does not fetch when unitId is null', () => {
    const { result } = renderHook(() => useFleetRecalls(null));
    expect(result.current.loading).toBe(false);
    expect(result.current.recalls).toEqual([]);
    expect(vi.mocked(api.get)).not.toHaveBeenCalled();
  });

  it('UT-REC-4: linkRecall posts recallId and refreshes the list', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, count: 0, data: [] } });
    vi.mocked(api.post).mockResolvedValueOnce({ data: { success: true } });
    const { result } = renderHook(() => useFleetRecalls('ASM-001'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.linkRecall(9);
    });
    expect(vi.mocked(api.post)).toHaveBeenCalledWith('/fleet-units/ASM-001/recalls', {
      recallId: 9,
    });
    expect(vi.mocked(api.get)).toHaveBeenCalledTimes(2);
  });

  it('UT-REC-5: updateStatus patches status and refreshes the list', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, count: 0, data: [] } });
    vi.mocked(api.patch).mockResolvedValueOnce({ data: { success: true } });
    const { result } = renderHook(() => useFleetRecalls('ASM-001'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.updateStatus(9, 'COMPLETED');
    });
    expect(vi.mocked(api.patch)).toHaveBeenCalledWith('/fleet-units/ASM-001/recalls/9', {
      status: 'COMPLETED',
    });
    expect(vi.mocked(api.get)).toHaveBeenCalledTimes(2);
  });

  // ── R4-C Fc165 F2 Slice 2.3B — unc lines 43,46,49 ──

  it('does not update state after unmount while a resolving fetch is still in flight', async () => {
    let resolveGet: (v: unknown) => void = () => {};
    vi.mocked(api.get).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveGet = resolve;
      })
    );
    const { unmount } = renderHook(() => useFleetRecalls('ASM-001'));
    unmount();
    resolveGet({ data: { success: true, count: 1, data: [RECALL_ITEM_FIXTURE] } });
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
    const { unmount } = renderHook(() => useFleetRecalls('ASM-001'));
    unmount();
    rejectGet(new Error('network error'));
    await new Promise((r) => {
      setTimeout(r, 0);
    });
  });
});
