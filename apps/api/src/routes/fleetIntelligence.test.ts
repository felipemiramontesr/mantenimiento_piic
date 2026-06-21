/* eslint-disable */
// @ts-nocheck
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import buildApp from '../index';
import FleetService from '../services/fleetService';
import FleetIntelligenceKpiService from '../services/fleetIntelligenceService';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../services/db', () => ({
  default: {
    execute: vi.fn().mockResolvedValue([[], undefined]),
    query: vi.fn().mockResolvedValue([[], undefined]),
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
    getUserOwnerIds: vi.fn().mockResolvedValue([]),
    createUnit: vi.fn(),
    updateUnit: vi.fn(),
    deleteUnit: vi.fn(),
  },
}));

vi.mock('../services/fleetIntelligenceService', () => ({
  default: { compute: vi.fn() },
  computeOee: vi.fn(),
  computeTcoPerKm: vi.fn(),
}));

vi.mock('../services/routeService', () => ({
  default: {
    startRoute: vi.fn(),
    finishRoute: vi.fn(),
    reportIncident: vi.fn(),
    getIncidents: vi.fn(),
    getAllIncidents: vi.fn(),
    addCheckpoint: vi.fn(),
    getCheckpoints: vi.fn(),
    arriveAtCheckpoint: vi.fn(),
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

vi.mock('../services/notification.service', () => ({
  default: { dispatch: vi.fn().mockResolvedValue(undefined) },
  ArchonNotificationType: { MAINTENANCE_ALERT: 'MAINTENANCE_ALERT', SYSTEM: 'SYSTEM' },
  ArchonNotificationPriority: { HIGH: 'HIGH', MEDIUM: 'MEDIUM', CRITICAL: 'CRITICAL' },
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

const KPI_FULL = {
  ownerId: 9100,
  oee: 78.5,
  tco_per_km: 4.2,
  km_per_liter: 11.5,
  pm_compliance: 92.3,
  backlog_aging_days: 3.5,
};

// ── Tests: KPI-INT-1..5 ───────────────────────────────────────────────────────

describe('GET /v1/fleet-units/:unitId/intelligence (FC-5 Fase 5B)', () => {
  const app = buildApp();
  let adminToken: string;
  let scopedToken: string;

  beforeAll(async () => {
    await app.ready();
    adminToken = app.jwt.sign({ id: 1, permissions: ['*'] });
    scopedToken = app.jwt.sign({ id: 2, permissions: ['fleet:view', 'fleet:scoped'] });
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(FleetIntelligenceKpiService.compute).mockResolvedValue(KPI_FULL);
    vi.mocked(FleetService.getUserOwnerIds).mockResolvedValue([]);
  });

  it('KPI-INT-1: 401 sin token JWT', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/fleet-units/ASM-001/intelligence' });
    expect(res.statusCode).toBe(401);
  });

  it('KPI-INT-2: 200 con los 5 KPIs calculados correctamente', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/fleet-units/ASM-001/intelligence',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.oee).toBe(78.5);
    expect(body.data.tco_per_km).toBe(4.2);
    expect(body.data.km_per_liter).toBe(11.5);
    expect(body.data.pm_compliance).toBe(92.3);
    expect(body.data.backlog_aging_days).toBe(3.5);
    expect(body.data.oee).toBeGreaterThanOrEqual(0);
    expect(body.data.oee).toBeLessThanOrEqual(100);
  });

  it('KPI-INT-3: 200 con KPIs null cuando la unidad no tiene historial', async () => {
    vi.mocked(FleetIntelligenceKpiService.compute).mockResolvedValue({
      ownerId: 9100,
      oee: null,
      tco_per_km: null,
      km_per_liter: null,
      pm_compliance: null,
      backlog_aging_days: null,
    });
    const res = await app.inject({
      method: 'GET',
      url: '/v1/fleet-units/ASM-NEW/intelligence',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.oee).toBeNull();
    expect(body.data.tco_per_km).toBeNull();
    expect(body.data.km_per_liter).toBeNull();
    expect(body.data.pm_compliance).toBeNull();
    expect(body.data.backlog_aging_days).toBeNull();
  });

  it('KPI-INT-4: 403 cuando usuario scoped accede a unidad de otro owner', async () => {
    vi.mocked(FleetService.getUserOwnerIds).mockResolvedValue([1111]);
    vi.mocked(FleetIntelligenceKpiService.compute).mockResolvedValue({
      ...KPI_FULL,
      ownerId: 9100, // NOT in ownerScope [1111]
    });
    const res = await app.inject({
      method: 'GET',
      url: '/v1/fleet-units/UNIT-FOREIGN/intelligence',
      headers: { authorization: `Bearer ${scopedToken}` },
    });
    expect(res.statusCode).toBe(403);
  });

  it('KPI-INT-5: 404 cuando la unidad no existe', async () => {
    vi.mocked(FleetIntelligenceKpiService.compute).mockResolvedValue(null);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/fleet-units/NO-EXISTE/intelligence',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(404);
  });

  it('KPI-INT-6: respuesta no expone ownerId interno', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/fleet-units/ASM-001/intelligence',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data).not.toHaveProperty('ownerId');
  });

  it('KPI-INT-7: 403 inmediato cuando ownerScope está vacío', async () => {
    vi.mocked(FleetService.getUserOwnerIds).mockResolvedValue([]);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/fleet-units/ASM-001/intelligence',
      headers: { authorization: `Bearer ${scopedToken}` },
    });
    expect(res.statusCode).toBe(403);
    expect(vi.mocked(FleetIntelligenceKpiService.compute)).not.toHaveBeenCalled();
  });
});
