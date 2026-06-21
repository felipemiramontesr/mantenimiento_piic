/* eslint-disable */
// @ts-nocheck
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import buildApp from '../index';
import FleetService from '../services/fleetService';
import AnomalyDetectionService from '../services/anomalyDetectionService';

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

vi.mock('../services/anomalyDetectionService', () => ({
  default: { compute: vi.fn() },
  computeZScore: vi.fn(),
  computeDeviationPct: vi.fn(),
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

const ANOMALY_MOVING_AVG = {
  ownerId: 9100,
  fleet_size: 5,
  algorithm: 'moving_avg' as const,
  unit_km_per_liter: 7.5,
  baseline_km_per_liter: 10.0,
  deviation_pct: -25,
  z_score: null,
  is_anomaly: true,
};

const ANOMALY_Z_SCORE = {
  ownerId: 9100,
  fleet_size: 12,
  algorithm: 'z_score' as const,
  unit_km_per_liter: 7.5,
  baseline_km_per_liter: null,
  deviation_pct: null,
  z_score: -2.1,
  is_anomaly: true,
};

// ── Tests: AD-INT-1..8 ───────────────────────────────────────────────────────

describe('GET /v1/fleet-units/:unitId/anomalies (FC-6 Fase 6B)', () => {
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
    vi.mocked(AnomalyDetectionService.compute).mockResolvedValue(ANOMALY_MOVING_AVG);
    vi.mocked(FleetService.getUserOwnerIds).mockResolvedValue([]);
  });

  it('AD-INT-1: 401 sin token JWT', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/fleet-units/ASM-001/anomalies' });
    expect(res.statusCode).toBe(401);
  });

  it('AD-INT-2: 200 con algoritmo moving_avg para flota pequeña (n < 10)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/fleet-units/ASM-001/anomalies',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.algorithm).toBe('moving_avg');
    expect(body.data.fleet_size).toBe(5);
    expect(body.data.deviation_pct).toBe(-25);
    expect(body.data.z_score).toBeNull();
    expect(body.data.is_anomaly).toBe(true);
  });

  it('AD-INT-3: 200 con algoritmo z_score para flota grande (n >= 10)', async () => {
    vi.mocked(AnomalyDetectionService.compute).mockResolvedValue(ANOMALY_Z_SCORE);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/fleet-units/FLEET-001/anomalies',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.algorithm).toBe('z_score');
    expect(body.data.fleet_size).toBe(12);
    expect(body.data.z_score).toBe(-2.1);
    expect(body.data.deviation_pct).toBeNull();
    expect(body.data.is_anomaly).toBe(true);
  });

  it('AD-INT-4: 200 con is_anomaly false cuando unidad opera con normalidad', async () => {
    vi.mocked(AnomalyDetectionService.compute).mockResolvedValue({
      ownerId: 9100,
      fleet_size: 5,
      algorithm: 'moving_avg',
      unit_km_per_liter: 9.8,
      baseline_km_per_liter: 10.0,
      deviation_pct: -2,
      z_score: null,
      is_anomaly: false,
    });
    const res = await app.inject({
      method: 'GET',
      url: '/v1/fleet-units/NORMAL-001/anomalies',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.is_anomaly).toBe(false);
  });

  it('AD-INT-5: 403 cuando usuario scoped accede a unidad de otro owner', async () => {
    vi.mocked(FleetService.getUserOwnerIds).mockResolvedValue([1111]);
    vi.mocked(AnomalyDetectionService.compute).mockResolvedValue({
      ...ANOMALY_MOVING_AVG,
      ownerId: 9100,
    });
    const res = await app.inject({
      method: 'GET',
      url: '/v1/fleet-units/UNIT-FOREIGN/anomalies',
      headers: { authorization: `Bearer ${scopedToken}` },
    });
    expect(res.statusCode).toBe(403);
  });

  it('AD-INT-6: 404 cuando la unidad no existe', async () => {
    vi.mocked(AnomalyDetectionService.compute).mockResolvedValue(null);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/fleet-units/NO-EXISTE/anomalies',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(404);
  });

  it('AD-INT-7: respuesta no expone ownerId interno', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/fleet-units/ASM-001/anomalies',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data).not.toHaveProperty('ownerId');
  });

  it('AD-INT-8: 403 inmediato cuando ownerScope está vacío', async () => {
    vi.mocked(FleetService.getUserOwnerIds).mockResolvedValue([]);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/fleet-units/ASM-001/anomalies',
      headers: { authorization: `Bearer ${scopedToken}` },
    });
    expect(res.statusCode).toBe(403);
    expect(vi.mocked(AnomalyDetectionService.compute)).not.toHaveBeenCalled();
  });
});
