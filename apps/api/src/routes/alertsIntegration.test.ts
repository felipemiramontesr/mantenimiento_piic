/* eslint-disable */
// @ts-nocheck
import { describe, it, expect, vi, beforeAll, beforeEach, Mock } from 'vitest';
import buildApp from '../index';
import db from '../services/db';

vi.mock('../services/db', () => ({
  default: {
    execute: vi.fn().mockResolvedValue([[], undefined]),
    getConnection: vi.fn(() =>
      Promise.resolve({
        beginTransaction: vi.fn(),
        commit: vi.fn(),
        rollback: vi.fn(),
        release: vi.fn(),
        execute: vi.fn().mockResolvedValue([[], undefined]),
      })
    ),
  },
}));

vi.mock('../services/fleetService', () => ({
  default: {
    getAllUnits: vi.fn().mockResolvedValue([]),
    getUnitById: vi.fn().mockResolvedValue(null),
    createUnit: vi.fn().mockResolvedValue({ id: 'X' }),
    updateUnit: vi.fn().mockResolvedValue(true),
    deleteUnit: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock('../services/routeService', () => ({
  default: {
    startRoute: vi.fn().mockResolvedValue('uuid-1'),
    finishRoute: vi.fn().mockResolvedValue(undefined),
    reportIncident: vi.fn().mockResolvedValue(undefined),
    getIncidents: vi.fn().mockResolvedValue([]),
    getAllIncidents: vi.fn().mockResolvedValue([]),
    updateRoute: vi.fn().mockResolvedValue(undefined),
    deleteRoute: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../services/workOrderService', () => ({
  createWorkOrder: vi.fn(),
  previewWorkOrder: vi.fn(),
  updateTaskStatus: vi.fn(),
  closeWorkOrder: vi.fn(),
  getWorkOrder: vi.fn(),
  checkAndTimeoutStage5Orders: vi.fn().mockResolvedValue(0),
}));

describe('Alerts Routes — Integration', () => {
  const app = buildApp();
  let token: string;

  beforeAll(async () => {
    await app.ready();
    token = app.jwt.sign({
      id: 1,
      username: 'admin',
      roleId: 1,
      roleName: 'Director',
      permissions: ['*'],
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();
    (db.execute as Mock).mockResolvedValue([[], undefined]);
  });

  const auth = () => ({ authorization: `Bearer ${token}` });

  // ─── Auth Guard ─────────────────────────────────────────────────────────────

  it('returns 401 with no token', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/alerts/count' });
    expect(res.statusCode).toBe(401);
  });

  // ─── GET /v1/alerts/count ────────────────────────────────────────────────────

  describe('GET /v1/alerts/count', () => {
    it('returns 200 with correct total count', async () => {
      (db.execute as Mock)
        .mockResolvedValueOnce([[{ overdueCount: '3' }], undefined])
        .mockResolvedValueOnce([[{ incidentCount: '2' }], undefined])
        .mockResolvedValueOnce([[{ criticalCount: '1' }], undefined]);

      const res = await app.inject({
        method: 'GET',
        url: '/v1/alerts/count',
        headers: auth(),
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.count).toBe(6);
    });

    it('returns 200 with zero when all counts are 0', async () => {
      (db.execute as Mock)
        .mockResolvedValueOnce([[{ overdueCount: '0' }], undefined])
        .mockResolvedValueOnce([[{ incidentCount: '0' }], undefined])
        .mockResolvedValueOnce([[{ criticalCount: '0' }], undefined]);

      const res = await app.inject({
        method: 'GET',
        url: '/v1/alerts/count',
        headers: auth(),
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().count).toBe(0);
    });

    it('returns 500 on db error', async () => {
      (db.execute as Mock).mockRejectedValueOnce(new Error('DB down'));
      const res = await app.inject({
        method: 'GET',
        url: '/v1/alerts/count',
        headers: auth(),
      });
      expect(res.statusCode).toBe(500);
      expect(res.json().code).toBe('INTERNAL_ERROR');
    });
  });

  // ─── GET /v1/alerts ──────────────────────────────────────────────────────────

  describe('GET /v1/alerts', () => {
    it('returns 200 with empty alerts list when no data', async () => {
      (db.execute as Mock)
        .mockResolvedValueOnce([[], undefined])
        .mockResolvedValueOnce([[], undefined])
        .mockResolvedValueOnce([[], undefined]);

      const res = await app.inject({ method: 'GET', url: '/v1/alerts', headers: auth() });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.count).toBe(0);
      expect(body.data).toEqual([]);
    });

    it('returns MAINTENANCE_OVERDUE alert from overdueRows', async () => {
      const overdueRow = {
        id: 'ASM-001',
        odometer: 15000,
        nextServiceReading_forecast: 10000,
        lastServiceDate: null,
        maintIntervalDays: null,
      };
      (db.execute as Mock)
        .mockResolvedValueOnce([[overdueRow], undefined])
        .mockResolvedValueOnce([[], undefined])
        .mockResolvedValueOnce([[], undefined]);

      const res = await app.inject({ method: 'GET', url: '/v1/alerts', headers: auth() });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.count).toBe(1);
      expect(body.data[0].type).toBe('MAINTENANCE_OVERDUE');
      expect(body.data[0].id).toBe('MAINT_OVERDUE_ASM-001');
      expect(body.data[0].severity).toBe('CRITICAL');
    });

    it('returns INCIDENT_OPEN alert with Date reported_at', async () => {
      const incidentRow = {
        id: 99,
        category: 'COLLISION',
        description: 'Choque en cruce',
        reported_at: new Date('2026-06-01T10:00:00Z'),
        unit_id: 'ASM-002',
      };
      (db.execute as Mock)
        .mockResolvedValueOnce([[], undefined])
        .mockResolvedValueOnce([[incidentRow], undefined])
        .mockResolvedValueOnce([[], undefined]);

      const res = await app.inject({ method: 'GET', url: '/v1/alerts', headers: auth() });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.count).toBe(1);
      expect(body.data[0].type).toBe('INCIDENT_OPEN');
      expect(body.data[0].severity).toBe('CRITICAL');
      expect(body.data[0].unitId).toBe('ASM-002');
    });

    it('returns INCIDENT_OPEN alert with string reported_at', async () => {
      const incidentRow = {
        id: 100,
        category: 'THEFT',
        description: 'Robo de unidad',
        reported_at: '2026-06-02T12:00:00Z',
        unit_id: 'ASM-003',
      };
      (db.execute as Mock)
        .mockResolvedValueOnce([[], undefined])
        .mockResolvedValueOnce([[incidentRow], undefined])
        .mockResolvedValueOnce([[], undefined]);

      const res = await app.inject({ method: 'GET', url: '/v1/alerts', headers: auth() });
      expect(res.statusCode).toBe(200);
      expect(res.json().data[0].createdAt).toBe('2026-06-02T12:00:00Z');
    });

    it('returns UNIT_CRITICAL alert from criticalRows with Date start_at', async () => {
      const criticalRow = {
        uuid: 'crit-uuid',
        unit_id: 'ASM-004',
        start_at: new Date('2026-06-01T00:00:00Z'),
        hours_active: 72,
      };
      (db.execute as Mock)
        .mockResolvedValueOnce([[], undefined])
        .mockResolvedValueOnce([[], undefined])
        .mockResolvedValueOnce([[criticalRow], undefined]);

      const res = await app.inject({ method: 'GET', url: '/v1/alerts', headers: auth() });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.data[0].type).toBe('UNIT_CRITICAL');
      expect(body.data[0].id).toBe('UNIT_CRITICAL_ASM-004');
      expect(body.data[0].description).toContain('72h');
    });

    it('returns UNIT_CRITICAL alert with string start_at', async () => {
      const criticalRow = {
        uuid: 'crit-uuid-2',
        unit_id: 'ASM-005',
        start_at: '2026-06-01T00:00:00.000Z',
        hours_active: 96,
      };
      (db.execute as Mock)
        .mockResolvedValueOnce([[], undefined])
        .mockResolvedValueOnce([[], undefined])
        .mockResolvedValueOnce([[criticalRow], undefined]);

      const res = await app.inject({ method: 'GET', url: '/v1/alerts', headers: auth() });
      expect(res.statusCode).toBe(200);
      expect(res.json().data[0].createdAt).toBe('2026-06-01T00:00:00.000Z');
    });

    it('sorts two CRITICAL alerts with same severity by createdAt descending (line 258)', async () => {
      const incidentOlder = {
        id: 200,
        category: 'SINIESTRO',
        description: 'Colision trasera',
        reported_at: '2026-05-01T08:00:00Z',
        unit_id: 'ASM-030',
      };
      const incidentNewer = {
        id: 201,
        category: 'MECANICA',
        description: 'Falla motor',
        reported_at: '2026-06-01T08:00:00Z',
        unit_id: 'ASM-031',
      };
      (db.execute as Mock)
        .mockResolvedValueOnce([[], undefined])
        .mockResolvedValueOnce([[incidentOlder, incidentNewer], undefined])
        .mockResolvedValueOnce([[], undefined]);

      const res = await app.inject({ method: 'GET', url: '/v1/alerts', headers: auth() });
      expect(res.statusCode).toBe(200);
      const alerts = res.json().data;
      expect(alerts).toHaveLength(2);
      // Both CRITICAL → same severity → sorted by createdAt desc → newer first
      expect(alerts[0].unitId).toBe('ASM-031');
      expect(alerts[1].unitId).toBe('ASM-030');
    });

    it('sorts mixed alerts CRITICAL → HIGH → MEDIUM → LOW', async () => {
      const overdueRowLow = {
        id: 'ASM-010',
        odometer: 9000,
        nextServiceReading_forecast: 10000,
        lastServiceDate: null,
        maintIntervalDays: null,
      };
      const criticalRow = {
        uuid: 'crit-uuid-3',
        unit_id: 'ASM-011',
        start_at: '2026-06-01T00:00:00Z',
        hours_active: 100,
      };
      (db.execute as Mock)
        .mockResolvedValueOnce([[overdueRowLow], undefined])
        .mockResolvedValueOnce([[], undefined])
        .mockResolvedValueOnce([[criticalRow], undefined]);

      const res = await app.inject({ method: 'GET', url: '/v1/alerts', headers: auth() });
      expect(res.statusCode).toBe(200);
      const alerts = res.json().data;
      expect(alerts[0].severity).toBe('CRITICAL');
      expect(alerts[alerts.length - 1].severity).toBe('LOW');
    });

    it('returns 500 on db error', async () => {
      (db.execute as Mock).mockRejectedValueOnce(new Error('DB down'));
      const res = await app.inject({ method: 'GET', url: '/v1/alerts', headers: auth() });
      expect(res.statusCode).toBe(500);
      expect(res.json().code).toBe('INTERNAL_ERROR');
    });
  });

  // ─── Role-Scoped Alerts (Feature Contract: Alerts_Role_Scoped_Panel) ─────────

  describe('GET /v1/alerts — role-scoped', () => {
    const signWith = (permissions: string[]): string =>
      app.jwt.sign({ id: 2, username: 'scoped', roleId: 5, roleName: 'Scoped', permissions });

    const authWith = (permissions: string[]) => ({
      authorization: `Bearer ${signWith(permissions)}`,
    });

    const overdueRow = {
      id: 'ASM-101',
      odometer: 15000,
      nextServiceReading_forecast: 10000,
      lastServiceDate: null,
      maintIntervalDays: null,
    };
    const incidentRow = {
      id: 300,
      category: 'COLLISION',
      description: 'Choque lateral',
      reported_at: '2026-06-01T10:00:00Z',
      unit_id: 'ASM-102',
    };
    const criticalRow = {
      uuid: 'crit-uuid-9',
      unit_id: 'ASM-103',
      start_at: '2026-06-01T00:00:00Z',
      hours_active: 60,
    };

    it('Scenario 1: maint:view only receives only MAINTENANCE_OVERDUE and skips other queries', async () => {
      (db.execute as Mock).mockResolvedValueOnce([[overdueRow], undefined]);

      const res = await app.inject({
        method: 'GET',
        url: '/v1/alerts',
        headers: authWith(['maint:view']),
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.count).toBe(1);
      expect(body.data[0].type).toBe('MAINTENANCE_OVERDUE');
      expect(db.execute).toHaveBeenCalledTimes(1);
    });

    it('Scenario 2: empty permissions return 200 with empty data and zero queries', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/v1/alerts',
        headers: authWith([]),
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.count).toBe(0);
      expect(body.data).toEqual([]);
      expect(db.execute).not.toHaveBeenCalled();
    });

    it('Scenario 3: omnipotent * receives all three types', async () => {
      (db.execute as Mock)
        .mockResolvedValueOnce([[overdueRow], undefined])
        .mockResolvedValueOnce([[incidentRow], undefined])
        .mockResolvedValueOnce([[criticalRow], undefined]);

      const res = await app.inject({
        method: 'GET',
        url: '/v1/alerts',
        headers: authWith(['*']),
      });
      expect(res.statusCode).toBe(200);
      const types = res.json().data.map((a: { type: string }) => a.type);
      expect(types).toContain('MAINTENANCE_OVERDUE');
      expect(types).toContain('INCIDENT_OPEN');
      expect(types).toContain('UNIT_CRITICAL');
      expect(db.execute).toHaveBeenCalledTimes(3);
    });

    it('Scenario 4: maint:view + fleet:view receive their two types, never INCIDENT_OPEN', async () => {
      (db.execute as Mock)
        .mockResolvedValueOnce([[overdueRow], undefined])
        .mockResolvedValueOnce([[criticalRow], undefined]);

      const res = await app.inject({
        method: 'GET',
        url: '/v1/alerts',
        headers: authWith(['maint:view', 'fleet:view']),
      });
      expect(res.statusCode).toBe(200);
      const types = res.json().data.map((a: { type: string }) => a.type);
      expect(types).toContain('MAINTENANCE_OVERDUE');
      expect(types).toContain('UNIT_CRITICAL');
      expect(types).not.toContain('INCIDENT_OPEN');
      expect(db.execute).toHaveBeenCalledTimes(2);
    });
  });

  describe('GET /v1/alerts/count — role-scoped', () => {
    const authWith = (permissions: string[]) => ({
      authorization: `Bearer ${app.jwt.sign({
        id: 2,
        username: 'scoped',
        roleId: 5,
        roleName: 'Scoped',
        permissions,
      })}`,
    });

    it('Scenario 1: maint:view only counts MAINTENANCE_OVERDUE and skips other queries', async () => {
      (db.execute as Mock).mockResolvedValueOnce([[{ overdueCount: '4' }], undefined]);

      const res = await app.inject({
        method: 'GET',
        url: '/v1/alerts/count',
        headers: authWith(['maint:view']),
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().count).toBe(4);
      expect(db.execute).toHaveBeenCalledTimes(1);
    });

    it('Scenario 2: empty permissions return count 0 with zero queries', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/v1/alerts/count',
        headers: authWith([]),
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().count).toBe(0);
      expect(db.execute).not.toHaveBeenCalled();
    });
  });
});
