import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { getUniverseCapabilities } from './universeCapabilities.service';
import { resolveSessionCapabilities } from './sessionCapabilities.service';

/**
 * FC193 F3 — `activeCapabilities` del payload de sesión: Ω ve el manifiesto completo, el Arc itinerante
 * (tenant_id null, no Ω) ninguna, el resto las ACTIVE de su universo (misma fuente que el gate).
 */

vi.mock('./universeCapabilities.service', () => ({ getUniverseCapabilities: vi.fn() }));

const capabilities = getUniverseCapabilities as Mock;

const ALL_SC = ['CRM', 'RASTREO', 'MANTENIMIENTO', 'FINANZAS', 'RRHH'];

describe('FC193 F3 — resolveSessionCapabilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    ['roleId 0', { roleId: 0, permissions: [] }],
    ['comodín "*"', { roleId: 9, permissions: ['*'] }],
  ])(
    'Ω (%s) recibe TODOS los Supercúmulos y Cúmulos del manifiesto sin consultar la DB',
    async (_c, caller) => {
      const result = await resolveSessionCapabilities(caller, null);

      expect(result.superclusters).toEqual(ALL_SC);
      expect(result.clusters).toEqual(['GASTOS_EGRESOS']);
      expect(capabilities).not.toHaveBeenCalled();
    }
  );

  it('Ω con un tenant asignado sigue viendo todo (no depende de su universo)', async () => {
    const result = await resolveSessionCapabilities({ roleId: 0 }, 5);

    expect(result.superclusters).toEqual(ALL_SC);
    expect(capabilities).not.toHaveBeenCalled();
  });

  it.each([
    ['null (Arc itinerante)', null],
    ['cero', 0],
    ['negativo', -4],
    ['decimal', 2.5],
  ])(
    'sin universo válido (%s) y no Ω ⇒ ninguna capacidad, sin consultar la DB',
    async (_c, tenantId) => {
      const result = await resolveSessionCapabilities(
        { roleId: 7, permissions: ['social:post:view'] },
        tenantId
      );

      expect(result).toEqual({ superclusters: [], clusters: [] });
      expect(capabilities).not.toHaveBeenCalled();
    }
  );

  it('tenant normal ⇒ las capacidades ACTIVE de su universo, ordenadas (payload estable)', async () => {
    capabilities.mockResolvedValue({
      superclusters: new Set(['RASTREO', 'FINANZAS']),
      clusters: new Set(['GASTOS_EGRESOS']),
    });

    const result = await resolveSessionCapabilities(
      { roleId: 3, permissions: ['fleet:unit:view:own'] },
      5
    );

    expect(result).toEqual({
      superclusters: ['FINANZAS', 'RASTREO'],
      clusters: ['GASTOS_EGRESOS'],
    });
    expect(capabilities).toHaveBeenCalledWith(5);
  });

  it('ordena también los clusters (el servicio es genérico: con el catálogo actual solo hay uno)', async () => {
    capabilities.mockResolvedValue({
      superclusters: new Set(['FINANZAS']),
      clusters: new Set(['ZETA_FUTURO', 'GASTOS_EGRESOS']),
    });

    const result = await resolveSessionCapabilities({ roleId: 3 }, 5);

    expect(result.clusters).toEqual(['GASTOS_EGRESOS', 'ZETA_FUTURO']);
  });

  it('un universo sin nada activo ⇒ arrays vacíos', async () => {
    capabilities.mockResolvedValue({ superclusters: new Set(), clusters: new Set() });

    expect(await resolveSessionCapabilities({ roleId: 3 }, 5)).toEqual({
      superclusters: [],
      clusters: [],
    });
  });

  it('fail-closed: un error de DB se propaga (no se anuncia lo que no se pudo confirmar)', async () => {
    capabilities.mockRejectedValue(new Error('db down'));

    await expect(resolveSessionCapabilities({ roleId: 3 }, 5)).rejects.toThrow('db down');
  });
});
