import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import * as CosmologyRepository from './cosmology.repository';
import { invalidateUniverseCapabilities } from './universeCapabilities.service';
import {
  addSupercluster,
  removeSupercluster,
  addCluster,
  removeCluster,
  destroyUniverse,
} from './cosmology.service';

/**
 * FC193 F2 (Invariante 5) — toda mutación de Cosmología invalida la caché de capacidades del universo
 * afectado DESPUÉS de escribir, y solo cuando escribió. Sin esto el gate serviría estado viejo hasta
 * que venza el TTL.
 */

const connection = vi.hoisted(() => ({
  beginTransaction: vi.fn(),
  commit: vi.fn(),
  rollback: vi.fn(),
  release: vi.fn(),
}));

vi.mock('./db', () => ({ default: { getConnection: vi.fn(() => Promise.resolve(connection)) } }));
vi.mock('./auditService', () => ({ recordAuditLog: vi.fn() }));
vi.mock('./universeCapabilities.service', () => ({ invalidateUniverseCapabilities: vi.fn() }));
vi.mock('./cosmology.repository', () => ({
  tenantExists: vi.fn(),
  findSuperclusterByCode: vi.fn(),
  activateSupercluster: vi.fn(),
  suspendSupercluster: vi.fn(),
  suspendClustersUnderSupercluster: vi.fn(),
  findClusterByCode: vi.fn(),
  isSuperclusterActiveForTenant: vi.fn(),
  activateCluster: vi.fn(),
  suspendCluster: vi.fn(),
  findTenantById: vi.fn(),
  countZeroStateBuckets: vi.fn(),
  destroyUniverseRow: vi.fn(),
}));

const repo = CosmologyRepository as unknown as Record<string, Mock>;
const invalidate = invalidateUniverseCapabilities as Mock;

describe('FC193 F2 — cosmology invalida la caché de capacidades', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repo.tenantExists.mockResolvedValue(true);
    repo.findSuperclusterByCode.mockResolvedValue({ id: 8 });
    repo.findClusterByCode.mockResolvedValue({ id: 1, supercluster_id: 9 });
    repo.isSuperclusterActiveForTenant.mockResolvedValue(true);
    repo.findTenantById.mockResolvedValue({ id: 7, label: 'Universo Siete' });
    repo.countZeroStateBuckets.mockResolvedValue({ fleet_units: 0 });
  });

  it('addSupercluster: invalida el universo tras activar el SC', async () => {
    await addSupercluster(7, 'FINANZAS', 1);

    expect(invalidate).toHaveBeenCalledWith(7);
    expect(invalidate.mock.invocationCallOrder[0]).toBeGreaterThan(
      repo.activateSupercluster.mock.invocationCallOrder[0]
    );
  });

  it('removeSupercluster: invalida tras confirmar la TX (SC + clusters suspendidos)', async () => {
    await removeSupercluster(7, 'FINANZAS', 1);

    expect(invalidate).toHaveBeenCalledWith(7);
    expect(invalidate.mock.invocationCallOrder[0]).toBeGreaterThan(
      connection.commit.mock.invocationCallOrder[0]
    );
  });

  it('removeSupercluster: si la TX falla (rollback) NO invalida', async () => {
    repo.suspendClustersUnderSupercluster.mockRejectedValueOnce(new Error('boom'));

    await expect(removeSupercluster(7, 'FINANZAS', 1)).rejects.toThrow('boom');

    expect(invalidate).not.toHaveBeenCalled();
  });

  it('addCluster: invalida tras activar el cluster', async () => {
    await addCluster(7, 'GASTOS_EGRESOS', 1);

    expect(invalidate).toHaveBeenCalledWith(7);
  });

  it('addCluster: si el SC padre no está activo (409) no escribe y NO invalida', async () => {
    repo.isSuperclusterActiveForTenant.mockResolvedValue(false);

    const result = await addCluster(7, 'GASTOS_EGRESOS', 1);

    expect(result).toMatchObject({ ok: false, status: 409 });
    expect(invalidate).not.toHaveBeenCalled();
  });

  it('removeCluster: invalida tras suspender el cluster', async () => {
    await removeCluster(7, 'GASTOS_EGRESOS', 1);

    expect(invalidate).toHaveBeenCalledWith(7);
  });

  it('destroyUniverse: invalida tras borrar el universo (zero-state)', async () => {
    await destroyUniverse(7, 1);

    expect(invalidate).toHaveBeenCalledWith(7);
    expect(invalidate.mock.invocationCallOrder[0]).toBeGreaterThan(
      connection.commit.mock.invocationCallOrder[0]
    );
  });

  it.each([
    ['addSupercluster', (): Promise<unknown> => addSupercluster(99, 'FINANZAS', 1)],
    ['removeSupercluster', (): Promise<unknown> => removeSupercluster(99, 'FINANZAS', 1)],
    ['addCluster', (): Promise<unknown> => addCluster(99, 'GASTOS_EGRESOS', 1)],
    ['removeCluster', (): Promise<unknown> => removeCluster(99, 'GASTOS_EGRESOS', 1)],
  ])('%s sobre un universo inexistente (404) no escribe ni invalida', async (_name, action) => {
    repo.tenantExists.mockResolvedValue(false);

    const result = await action();

    expect(result).toMatchObject({ ok: false, status: 404 });
    expect(invalidate).not.toHaveBeenCalled();
  });

  it('destroyUniverse bloqueado por zero-state (409) no invalida', async () => {
    repo.countZeroStateBuckets.mockResolvedValue({ fleet_units: 3 });

    const result = await destroyUniverse(7, 1);

    expect(result).toMatchObject({ ok: false, status: 409 });
    expect(invalidate).not.toHaveBeenCalled();
  });
});
