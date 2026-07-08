import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import db from './db';
import { resolveFinanceClusterScope, FINANCE_PERSONAL_CATEGORIES } from './clusterAccess';

vi.mock('./db', () => ({
  default: { execute: vi.fn() },
}));

describe('FC 067 F4 — clusterAccess.resolveFinanceClusterScope', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('ownerIds vacío → devuelve scope vacío sin consultar DB', async () => {
    const result = await resolveFinanceClusterScope([]);
    expect(result).toEqual({ activeOwnerIds: [], categoryFilter: null });
    expect(db.execute).not.toHaveBeenCalled();
  });

  // ── T1 — ClusterVisible(SC_activo, Cúmulo_activo): 4 filas ────────────────
  it('T1 ⊤⊤ → SC activo ∧ Cúmulo activo → owner incluido en activeOwnerIds', async () => {
    (db.execute as Mock).mockResolvedValueOnce([
      [{ ownerId: 1, ownerType: 'FLOTILLA', clusterActive: 1 }],
      undefined,
    ]);
    const result = await resolveFinanceClusterScope([1]);
    expect(result.activeOwnerIds).toEqual([1]);
  });

  it('T1 ⊤⊥ → SC activo ∧ Cúmulo inactivo → owner excluido', async () => {
    (db.execute as Mock).mockResolvedValueOnce([
      [{ ownerId: 1, ownerType: 'FLOTILLA', clusterActive: 0 }],
      undefined,
    ]);
    const result = await resolveFinanceClusterScope([1]);
    expect(result.activeOwnerIds).toEqual([]);
  });

  it('T1 ⊥⊤ / ⊥⊥ → sin fila de SC (LEFT JOIN NULL) → fail-closed, owner excluido', async () => {
    (db.execute as Mock).mockResolvedValueOnce([
      [{ ownerId: 1, ownerType: 'FLOTILLA', clusterActive: null }],
      undefined,
    ]);
    const result = await resolveFinanceClusterScope([1]);
    expect(result.activeOwnerIds).toEqual([]);
  });

  // ── T2 — ArchonautScope(owner_type=ARCHONAUT, categoria∈personal_set) ─────
  it('T2 ⊤ → owner_type=ARCHONAUT → categoryFilter = FINANCE_PERSONAL_CATEGORIES', async () => {
    (db.execute as Mock).mockResolvedValueOnce([
      [{ ownerId: 7, ownerType: 'ARCHONAUT', clusterActive: 1 }],
      undefined,
    ]);
    const result = await resolveFinanceClusterScope([7]);
    expect(result.categoryFilter).toEqual(FINANCE_PERSONAL_CATEGORIES);
    expect(result.categoryFilter).not.toContain('LEASE');
    expect(result.categoryFilter).not.toContain('FINE');
  });

  it('T2 ⊥ → owner_type≠ARCHONAUT → categoryFilter = null (set completo)', async () => {
    (db.execute as Mock).mockResolvedValueOnce([
      [{ ownerId: 1, ownerType: 'FLOTILLA', clusterActive: 1 }],
      undefined,
    ]);
    const result = await resolveFinanceClusterScope([1]);
    expect(result.categoryFilter).toBeNull();
  });

  it('multi-owner: filtra solo los activos y detecta ARCHONAUT si aparece en cualquier fila', async () => {
    (db.execute as Mock).mockResolvedValueOnce([
      [
        { ownerId: 1, ownerType: 'CENTER', clusterActive: 1 },
        { ownerId: 2, ownerType: 'ARCHONAUT', clusterActive: 0 },
        { ownerId: 3, ownerType: 'ARCHONAUT', clusterActive: 1 },
      ],
      undefined,
    ]);
    const result = await resolveFinanceClusterScope([1, 2, 3]);
    expect(result.activeOwnerIds.sort()).toEqual([1, 3]);
    expect(result.categoryFilter).toEqual(FINANCE_PERSONAL_CATEGORIES);
  });
});
