import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useTco, TcoData } from './useTco';
import api from '../api/client';

vi.mock('../api/client', () => ({
  default: { get: vi.fn() },
}));

// UT-TCO-1..3: useTco hook (FC-3 Fase 3E)

describe('useTco (UT-TCO-1..3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('UT-TCO-1: devuelve estado inicial cuando unitId es null', () => {
    const { result } = renderHook(() => useTco(null));
    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('UT-TCO-2: carga y retorna datos TCO al recibir respuesta exitosa', async () => {
    const mockData: TcoData = {
      fleet_unit_id: 'PIIC-101',
      tco_total: 4200,
      tco_maintenance: 1000,
      tco_insurance: 1200,
      tco_lease: 0,
      tco_tenencia: 3200,
      tco_verificacion: 500,
      tco_fuel: 800,
      tco_other: 0,
      total_records: 5,
      last_record_at: '2026-06-15T10:00:00.000Z',
    };
    vi.mocked(api.get).mockResolvedValueOnce({ data: { success: true, data: mockData } });
    const { result } = renderHook(() => useTco('PIIC-101'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual(mockData);
    expect(result.current.error).toBeNull();
  });

  it('UT-TCO-3: setea error cuando la petición falla', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('Network Error'));
    const { result } = renderHook(() => useTco('PIIC-101'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBe('Network Error');
  });
});
