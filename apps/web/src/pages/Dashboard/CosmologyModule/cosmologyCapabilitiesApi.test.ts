import { describe, it, expect, vi, beforeEach } from 'vitest';
import api from '../../../api/client';
import {
  activateCluster,
  activateSupercluster,
  describeCapabilityError,
  fetchUniverseClusters,
  fetchUniverseSuperclusters,
  suspendCluster,
  suspendSupercluster,
} from './cosmologyCapabilitiesApi';

/** FC208 F1 — las 6 llamadas a la API viva de FC160 y la traducción de sus errores. */

vi.mock('../../../api/client', () => ({
  default: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.post).mockResolvedValue({ data: { success: true } });
  vi.mocked(api.delete).mockResolvedValue({ data: { success: true } });
});

describe('cosmologyCapabilitiesApi', () => {
  it('las listas salen de response.data.data', async () => {
    const scs = [{ code: 'FLOTA', name: 'Flotilla', state: 'ACTIVE' }];
    const cls = [{ code: 'GPS', name: 'GPS', superclusterCode: 'FLOTA', state: 'ACTIVE' }];
    vi.mocked(api.get).mockResolvedValueOnce({ data: { success: true, data: scs } });
    await expect(fetchUniverseSuperclusters(7)).resolves.toBe(scs);
    expect(api.get).toHaveBeenLastCalledWith('/cosmology/universes/7/superclusters');
    vi.mocked(api.get).mockResolvedValueOnce({ data: { success: true, data: cls } });
    await expect(fetchUniverseClusters(7)).resolves.toBe(cls);
    expect(api.get).toHaveBeenLastCalledWith('/cosmology/universes/7/clusters');
  });

  it('POST lleva el código en el cuerpo y DELETE en la ruta (codificado)', async () => {
    await activateSupercluster(7, 'FLOTA');
    expect(api.post).toHaveBeenLastCalledWith('/cosmology/universes/7/superclusters', {
      superclusterCode: 'FLOTA',
    });
    await suspendSupercluster(7, 'FLOTA');
    expect(api.delete).toHaveBeenLastCalledWith('/cosmology/universes/7/superclusters/FLOTA');
    await activateCluster(7, 'GPS');
    expect(api.post).toHaveBeenLastCalledWith('/cosmology/universes/7/clusters', {
      clusterCode: 'GPS',
    });
    await suspendCluster(7, 'A/B');
    expect(api.delete).toHaveBeenLastCalledWith('/cosmology/universes/7/clusters/A%2FB');
  });

  it.each([
    [{ response: { data: { code: 'SUPERCLUSTER_NOT_ACTIVE' } } }, 'debe estar activo'],
    [{ response: { data: { code: 'SUPERCLUSTER_NOT_FOUND' } } }, 'Supercúmulo no existe'],
    [{ response: { data: { code: 'CLUSTER_NOT_FOUND' } } }, 'Cúmulo no existe'],
    [{ response: { data: { error: 'FORBIDDEN' } } }, 'exclusiva de GrayMan'],
    [{ response: { data: { code: 'OTRO' } } }, 'No se pudo completar'],
    [new Error('red'), 'No se pudo completar'],
  ])('%#: traduce el error', (err, text) => {
    expect(describeCapabilityError(err)).toContain(text);
  });
});
