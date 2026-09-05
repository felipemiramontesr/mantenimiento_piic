import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import api from '../api/client';
import { useNhtsaRecalls } from './useNhtsaRecalls';

vi.mock('../api/client', () => ({ default: { get: vi.fn(), post: vi.fn() } }));

const NHTSA_RECALL_FIXTURE = {
  campaignNumber: '24V112000',
  subject: 'Sistema de frenos',
  summary: 'El pedal de freno puede fallar bajo ciertas condiciones.',
  remedy: 'Los concesionarios reemplazarán el módulo de frenos.',
  consequence: 'Aumenta el riesgo de colisión.',
  component: 'SERVICE BRAKES',
  manufacturer: 'FORD MOTOR COMPANY',
  nhtsaActionNumber: '24V112000',
};

describe('useNhtsaRecalls', () => {
  afterEach(() => vi.clearAllMocks());

  it('UT-NHT-1: search populates results on success', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: { success: true, count: 1, data: [NHTSA_RECALL_FIXTURE] },
    });
    const { result } = renderHook(() => useNhtsaRecalls());
    await act(async () => {
      await result.current.search('FORD', 'F-150', 2022);
    });
    expect(result.current.results).toEqual([NHTSA_RECALL_FIXTURE]);
    expect(result.current.error).toBeNull();
    expect(vi.mocked(api.get)).toHaveBeenCalledWith(
      '/recalls/nhtsa?make=FORD&model=F-150&year=2022'
    );
  });

  it('UT-NHT-2: search sets error and clears results on failure', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('NHTSA API no disponible'));
    const { result } = renderHook(() => useNhtsaRecalls());
    await act(async () => {
      await result.current.search('FORD', 'F-150', 2022);
    });
    expect(result.current.results).toEqual([]);
    expect(result.current.error).toBe('NHTSA API no disponible');
  });

  it('uses the generic fallback message when the search rejection is not an Error instance', async () => {
    vi.mocked(api.get).mockRejectedValueOnce('raw rejection, not an Error');
    const { result } = renderHook(() => useNhtsaRecalls());
    await act(async () => {
      await result.current.search('FORD', 'F-150', 2022);
    });
    expect(result.current.error).toBe('Error al consultar NHTSA');
  });

  it('UT-NHT-3: importRecall posts params and returns recall_id', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({
      data: { success: true, recall_id: 9, imported: true },
    });
    const { result } = renderHook(() => useNhtsaRecalls());
    let imported: { recall_id: number } | undefined;
    await act(async () => {
      imported = await result.current.importRecall({
        campaignNumber: '24V112000',
        make: 'FORD',
        model: 'F-150',
        year: 2022,
      });
    });
    expect(imported).toEqual({ recall_id: 9 });
    expect(vi.mocked(api.post)).toHaveBeenCalledWith('/recalls/nhtsa/import', {
      campaignNumber: '24V112000',
      make: 'FORD',
      model: 'F-150',
      year: 2022,
    });
  });
});
