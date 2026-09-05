import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import api from '../api/client';
import { useCo2 } from './useCo2';

vi.mock('../api/client', () => ({ default: { get: vi.fn() } }));

const CO2_FIXTURE = {
  fuel_code: 'DIESEL',
  co2_factor_kg_per_liter: 2.68,
  total_liters: 1250.4,
  total_co2_kg: 3351.07,
  period_from: '2026-07-01',
  period_to: '2026-07-31',
};

describe('useCo2', () => {
  afterEach(() => vi.clearAllMocks());

  it('UT-CO2-1: returns CO2 data on successful fetch', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: { success: true, data: CO2_FIXTURE },
    });
    const { result } = renderHook(() => useCo2('ASM-001'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual(CO2_FIXTURE);
    expect(result.current.error).toBeNull();
    expect(vi.mocked(api.get)).toHaveBeenCalledWith('/fleet-units/ASM-001/co2');
  });

  it('UT-CO2-2: returns null data and error on fetch failure', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('Network error'));
    const { result } = renderHook(() => useCo2('ASM-001'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBe('Network error');
  });

  it('UT-CO2-3: does not fetch when unitId is null', () => {
    const { result } = renderHook(() => useCo2(null));
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
    const { unmount } = renderHook(() => useCo2('ASM-001'));
    unmount();
    resolveGet({ data: { success: true, data: CO2_FIXTURE } });
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
    const { unmount } = renderHook(() => useCo2('ASM-001'));
    unmount();
    rejectGet(new Error('network error'));
    await new Promise((r) => {
      setTimeout(r, 0);
    });
  });
});
