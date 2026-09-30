/* eslint-disable */
// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { countOverdueMaintenance, listRecentSecurityThreats } from './alerts.repository';
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

describe('listRecentSecurityThreats (FC201 F3)', () => {
  it('agrupa la última hora de security_events por tipo, contando IPs distintas y toques', async () => {
    const rows = [{ event_type: 'BAIT_ROUTE', ips: 2, hits: '30' }];
    db.execute.mockResolvedValueOnce([rows, undefined]);

    expect(await listRecentSecurityThreats()).toBe(rows);
    const [sql] = db.execute.mock.calls.at(-1);
    expect(sql).toContain('FROM security_events');
    expect(sql).toContain('last_seen_at >= NOW() - INTERVAL 1 HOUR');
    expect(sql).toContain('COUNT(DISTINCT ip_hash)');
    expect(sql).toContain('GROUP BY event_type');
  });
});
