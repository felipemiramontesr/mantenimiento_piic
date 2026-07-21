import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import db from './db';
import { resolveCatalogId, CatalogMappingError } from './catalogMapper';

// FC 082 F2b1 — Cond.3 (Bravo): unit test del mapper fail-closed.
vi.mock('./db', () => ({
  default: {
    execute: vi.fn(),
  },
}));

describe('catalogMapper — resolveCatalogId', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the catalog id when the code exists', async () => {
    (db.execute as Mock).mockResolvedValueOnce([[{ id: 9103 }], undefined]);

    const id = await resolveCatalogId('FINANCE_CATEGORY', 'FUEL');

    expect(id).toBe(9103);
    expect(db.execute).toHaveBeenCalledWith(
      'SELECT id FROM common_catalogs WHERE category = ? AND code = ?',
      ['FINANCE_CATEGORY', 'FUEL']
    );
  });

  it('is fail-closed: throws CatalogMappingError when the code is not catalogued (never returns NULL silently)', async () => {
    (db.execute as Mock).mockResolvedValueOnce([[], undefined]);

    await expect(resolveCatalogId('FINANCE_CATEGORY', 'BOGUS')).rejects.toThrow(
      CatalogMappingError
    );
  });

  it('CatalogMappingError carries the category and code for diagnostics', async () => {
    (db.execute as Mock).mockResolvedValueOnce([[], undefined]);

    try {
      await resolveCatalogId('INCIDENT_CATEGORY', 'BOGUS');
      expect.unreachable('expected resolveCatalogId to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(CatalogMappingError);
      expect((error as CatalogMappingError).category).toBe('INCIDENT_CATEGORY');
      expect((error as CatalogMappingError).code).toBe('BOGUS');
    }
  });

  it('uses the provided executor (e.g. a transaction connection) instead of the pool when given', async () => {
    const connectionExecute = vi.fn().mockResolvedValueOnce([[{ id: 9120 }], undefined]);
    const fakeConnection = { execute: connectionExecute } as unknown as Parameters<
      typeof resolveCatalogId
    >[2];

    const id = await resolveCatalogId('MAINT_SERVICE_TYPE', 'BASIC_10K', fakeConnection);

    expect(id).toBe(9120);
    expect(connectionExecute).toHaveBeenCalledTimes(1);
    expect(db.execute).not.toHaveBeenCalled();
  });
});
