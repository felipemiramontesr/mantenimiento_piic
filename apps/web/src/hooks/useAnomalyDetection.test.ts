import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import api from '../api/client';
import { useAnomalyDetection } from './useAnomalyDetection';

vi.mock('../api/client', () => ({ default: { get: vi.fn() } }));

const ANOMALY_FIXTURE = {
  fleet_size: 42,
  algorithm: 'z-score-v1',
  unit_km_per_liter: 9.1,
  baseline_km_per_liter: 11.4,
  deviation_pct: -20.2,
  z_score: -2.3,
  is_anomaly: true,
};

describe('useAnomalyDetection', () => {
  afterEach(() => vi.clearAllMocks());

  it('UT-ANO-1: returns anomaly data on successful fetch', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: { success: true, data: ANOMALY_FIXTURE },
    });
    const { result } = renderHook(() => useAnomalyDetection('ASM-001'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual(ANOMALY_FIXTURE);
    expect(result.current.error).toBeNull();
    expect(vi.mocked(api.get)).toHaveBeenCalledWith('/fleet-units/ASM-001/anomalies');
  });

  it('UT-ANO-2: returns null data and error on fetch failure', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('Network error'));
    const { result } = renderHook(() => useAnomalyDetection('ASM-001'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBe('Network error');
  });

  it('UT-ANO-3: does not fetch when unitId is null', () => {
    const { result } = renderHook(() => useAnomalyDetection(null));
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBeNull();
    expect(vi.mocked(api.get)).not.toHaveBeenCalled();
  });
});
