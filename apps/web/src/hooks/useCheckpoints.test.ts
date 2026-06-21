import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useCheckpoints, Checkpoint } from './useCheckpoints';
import api from '../api/client';

vi.mock('../api/client', () => ({
  default: { get: vi.fn() },
}));

// UT-CHK-1..3: useCheckpoints hook (FC-4 Fase 4C)

describe('useCheckpoints (UT-CHK-1..3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('UT-CHK-1: devuelve array vacío cuando uuid es null', () => {
    const { result } = renderHook(() => useCheckpoints(null));
    expect(result.current.data).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('UT-CHK-2: carga y retorna checkpoints ordenados al recibir respuesta exitosa', async () => {
    const mockData: Checkpoint[] = [
      {
        id: 1,
        movement_id: 10,
        sequence: 1,
        name: 'Punto de Control Norte',
        neighborhood_id: null,
        eta: null,
        arrived_at: '2026-06-01T10:00:00.000Z',
        status: 'VISITED',
        created_at: '2026-06-01T07:00:00.000Z',
      },
      {
        id: 2,
        movement_id: 10,
        sequence: 2,
        name: 'Mina Sur',
        neighborhood_id: 42,
        eta: '2026-06-01T12:00:00.000Z',
        arrived_at: null,
        status: 'PENDING',
        created_at: '2026-06-01T07:00:00.000Z',
      },
    ];
    vi.mocked(api.get).mockResolvedValueOnce({ data: { success: true, data: mockData } });
    const { result } = renderHook(() => useCheckpoints('route-uuid-001'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toHaveLength(2);
    expect(result.current.data[0].status).toBe('VISITED');
    expect(result.current.error).toBeNull();
  });

  it('UT-CHK-3: setea error cuando la petición falla', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('Network Error'));
    const { result } = renderHook(() => useCheckpoints('route-uuid-001'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual([]);
    expect(result.current.error).toBe('Network Error');
  });
});
