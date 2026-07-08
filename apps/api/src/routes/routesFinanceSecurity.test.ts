import { describe, it, expect, vi, beforeAll, beforeEach, Mock } from 'vitest';
import type { RowDataPacket, FieldPacket } from 'mysql2';
import buildApp from '../index';
import db from '../services/db';
import FleetService from '../services/fleetService';
import RouteService from '../services/routeService';

vi.mock('../services/db', () => ({
  default: {
    execute: vi.fn().mockResolvedValue([[], undefined]),
    query: vi.fn().mockResolvedValue([[], undefined]),
    getConnection: vi.fn(),
  },
}));

vi.mock('../services/fleetService', () => ({
  default: {
    getUserOwnerIds: vi.fn(),
  },
}));

vi.mock('../services/routeService', () => ({
  default: {
    startRoute: vi.fn(),
    finishRoute: vi.fn(),
    getActiveRoute: vi.fn(),
    getIncidents: vi.fn(),
    getAllIncidents: vi.fn(),
    updateRoute: vi.fn(),
    deleteRoute: vi.fn(),
    reportIncident: vi.fn(),
  },
}));

describe('Security Hardening & Scoping (EAL6+ Integration Tests)', () => {
  const app = buildApp();
  let scopedToken: string;
  let unscopedToken: string;
  let mockConnection: {
    beginTransaction: ReturnType<typeof vi.fn>;
    commit: ReturnType<typeof vi.fn>;
    rollback: ReturnType<typeof vi.fn>;
    release: ReturnType<typeof vi.fn>;
    execute: ReturnType<typeof vi.fn>;
  };

  beforeAll(async (): Promise<void> => {
    await app.ready();
    scopedToken = app.jwt.sign({
      id: 10,
      username: 'scoped_owner',
      roleId: 1,
      permissions: [
        'route:view',
        'route:write',
        'route:record:create',
        'financial:view',
        'financial:write',
        'user:admin',
        'fleet:scoped',
      ],
    });
    unscopedToken = app.jwt.sign({
      id: 20,
      username: 'admin_unscoped',
      roleId: 0,
      permissions: ['*'],
    });

    mockConnection = {
      beginTransaction: vi.fn().mockResolvedValue(undefined),
      commit: vi.fn().mockResolvedValue(undefined),
      rollback: vi.fn().mockResolvedValue(undefined),
      release: vi.fn().mockResolvedValue(undefined),
      execute: vi.fn().mockResolvedValue([[], undefined]),
    };
    (db.getConnection as Mock).mockResolvedValue(mockConnection);
  });

  beforeEach((): void => {
    vi.clearAllMocks();
    (db.execute as Mock).mockResolvedValue([[], undefined]);
    mockConnection.execute.mockResolvedValue([[], undefined]);
    vi.mocked(FleetService.getUserOwnerIds).mockResolvedValue([42]);
  });

  const authHeader = (token: string): Record<string, string> => ({
    Authorization: `Bearer ${token}`,
  });

  describe('1. Routes Scoping & IDOR Prevention', () => {
    it('GET /routes filters by owner scope for scoped user', async () => {
      await app.inject({
        method: 'GET',
        url: '/v1/routes',
        headers: authHeader(scopedToken),
      });

      expect(FleetService.getUserOwnerIds).toHaveBeenCalledWith(10);
      const call = vi.mocked(db.execute).mock.calls[0];
      expect(call[0]).toContain('AND fu.ownerId IN (?)');
      expect(call[1]).toEqual([42]);
    });

    it('GET /routes does NOT filter for unscoped user', async () => {
      await app.inject({
        method: 'GET',
        url: '/v1/routes',
        headers: authHeader(unscopedToken),
      });

      expect(FleetService.getUserOwnerIds).not.toHaveBeenCalled();
      const call = vi.mocked(db.execute).mock.calls[0];
      expect(call[0]).not.toContain('fu.ownerId IN');
    });

    it('GET /routes returns empty array immediately if owner scope is empty', async () => {
      vi.mocked(FleetService.getUserOwnerIds).mockResolvedValueOnce([]);

      const res = await app.inject({
        method: 'GET',
        url: '/v1/routes',
        headers: authHeader(scopedToken),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data).toEqual([]);
      expect(db.execute).not.toHaveBeenCalled();
    });

    it('POST /routes/start blocks starting a route for a unit outside owner scope', async () => {
      // Unit ownerId is 99 (outside user's scope of [42])
      vi.mocked(db.execute).mockResolvedValueOnce([[{ ownerId: 99 }], []] as unknown as [
        RowDataPacket[],
        FieldPacket[]
      ]);

      const res = await app.inject({
        method: 'POST',
        url: '/v1/routes/start',
        headers: authHeader(scopedToken),
        payload: {
          unitId: 'foreign-unit-1',
          driverId: 101,
          startReading: 12000,
          fuelLevelStart: 80,
          destination: 'Some destination',
        },
      });

      expect(res.statusCode).toBe(403);
      expect(res.json().code).toBe('FORBIDDEN');
      expect(RouteService.startRoute).not.toHaveBeenCalled();
    });

    it('POST /routes/start allows starting a route for a unit inside owner scope', async () => {
      // Unit ownerId is 42 (inside user's scope of [42])
      vi.mocked(db.execute).mockResolvedValueOnce([[{ ownerId: 42 }], []] as unknown as [
        RowDataPacket[],
        FieldPacket[]
      ]);
      vi.mocked(RouteService.startRoute).mockResolvedValueOnce('mocked-route-uuid');

      const res = await app.inject({
        method: 'POST',
        url: '/v1/routes/start',
        headers: authHeader(scopedToken),
        payload: {
          unitId: 'owned-unit-1',
          driverId: 101,
          startReading: 12000,
          fuelLevelStart: 80,
          destination: 'Some destination',
        },
      });

      expect(res.statusCode).toBe(201);
      expect(RouteService.startRoute).toHaveBeenCalled();
    });

    it('PATCH /routes/:uuid/finish blocks finishing route outside owner scope', async () => {
      // Route's unit has ownerId 99
      vi.mocked(db.execute).mockResolvedValueOnce([[{ ownerId: 99 }], []] as unknown as [
        RowDataPacket[],
        FieldPacket[]
      ]);

      const res = await app.inject({
        method: 'PATCH',
        url: '/v1/routes/route-uuid-1/finish',
        headers: authHeader(scopedToken),
        payload: {
          endReading: 12100,
          fuelLevelEnd: 75,
        },
      });

      expect(res.statusCode).toBe(403);
      expect(RouteService.finishRoute).not.toHaveBeenCalled();
    });
  });

  describe('2. Finance Scoping & IDOR Prevention', () => {
    it('GET /finance/dashboard filters dashboard queries by owner scope', async () => {
      const KPI_ROW = [
        {
          totalEgresos: 0,
          totalLeaseRegistered: 0,
          totalMaintenance: 0,
          totalFuel: 0,
          totalInsurance: 0,
          totalTire: 0,
          totalFine: 0,
          totalRepair: 0,
          totalOther: 0,
        },
      ];
      const UNIT_COUNT_ROW = [{ unitCount: 0 }];
      vi.mocked(db.execute)
        // FC 067 F4 — resolveFinanceClusterScope: Cúmulo gastos_egresos ACTIVE (T1 ⊤⊤) para owner 42
        .mockResolvedValueOnce([
          [{ ownerId: 42, ownerType: 'FLOTILLA', clusterActive: 1 }],
          [],
        ] as unknown as [RowDataPacket[], FieldPacket[]])
        .mockResolvedValueOnce([KPI_ROW, []] as unknown as [RowDataPacket[], FieldPacket[]])
        .mockResolvedValueOnce([UNIT_COUNT_ROW, []] as unknown as [RowDataPacket[], FieldPacket[]])
        .mockResolvedValueOnce([[], []] as unknown as [RowDataPacket[], FieldPacket[]])
        .mockResolvedValueOnce([[], []] as unknown as [RowDataPacket[], FieldPacket[]])
        .mockResolvedValueOnce([[], []] as unknown as [RowDataPacket[], FieldPacket[]]);

      const res = await app.inject({
        method: 'GET',
        url: '/v1/finance/dashboard',
        headers: authHeader(scopedToken),
      });

      expect(res.statusCode).toBe(200);
      expect(FleetService.getUserOwnerIds).toHaveBeenCalledWith(10);
      // It executes multiple queries, all filtered by ownerId
      vi.mocked(db.execute).mock.calls.forEach((call) => {
        const queryStr = call[0] as unknown as string;
        if (
          queryStr.includes('FROM financial_transactions') ||
          queryStr.includes('FROM fleet_units')
        ) {
          expect(queryStr).toContain('ownerId IN (?)');
        }
      });
    });

    it('POST /finance/transactions blocks creating transaction for unit outside owner scope', async () => {
      // Unit has ownerId 99
      vi.mocked(db.execute).mockResolvedValueOnce([
        [{ id: 'foreign-unit-2', ownerId: 99 }],
        [],
      ] as unknown as [RowDataPacket[], FieldPacket[]]);

      const res = await app.inject({
        method: 'POST',
        url: '/v1/finance/transactions',
        headers: authHeader(scopedToken),
        payload: {
          unitId: 'foreign-unit-2',
          category: 'FUEL',
          amount: 500,
        },
      });

      expect(res.statusCode).toBe(403);
      expect(res.json().code).toBe('FORBIDDEN');
    });

    it('POST /finance/transactions allows creating transaction for unit inside owner scope', async () => {
      // Unit has ownerId 42
      vi.mocked(db.execute)
        .mockResolvedValueOnce([[{ id: 'owned-unit-2', ownerId: 42 }], []] as unknown as [
          RowDataPacket[],
          FieldPacket[]
        ])
        // FC 067 F4 — resolveFinanceClusterScope: Cúmulo gastos_egresos ACTIVE (T1 ⊤⊤) para owner 42
        .mockResolvedValueOnce([
          [{ ownerId: 42, ownerType: 'FLOTILLA', clusterActive: 1 }],
          [],
        ] as unknown as [RowDataPacket[], FieldPacket[]]);

      const res = await app.inject({
        method: 'POST',
        url: '/v1/finance/transactions',
        headers: authHeader(scopedToken),
        payload: {
          unitId: 'owned-unit-2',
          category: 'FUEL',
          amount: 500,
        },
      });

      expect(res.statusCode).toBe(201);
    });
  });

  describe('3. User Directory Scoping & IDOR Prevention', () => {
    it('GET /users filters user directory to common owners', async () => {
      await app.inject({
        method: 'GET',
        url: '/v1/auth/users',
        headers: authHeader(scopedToken),
      });

      expect(FleetService.getUserOwnerIds).toHaveBeenCalledWith(10);
      const call = vi.mocked(db.execute).mock.calls[0];
      expect(call[0]).toContain(
        'JOIN user_owner_membership uom ON u.id = uom.user_id WHERE uom.owner_id IN (?)'
      );
      expect(call[1]).toEqual([42]);
    });

    it('PATCH /users/:id blocks user update if target does not share common owner', async () => {
      // Snapshot before returns a valid user
      mockConnection.execute.mockResolvedValueOnce([
        [{ id: 99, full_name: 'Foreign User' }],
        undefined,
      ]);
      // target user owner membership is ownerId 99 (caller is 42)
      mockConnection.execute.mockResolvedValueOnce([[{ owner_id: 99 }], undefined]);

      const res = await app.inject({
        method: 'PATCH',
        url: '/v1/auth/users/99',
        headers: authHeader(scopedToken),
        payload: {
          data: { fullName: 'Updated Name' },
          reason: 'Testing scoping block',
        },
      });

      expect(res.statusCode).toBe(403);
      expect(res.json().error).toBe('FORBIDDEN');
    });

    it('PATCH /users/:id allows user update if target shares common owner', async () => {
      // Snapshot before returns user
      mockConnection.execute.mockResolvedValueOnce([
        [{ id: 33, full_name: 'Co-owned User' }],
        undefined,
      ]);
      // target user owner membership is ownerId 42 (caller has 42)
      mockConnection.execute.mockResolvedValueOnce([[{ owner_id: 42 }], undefined]);
      // Snapshot after
      mockConnection.execute.mockResolvedValueOnce([
        [{ id: 33, full_name: 'Updated Co-owned User' }],
        undefined,
      ]);

      const res = await app.inject({
        method: 'PATCH',
        url: '/v1/auth/users/33',
        headers: authHeader(scopedToken),
        payload: {
          data: { fullName: 'Updated Name' },
          reason: 'Testing scoping allow',
        },
      });

      expect(res.statusCode).toBe(200);
    });

    it('DELETE /users/:id blocks user deletion if target does not share common owner', async () => {
      // Snapshot before
      mockConnection.execute.mockResolvedValueOnce([
        [{ id: 99, full_name: 'Foreign User' }],
        undefined,
      ]);
      // target user owner membership is ownerId 99
      mockConnection.execute.mockResolvedValueOnce([[{ owner_id: 99 }], undefined]);

      const res = await app.inject({
        method: 'DELETE',
        url: '/v1/auth/users/99',
        headers: authHeader(scopedToken),
        payload: {
          reason: 'Testing delete scoping block',
        },
      });

      expect(res.statusCode).toBe(403);
    });
  });
});
