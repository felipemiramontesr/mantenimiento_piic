/* eslint-disable */
// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Pool } from 'mysql2/promise';
import {
  findRouteOwnerByUuid,
  findIncidentOwnerByUuid,
  findUnitOwner,
  listRoutesForOwnerScope,
  listUnitActivityLogsForOwnerScope,
  findRouteNodeByUuid,
  findRouteNodeIncidents,
  findIncidentNodeByUuid,
} from './routeRoutes.repository';

/**
 * FC162 F1-T4 — routeRoutes.repository.ts had zero test coverage (1.5% in
 * Sonar) despite being the SQL boundary for 6 of `routes/fleetRoutes.ts`'s
 * endpoints. Every exported function accepts an optional `executor`, so a
 * plain mock executor is passed directly per call — no `vi.mock('./db')`
 * module boilerplate needed.
 */

const mockExecutor = { execute: vi.fn() } as unknown as Pool;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('owner-scope lookups', () => {
  it('findRouteOwnerByUuid returns the ownerId when the route exists', async () => {
    vi.mocked(mockExecutor.execute).mockResolvedValueOnce([[{ ownerId: 7 }], []]);
    const result = await findRouteOwnerByUuid('route-uuid-1', mockExecutor);
    expect(result).toBe(7);
    expect(mockExecutor.execute).toHaveBeenCalledWith(expect.any(String), ['route-uuid-1']);
  });

  it('findRouteOwnerByUuid returns null when no route matches', async () => {
    vi.mocked(mockExecutor.execute).mockResolvedValueOnce([[], []]);
    expect(await findRouteOwnerByUuid('missing', mockExecutor)).toBeNull();
  });

  it('findIncidentOwnerByUuid returns the ownerId when the incident exists', async () => {
    vi.mocked(mockExecutor.execute).mockResolvedValueOnce([[{ ownerId: 3 }], []]);
    expect(await findIncidentOwnerByUuid('inc-uuid-1', mockExecutor)).toBe(3);
  });

  it('findIncidentOwnerByUuid returns null when no incident matches', async () => {
    vi.mocked(mockExecutor.execute).mockResolvedValueOnce([[], []]);
    expect(await findIncidentOwnerByUuid('missing', mockExecutor)).toBeNull();
  });

  it('findUnitOwner returns the ownerId when the unit exists', async () => {
    vi.mocked(mockExecutor.execute).mockResolvedValueOnce([[{ ownerId: 9 }], []]);
    expect(await findUnitOwner('ASM-001', mockExecutor)).toBe(9);
  });

  it('findUnitOwner returns null when no unit matches', async () => {
    vi.mocked(mockExecutor.execute).mockResolvedValueOnce([[], []]);
    expect(await findUnitOwner('missing', mockExecutor)).toBeNull();
  });
});

describe('listRoutesForOwnerScope', () => {
  it('queries without an ownerId filter when scope is null (unrestricted/Ω)', async () => {
    vi.mocked(mockExecutor.execute).mockResolvedValueOnce([[{ id: 1 }], []]);
    const result = await listRoutesForOwnerScope(null, mockExecutor);
    expect(result).toEqual([{ id: 1 }]);
    const [sql, params] = vi.mocked(mockExecutor.execute).mock.calls[0];
    expect(sql).not.toContain('fu.ownerId IN');
    expect(params).toEqual([]);
  });

  it('short-circuits to an empty array without querying when scope is an empty array', async () => {
    const result = await listRoutesForOwnerScope([], mockExecutor);
    expect(result).toEqual([]);
    expect(mockExecutor.execute).not.toHaveBeenCalled();
  });

  it('builds an IN clause with one placeholder per ownerId when scope is non-empty', async () => {
    vi.mocked(mockExecutor.execute).mockResolvedValueOnce([[], []]);
    await listRoutesForOwnerScope([1, 2, 3], mockExecutor);
    const [sql, params] = vi.mocked(mockExecutor.execute).mock.calls[0];
    expect(sql).toContain('fu.ownerId IN (?, ?, ?)');
    expect(params).toEqual([1, 2, 3]);
  });
});

describe('listUnitActivityLogsForOwnerScope', () => {
  it('queries without an ownerId filter when scope is null', async () => {
    vi.mocked(mockExecutor.execute).mockResolvedValueOnce([[{ id: 'log-1' }], []]);
    const result = await listUnitActivityLogsForOwnerScope(null, mockExecutor);
    expect(result).toEqual([{ id: 'log-1' }]);
    const [sql, params] = vi.mocked(mockExecutor.execute).mock.calls[0];
    expect(sql).not.toContain('WHERE f.ownerId IN');
    expect(params).toEqual([]);
  });

  it('short-circuits to an empty array without querying when scope is an empty array', async () => {
    const result = await listUnitActivityLogsForOwnerScope([], mockExecutor);
    expect(result).toEqual([]);
    expect(mockExecutor.execute).not.toHaveBeenCalled();
  });

  it('builds a WHERE f.ownerId IN clause with one placeholder per ownerId', async () => {
    vi.mocked(mockExecutor.execute).mockResolvedValueOnce([[], []]);
    await listUnitActivityLogsForOwnerScope([5, 6], mockExecutor);
    const [sql, params] = vi.mocked(mockExecutor.execute).mock.calls[0];
    expect(sql).toContain('WHERE f.ownerId IN (?, ?)');
    expect(params).toEqual([5, 6]);
  });
});

describe('Sovereign node views', () => {
  it('findRouteNodeByUuid returns the joined row when the route exists', async () => {
    vi.mocked(mockExecutor.execute).mockResolvedValueOnce([[{ uuid: 'route-uuid-1' }], []]);
    expect(await findRouteNodeByUuid('route-uuid-1', mockExecutor)).toEqual({
      uuid: 'route-uuid-1',
    });
  });

  it('findRouteNodeByUuid returns null when no route matches', async () => {
    vi.mocked(mockExecutor.execute).mockResolvedValueOnce([[], []]);
    expect(await findRouteNodeByUuid('missing', mockExecutor)).toBeNull();
  });

  it('findRouteNodeIncidents returns the ordered incident list', async () => {
    vi.mocked(mockExecutor.execute).mockResolvedValueOnce([[{ id: 1 }, { id: 2 }], []]);
    expect(await findRouteNodeIncidents('route-uuid-1', mockExecutor)).toHaveLength(2);
  });

  it('findRouteNodeIncidents returns an empty array when there are none', async () => {
    vi.mocked(mockExecutor.execute).mockResolvedValueOnce([[], []]);
    expect(await findRouteNodeIncidents('route-uuid-1', mockExecutor)).toEqual([]);
  });

  it('findIncidentNodeByUuid returns the joined row when the incident exists', async () => {
    vi.mocked(mockExecutor.execute).mockResolvedValueOnce([[{ uuid: 'inc-uuid-1' }], []]);
    expect(await findIncidentNodeByUuid('inc-uuid-1', mockExecutor)).toEqual({
      uuid: 'inc-uuid-1',
    });
  });

  it('findIncidentNodeByUuid returns null when no incident matches', async () => {
    vi.mocked(mockExecutor.execute).mockResolvedValueOnce([[], []]);
    expect(await findIncidentNodeByUuid('missing', mockExecutor)).toBeNull();
  });
});
