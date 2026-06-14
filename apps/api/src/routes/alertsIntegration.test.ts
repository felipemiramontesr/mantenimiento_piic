/* eslint-disable */
// @ts-nocheck
import { describe, it, expect, vi, beforeAll, beforeEach, Mock } from 'vitest';
import buildApp from '../index';
import db from '../services/db';
import FleetService from '../services/fleetService';

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
    getUserOwnerIds: vi.fn().mockResolvedValue([]),
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
    it('returns 200 with correct total count including compliance and finance', async () => {
      (db.execute as Mock)
        .mockResolvedValueOnce([[{ overdueCount: '3' }], undefined])
        .mockResolvedValueOnce([[{ incidentCount: '2' }], undefined])
        .mockResolvedValueOnce([[{ criticalCount: '1' }], undefined])
        .mockResolvedValueOnce([[{ complianceCount: '2' }], undefined])
        .mockResolvedValueOnce([[{ leaseMissingCount: '2' }], undefined])
        .mockResolvedValueOnce([[{ fineCount: '1' }], undefined])
        .mockResolvedValueOnce([[{ anomalyCount: '1' }], undefined]);

      const res = await app.inject({
        method: 'GET',
        url: '/v1/alerts/count',
        headers: auth(),
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.count).toBe(12);
    });

    it('returns 200 with zero when all counts are 0', async () => {
      (db.execute as Mock)
        .mockResolvedValueOnce([[{ overdueCount: '0' }], undefined])
        .mockResolvedValueOnce([[{ incidentCount: '0' }], undefined])
        .mockResolvedValueOnce([[{ criticalCount: '0' }], undefined])
        .mockResolvedValueOnce([[{ complianceCount: null }], undefined])
        .mockResolvedValueOnce([[{ leaseMissingCount: '0' }], undefined])
        .mockResolvedValueOnce([[{ fineCount: '0' }], undefined])
        .mockResolvedValueOnce([[{ anomalyCount: null }], undefined]);

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
    const complianceRow = {
      id: 'ASM-104',
      insuranceDays: -5,
      verificationDays: -10,
      legalDays: 8,
    };
    const leaseMissingRow = {
      id: 'ASM-106',
      monthlyLeasePayment: '11535.00',
      dayOfMonth: 25,
    };
    const fineRow = {
      id: 501,
      unit_id: 'ASM-107',
      amount: '2500.00',
      vendor: 'Tránsito ZAC',
      created_at: '2026-06-09T10:00:00.000Z',
    };
    const anomalyRow = {
      unit_id: 'ASM-108',
      currentTotal: '20000.00',
      prevTotal: '48000.00',
      prevPeriods: 6,
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

    it('Scenario 3: omnipotent * receives all seven types', async () => {
      (db.execute as Mock)
        .mockResolvedValueOnce([[overdueRow], undefined])
        .mockResolvedValueOnce([[incidentRow], undefined])
        .mockResolvedValueOnce([[criticalRow], undefined])
        .mockResolvedValueOnce([[complianceRow], undefined])
        .mockResolvedValueOnce([[leaseMissingRow], undefined])
        .mockResolvedValueOnce([[fineRow], undefined])
        .mockResolvedValueOnce([[anomalyRow], undefined]);

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
      expect(types).toContain('COMPLIANCE_EXPIRY');
      expect(types).toContain('LEASE_PAYMENT_MISSING');
      expect(types).toContain('FINE_REGISTERED');
      expect(types).toContain('EXPENSE_ANOMALY');
      expect(db.execute).toHaveBeenCalledTimes(7);
    });

    it('Scenario 4: maint:view + fleet:view receive their three types, never INCIDENT_OPEN', async () => {
      (db.execute as Mock)
        .mockResolvedValueOnce([[overdueRow], undefined])
        .mockResolvedValueOnce([[criticalRow], undefined])
        .mockResolvedValueOnce([[], undefined]);

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
      expect(db.execute).toHaveBeenCalledTimes(3);
    });

    // ─── Fase 4 — COMPLIANCE_EXPIRY ───────────────────────────────────────────

    it('Fase 4: fleet:view receives COMPLIANCE_EXPIRY alerts per expiring document', async () => {
      // ASM-105: seguro null (skip) + verificación a 45d fuera de ventana (skip) + legal vencido
      const compliancePartialRow = {
        id: 'ASM-105',
        insuranceDays: null,
        verificationDays: 45,
        legalDays: -1,
      };
      (db.execute as Mock)
        .mockResolvedValueOnce([[], undefined])
        .mockResolvedValueOnce([[complianceRow, compliancePartialRow], undefined]);

      const res = await app.inject({
        method: 'GET',
        url: '/v1/alerts',
        headers: authWith(['fleet:view']),
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      // ASM-104: seguro -5d, verificación -10d, legal 8d (3) · ASM-105: solo legal -1d (1) → 4
      expect(body.count).toBe(4);
      const insurance = body.data.find(
        (a: { id: string }) => a.id === 'COMPLIANCE_INSURANCE_ASM-104'
      );
      const verification = body.data.find(
        (a: { id: string }) => a.id === 'COMPLIANCE_VERIFICATION_ASM-104'
      );
      const legal = body.data.find((a: { id: string }) => a.id === 'COMPLIANCE_LEGAL_ASM-104');
      expect(insurance.type).toBe('COMPLIANCE_EXPIRY');
      expect(insurance.severity).toBe('CRITICAL');
      expect(insurance.description).toBe('Seguro vencido hace 5 días');
      expect(insurance.title).toBe('Documento vencido — ASM-104');
      expect(verification.severity).toBe('CRITICAL');
      expect(verification.description).toBe('Verificación vencida hace 10 días');
      expect(legal.severity).toBe('MEDIUM');
      expect(legal.description).toBe('Cumplimiento legal vence en 8 días');
      expect(legal.title).toBe('Cumplimiento por vencer — ASM-104');
      // ASM-105: insurance null y verificación 45d no generan alerta — solo legal vencido
      const partialIds = body.data
        .filter((a: { unitId: string }) => a.unitId === 'ASM-105')
        .map((a: { id: string }) => a.id);
      expect(partialIds).toEqual(['COMPLIANCE_LEGAL_ASM-105']);
      expect(db.execute).toHaveBeenCalledTimes(2);
    });

    it('Fase 4: maint:view-only never executes the compliance query', async () => {
      (db.execute as Mock).mockResolvedValueOnce([[overdueRow], undefined]);

      const res = await app.inject({
        method: 'GET',
        url: '/v1/alerts',
        headers: authWith(['maint:view']),
      });
      expect(res.statusCode).toBe(200);
      const types = res.json().data.map((a: { type: string }) => a.type);
      expect(types).not.toContain('COMPLIANCE_EXPIRY');
      expect(db.execute).toHaveBeenCalledTimes(1);
    });

    // ─── Contrato Alerts_Finance_Domain ───────────────────────────────────────

    it('Finanzas 1: financial:view receives only finance types with exactly 3 queries', async () => {
      (db.execute as Mock)
        .mockResolvedValueOnce([[leaseMissingRow], undefined])
        .mockResolvedValueOnce([[fineRow], undefined])
        .mockResolvedValueOnce([[anomalyRow], undefined]);

      const res = await app.inject({
        method: 'GET',
        url: '/v1/alerts',
        headers: authWith(['financial:view']),
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.count).toBe(3);
      const types = body.data.map((a: { type: string }) => a.type);
      expect(types).toContain('LEASE_PAYMENT_MISSING');
      expect(types).toContain('FINE_REGISTERED');
      expect(types).toContain('EXPENSE_ANOMALY');
      expect(types).not.toContain('MAINTENANCE_OVERDUE');
      expect(db.execute).toHaveBeenCalledTimes(3);
    });

    it('Finanzas 2: renta sin registrar el día 25 escala a HIGH con descripción es-MX', async () => {
      (db.execute as Mock)
        .mockResolvedValueOnce([[leaseMissingRow], undefined])
        .mockResolvedValueOnce([[], undefined])
        .mockResolvedValueOnce([[], undefined]);

      const res = await app.inject({
        method: 'GET',
        url: '/v1/alerts',
        headers: authWith(['financial:view']),
      });
      const alert = res.json().data[0];
      expect(alert.id).toBe('LEASE_MISSING_ASM-106');
      expect(alert.severity).toBe('HIGH');
      expect(alert.description).toBe('Renta de $11,535.00 sin registrar este mes (van 25 días)');
      expect(alert.title).toBe('Renta sin registrar — ASM-106');
    });

    it('Finanzas 3: multa reciente HIGH con monto y proveedor', async () => {
      (db.execute as Mock)
        .mockResolvedValueOnce([[], undefined])
        .mockResolvedValueOnce([[fineRow], undefined])
        .mockResolvedValueOnce([[], undefined]);

      const res = await app.inject({
        method: 'GET',
        url: '/v1/alerts',
        headers: authWith(['financial:view']),
      });
      const alert = res.json().data[0];
      expect(alert.id).toBe('FINE_501');
      expect(alert.type).toBe('FINE_REGISTERED');
      expect(alert.severity).toBe('HIGH');
      expect(alert.description).toBe('Multa registrada: $2,500.00 — Tránsito ZAC');
      expect(alert.unitId).toBe('ASM-107');
      expect(alert.createdAt).toBe('2026-06-09T10:00:00.000Z');
    });

    it('Finanzas 4: gasto anómalo 2.5× escala a HIGH con promedio semestral', async () => {
      (db.execute as Mock)
        .mockResolvedValueOnce([[], undefined])
        .mockResolvedValueOnce([[], undefined])
        .mockResolvedValueOnce([[anomalyRow], undefined]);

      const res = await app.inject({
        method: 'GET',
        url: '/v1/alerts',
        headers: authWith(['financial:view']),
      });
      const alert = res.json().data[0];
      expect(alert.id).toBe('EXPENSE_ANOMALY_ASM-108');
      expect(alert.severity).toBe('HIGH');
      expect(alert.description).toBe(
        'Gasto del mes $20,000.00 — 2.5× su promedio semestral ($8,000.00)'
      );
    });

    it('Finanzas 5: guard JS — historial corto, sin gasto previo o ratio bajo no generan alerta', async () => {
      const sparseRow = {
        unit_id: 'ASM-109',
        currentTotal: '9000.00',
        prevTotal: '4000.00',
        prevPeriods: 2,
      };
      const zeroHistoryRow = {
        unit_id: 'ASM-110',
        currentTotal: '9000.00',
        prevTotal: '0.00',
        prevPeriods: 4,
      };
      const lowRatioRow = {
        unit_id: 'ASM-111',
        currentTotal: '8000.00',
        prevTotal: '48000.00',
        prevPeriods: 6,
      };
      (db.execute as Mock)
        .mockResolvedValueOnce([[], undefined])
        .mockResolvedValueOnce([[], undefined])
        .mockResolvedValueOnce([[sparseRow, zeroHistoryRow, lowRatioRow], undefined]);

      const res = await app.inject({
        method: 'GET',
        url: '/v1/alerts',
        headers: authWith(['financial:view']),
      });
      expect(res.json().count).toBe(0);
    });

    it('Finanzas 3b: multa con created_at tipo Date serializa ISO', async () => {
      const fineDateRow = {
        id: 502,
        unit_id: 'ASM-112',
        amount: '1200.00',
        vendor: null,
        created_at: new Date('2026-06-10T08:00:00.000Z'),
      };
      (db.execute as Mock)
        .mockResolvedValueOnce([[], undefined])
        .mockResolvedValueOnce([[fineDateRow], undefined])
        .mockResolvedValueOnce([[], undefined]);

      const res = await app.inject({
        method: 'GET',
        url: '/v1/alerts',
        headers: authWith(['financial:view']),
      });
      const alert = res.json().data[0];
      expect(alert.createdAt).toBe('2026-06-10T08:00:00.000Z');
      expect(alert.description).toBe('Multa registrada: $1,200.00 — sin proveedor');
    });

    it('Finanzas 6: /alerts/count con financial:view ejecuta solo las 3 queries financieras', async () => {
      (db.execute as Mock)
        .mockResolvedValueOnce([[{ leaseMissingCount: '2' }], undefined])
        .mockResolvedValueOnce([[{ fineCount: '1' }], undefined])
        .mockResolvedValueOnce([[{ anomalyCount: '0' }], undefined]);

      const res = await app.inject({
        method: 'GET',
        url: '/v1/alerts/count',
        headers: authWith(['financial:view']),
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().count).toBe(3);
      expect(db.execute).toHaveBeenCalledTimes(3);
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

  // ─── Owner-Scoped MAINTENANCE_OVERDUE (Rol 9 — fleet:scoped) ─────────────────

  describe('GET /v1/alerts/count — fleet:scoped owner filter', () => {
    const scopedAuth = () => ({
      authorization: `Bearer ${app.jwt.sign({
        id: 42,
        username: 'cliente.externo',
        roleId: 9,
        roleName: 'Cliente Externo',
        permissions: ['fleet:scoped', 'fleet:view', 'maint:view', 'maint:write'],
      })}`,
    });

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('returns count 0 for overdue when user has no owned units (deny-by-default)', async () => {
      vi.mocked(FleetService.getUserOwnerIds).mockResolvedValueOnce([]);
      const res = await app.inject({
        method: 'GET',
        url: '/v1/alerts/count',
        headers: scopedAuth(),
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().count).toBe(0);
      expect(db.execute).not.toHaveBeenCalled();
    });

    it('returns filtered count when user has owned units', async () => {
      vi.mocked(FleetService.getUserOwnerIds).mockResolvedValueOnce([711]);
      (db.execute as Mock).mockResolvedValueOnce([[{ overdueCount: '2' }], undefined]);
      const res = await app.inject({
        method: 'GET',
        url: '/v1/alerts/count',
        headers: scopedAuth(),
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().count).toBe(2);
      expect(db.execute).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /v1/alerts — fleet:scoped owner filter', () => {
    const scopedAuth = () => ({
      authorization: `Bearer ${app.jwt.sign({
        id: 42,
        username: 'cliente.externo',
        roleId: 9,
        roleName: 'Cliente Externo',
        permissions: ['fleet:scoped', 'fleet:view', 'maint:view', 'maint:write'],
      })}`,
    });

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('returns empty data when user has no owned units (deny-by-default)', async () => {
      vi.mocked(FleetService.getUserOwnerIds).mockResolvedValueOnce([]);
      const res = await app.inject({
        method: 'GET',
        url: '/v1/alerts',
        headers: scopedAuth(),
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.data).toEqual([]);
      expect(body.count).toBe(0);
      expect(db.execute).not.toHaveBeenCalled();
    });

    it('returns scoped MAINTENANCE_OVERDUE when user has owned units', async () => {
      vi.mocked(FleetService.getUserOwnerIds).mockResolvedValueOnce([711]);
      const overdueRow = {
        id: 'ASM-001',
        odometer: 15000,
        nextServiceReading_forecast: 10000,
        lastServiceDate: null,
        maintIntervalDays: null,
      };
      (db.execute as Mock).mockResolvedValueOnce([[overdueRow], undefined]);
      const res = await app.inject({
        method: 'GET',
        url: '/v1/alerts',
        headers: scopedAuth(),
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.count).toBe(1);
      expect(body.data[0].type).toBe('MAINTENANCE_OVERDUE');
      expect(db.execute).toHaveBeenCalledTimes(1);
    });
  });
});
