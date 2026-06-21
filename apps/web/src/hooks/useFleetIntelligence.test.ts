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
});
