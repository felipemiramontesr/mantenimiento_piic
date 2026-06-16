import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import db from '../services/db';

import getDescendantOwnerIds from './ownerScope';

vi.mock('../services/db', () => ({
  default: {
    execute: vi.fn().mockResolvedValue([[], undefined]),
  },
}));

describe('getDescendantOwnerIds', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns IDs of PRIVATE owners under a given centroOwnerId', async () => {
    (db.execute as Mock).mockResolvedValueOnce([[{ id: 10 }, { id: 20 }], undefined]);
    const result = await getDescendantOwnerIds(5);
    expect(result).toEqual([10, 20]);
    const [sql, params] = (db.execute as Mock).mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('parent_owner_id');
    expect(params).toContain(5);
    expect(params).toContain('PRIVATE');
  });

  it('returns empty array when centro has no PRIVATE owners', async () => {
    (db.execute as Mock).mockResolvedValueOnce([[], undefined]);
    const result = await getDescendantOwnerIds(99);
    expect(result).toEqual([]);
  });
});
