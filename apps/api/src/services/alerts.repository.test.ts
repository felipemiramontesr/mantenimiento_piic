/* eslint-disable */
// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { countOverdueMaintenance } from './alerts.repository';
import db from './db';

vi.mock('./db', () => ({
  default: { execute: vi.fn() },
}));

/**
 * FC162 F3 (100% mandatorio) — alerts.repository.ts's `ownerFilter` never had
 * a direct test for the `ownerIds: []` deny-by-default branch (fleet:scoped
 * carrier with zero linked owners must see nothing, not everything).
 */

describe('ownerFilter (via countOverdueMaintenance) — deny-by-default', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (db.execute as any).mockResolvedValue([[{ overdueCount: 0 }]]);
  });

  it('emits a "1 = 0" deny-all clause when ownerIds is an empty array', async () => {
    await countOverdueMaintenance({ tenantId: null, ownerIds: [] });
    const [sql, params] = (db.execute as any).mock.calls[0];
    expect(sql).toContain('1 = 0');
    expect(params).toEqual([]);
  });
});
