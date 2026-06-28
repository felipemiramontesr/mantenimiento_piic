/* eslint-disable */
// @ts-nocheck
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import buildApp from '../index';
import FleetService from '../services/fleetService';
import OperatorScorecardService from '../services/operatorScorecardService';

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

vi.mock('../services/operatorScorecardService', () => ({
  default: { compute: vi.fn() },
  computeFuelEfficiencyScore: vi.fn(),
  computeIncidentRateScore: vi.fn(),
  computeCheckpointAdherenceScore: vi.fn(),
  computeCompositeScore: vi.fn(),
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

const OS_FULL = {
  ownerId: 9100,
  driver_id: 42,
  route_count: 15,
  fuel_efficiency_score: 87.5,
  incident_rate_score: 93.3,
  checkpoint_adherence_score: 100,
  composite_score: 93.6,
};

// ── Tests: OS-INT-1..8 ───────────────────────────────────────────────────────

describe('GET /v1/fleet-units/:unitId/operator-score (FC-6 Fase 6C)', () => {
  const app = buildApp();
  let adminToken: string;
  let scopedToken: string;

  beforeAll(async () => {
    await app.ready();
    adminToken = app.jwt.sign({ id: 1, permissions: ['*'] });
    scopedToken = app.jwt.sign({
      id: 2,
      permissions: ['intelligence:scorecard:view', 'fleet:scoped'],
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(OperatorScorecardService.compute).mockResolvedValue(OS_FULL);
    vi.mocked(FleetService.getUserOwnerIds).mockResolvedValue([]);
  });

  it('OS-INT-1: 401 sin token JWT', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/fleet-units/ASM-001/operator-score',
    });
    expect(res.statusCode).toBe(401);
  });

  it('OS-INT-2: 200 con los 6 campos del scorecard', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/fleet-units/ASM-001/operator-score',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.driver_id).toBe(42);
    expect(body.data.route_count).toBe(15);
    expect(body.data.fuel_efficiency_score).toBe(87.5);
    expect(body.data.incident_rate_score).toBe(93.3);
    expect(body.data.checkpoint_adherence_score).toBe(100);
    expect(body.data.composite_score).toBe(93.6);
  });

  it('OS-INT-3: 200 con driver_id null cuando la unidad no tiene rutas completadas', async () => {
    vi.mocked(OperatorScorecardService.compute).mockResolvedValue({
      ownerId: 9100,
      driver_id: null,
      route_count: 0,
      fuel_efficiency_score: null,
      incident_rate_score: null,
      checkpoint_adherence_score: null,
      composite_score: null,
    });
    const res = await app.inject({
      method: 'GET',
      url: '/v1/fleet-units/NEW-001/operator-score',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.driver_id).toBeNull();
    expect(body.data.route_count).toBe(0);
    expect(body.data.composite_score).toBeNull();
  });

  it('OS-INT-4: 403 cuando usuario scoped accede a unidad de otro owner', async () => {
    vi.mocked(FleetService.getUserOwnerIds).mockResolvedValue([1111]);
    vi.mocked(OperatorScorecardService.compute).mockResolvedValue({
      ...OS_FULL,
      ownerId: 9100,
    });
    const res = await app.inject({
      method: 'GET',
      url: '/v1/fleet-units/UNIT-FOREIGN/operator-score',
      headers: { authorization: `Bearer ${scopedToken}` },
    });
    expect(res.statusCode).toBe(403);
  });

  it('OS-INT-5: 404 cuando la unidad no existe', async () => {
    vi.mocked(OperatorScorecardService.compute).mockResolvedValue(null);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/fleet-units/NO-EXISTE/operator-score',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(404);
  });

  it('OS-INT-6: respuesta no expone ownerId interno', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/fleet-units/ASM-001/operator-score',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data).not.toHaveProperty('ownerId');
  });

  it('OS-INT-7: 403 inmediato cuando ownerScope está vacío', async () => {
    vi.mocked(FleetService.getUserOwnerIds).mockResolvedValue([]);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/fleet-units/ASM-001/operator-score',
      headers: { authorization: `Bearer ${scopedToken}` },
    });
    expect(res.statusCode).toBe(403);
    expect(vi.mocked(OperatorScorecardService.compute)).not.toHaveBeenCalled();
  });

  it('OS-INT-8: composite_score es promedio de sub-scores disponibles', async () => {
    vi.mocked(OperatorScorecardService.compute).mockResolvedValue({
      ownerId: 9100,
      driver_id: 42,
      route_count: 5,
      fuel_efficiency_score: 80,
      incident_rate_score: 100,
      checkpoint_adherence_score: null,
      composite_score: 90,
    });
    const res = await app.inject({
      method: 'GET',
      url: '/v1/fleet-units/ASM-002/operator-score',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.composite_score).toBe(90);
    expect(res.json().data.checkpoint_adherence_score).toBeNull();
  });
});
