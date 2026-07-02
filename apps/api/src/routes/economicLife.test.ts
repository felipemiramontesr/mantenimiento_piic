/* eslint-disable */
// @ts-nocheck
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import buildApp from '../index';
import FleetService from '../services/fleetService';
import EconomicLifeService from '../services/economicLifeService';

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

vi.mock('../services/economicLifeService', () => ({
  default: { compute: vi.fn() },
  computeResidualValue: vi.fn(),
  computeReplacementScore: vi.fn(),
  computeRecommendation: vi.fn(),
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

const EL_FULL = {
  ownerId: 9100,
  residual_value_mxn: 337_500,
  accumulated_tco: 45_000,
  replacement_score: 0.13,
  recommendation: 'KEEP' as const,
};

// ── Tests: EL-INT-1..7 ───────────────────────────────────────────────────────

describe('GET /v1/fleet-units/:unitId/economic-life (FC-6 Fase 6A)', () => {
  const app = buildApp();
  let adminToken: string;
  let scopedToken: string;

  beforeAll(async () => {
    await app.ready();
    adminToken = app.jwt.sign({ id: 1, permissions: ['*'] });
    scopedToken = app.jwt.sign({
      id: 2,
      permissions: ['intelligence:economic-life:view', 'fleet:scoped'],
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(EconomicLifeService.compute).mockResolvedValue(EL_FULL);
    vi.mocked(FleetService.getUserOwnerIds).mockResolvedValue([]);
  });

  it('EL-INT-1: 401 sin token JWT', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/fleet-units/ASM-001/economic-life' });
    expect(res.statusCode).toBe(401);
  });

  it('EL-INT-2: 200 con los 4 campos calculados correctamente', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/fleet-units/ASM-001/economic-life',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.residual_value_mxn).toBe(337_500);
    expect(body.data.accumulated_tco).toBe(45_000);
    expect(body.data.replacement_score).toBe(0.13);
    expect(body.data.recommendation).toBe('KEEP');
  });

  it('EL-INT-3: 200 con recommendation REPLACE cuando score >= 1.0', async () => {
    vi.mocked(EconomicLifeService.compute).mockResolvedValue({
      ownerId: 9100,
      residual_value_mxn: 90_000,
      accumulated_tco: 150_000,
      replacement_score: 1.67,
      recommendation: 'REPLACE',
    });
    const res = await app.inject({
      method: 'GET',
      url: '/v1/fleet-units/OLD-001/economic-life',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.recommendation).toBe('REPLACE');
    expect(res.json().data.replacement_score).toBeGreaterThanOrEqual(1.0);
  });

  it('EL-INT-4: 403 cuando usuario scoped accede a unidad de otro owner', async () => {
    vi.mocked(FleetService.getUserOwnerIds).mockResolvedValue([1111]);
    vi.mocked(EconomicLifeService.compute).mockResolvedValue({
      ...EL_FULL,
      ownerId: 9100, // NOT in ownerScope [1111]
    });
    const res = await app.inject({
      method: 'GET',
      url: '/v1/fleet-units/UNIT-FOREIGN/economic-life',
      headers: { authorization: `Bearer ${scopedToken}` },
    });
    expect(res.statusCode).toBe(403);
  });

  it('EL-INT-5: 404 cuando la unidad no existe', async () => {
    vi.mocked(EconomicLifeService.compute).mockResolvedValue(null);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/fleet-units/NO-EXISTE/economic-life',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(404);
  });

  it('EL-INT-6: respuesta no expone ownerId interno', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/fleet-units/ASM-001/economic-life',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data).not.toHaveProperty('ownerId');
  });

  it('EL-INT-7: 403 inmediato cuando ownerScope está vacío', async () => {
    vi.mocked(FleetService.getUserOwnerIds).mockResolvedValue([]);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/fleet-units/ASM-001/economic-life',
      headers: { authorization: `Bearer ${scopedToken}` },
    });
    expect(res.statusCode).toBe(403);
    expect(vi.mocked(EconomicLifeService.compute)).not.toHaveBeenCalled();
  });

  it('EL-INT-8: EconomicLifeService.compute throws → 500 (B50-52 catch block)', async () => {
    vi.mocked(EconomicLifeService.compute).mockRejectedValueOnce(new Error('DB error'));
    const res = await app.inject({
      method: 'GET',
      url: '/v1/fleet-units/ASM-001/economic-life',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(500);
    expect(res.json()).toHaveProperty('error', 'Internal error computing economic life');
  });
});
