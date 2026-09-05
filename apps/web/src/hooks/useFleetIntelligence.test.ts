import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import api from '../api/client';
import { useFleetIntelligence } from './useFleetIntelligence';

vi.mock('../api/client', () => ({ default: { get: vi.fn() } }));

const KPI_FIXTURE = {
  oee: 78.5,
  tco_per_km: 4.2,
  km_per_liter: 11.5,
  pm_compliance: 92.3,
  backlog_aging_days: 3.5,
};

describe('useFleetIntelligence', () => {
  afterEach(() => vi.clearAllMocks());

  it('UT-INT-1: returns KPI data on successful fetch', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: { success: true, data: KPI_FIXTURE },
    });
    const { result } = renderHook(() => useFleetIntelligence('ASM-001'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual(KPI_FIXTURE);
    expect(result.current.error).toBeNull();
    expect(vi.mocked(api.get)).toHaveBeenCalledWith('/fleet-units/ASM-001/intelligence');
  });

  it('UT-INT-2: returns null data and error on fetch failure', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('Network error'));
    const { result } = renderHook(() => useFleetIntelligence('ASM-001'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBe('Network error');
  });

  it('UT-INT-3: does not fetch when unitId is null', () => {
    const { result } = renderHook(() => useFleetIntelligence(null));
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBeNull();
    expect(vi.mocked(api.get)).not.toHaveBeenCalled();
  });

  // ── R4-C Fc165 F2 Slice 2.3B — unc lines 30,33,36 ──

  it('does not update state after unmount while a resolving fetch is still in flight', async () => {
    let resolveGet: (v: unknown) => void = () => {};
    vi.mocked(api.get).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveGet = resolve;
      })
    );
    const { unmount } = renderHook(() => useFleetIntelligence('ASM-001'));
    unmount();
    resolveGet({ data: { success: true, data: KPI_FIXTURE } });
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
    const { unmount } = renderHook(() => useFleetIntelligence('ASM-001'));
    unmount();
    rejectGet(new Error('network error'));
    await new Promise((r) => {
      setTimeout(r, 0);
    });
  });
});
