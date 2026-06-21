/* eslint-disable */
// @ts-nocheck
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import buildApp from '../index';
import FleetService from '../services/fleetService';
import Co2Service from '../services/co2Service';

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

vi.mock('../services/co2Service', () => ({
  default: { compute: vi.fn() },
  computeCo2Kg: vi.fn(),
  resolveCo2Factor: vi.fn(),
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

const CO2_DIESEL = {
  ownerId: 9100,
  fuel_code: 'F_DIESEL',
  co2_factor_kg_per_liter: 2.68,
  total_liters: 350.5,
  total_co2_kg: 939.34,
  period_from: null,
  period_to: null,
};

// ── Tests: CO2-INT-1..8 ──────────────────────────────────────────────────────

describe('GET /v1/fleet-units/:unitId/co2 (FC-6 Fase 6D)', () => {
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
    vi.mocked(Co2Service.compute).mockResolvedValue(CO2_DIESEL);
    vi.mocked(FleetService.getUserOwnerIds).mockResolvedValue([]);
  });

  it('CO2-INT-1: 401 sin token JWT', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/fleet-units/ASM-001/co2' });
    expect(res.statusCode).toBe(401);
  });

  it('CO2-INT-2: 200 con datos CO2 sin período', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/fleet-units/ASM-001/co2',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.fuel_code).toBe('F_DIESEL');
    expect(body.data.co2_factor_kg_per_liter).toBe(2.68);
    expect(body.data.total_liters).toBe(350.5);
    expect(body.data.total_co2_kg).toBe(939.34);
    expect(body.data.period_from).toBeNull();
    expect(body.data.period_to).toBeNull();
  });

  it('CO2-INT-3: 200 pasando filtro de período por query params', async () => {
    vi.mocked(Co2Service.compute).mockResolvedValue({
      ...CO2_DIESEL,
      total_liters: 120,
      total_co2_kg: 321.6,
      period_from: '2026-01-01',
      period_to: '2026-03-31',
    });
    const res = await app.inject({
      method: 'GET',
      url: '/v1/fleet-units/ASM-001/co2?from=2026-01-01&to=2026-03-31',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.period_from).toBe('2026-01-01');
    expect(body.data.period_to).toBe('2026-03-31');
    expect(Co2Service.compute).toHaveBeenCalledWith('ASM-001', {
      from: '2026-01-01',
      to: '2026-03-31',
    });
  });

  it('CO2-INT-4: 200 con combustible gasolina y factor correcto', async () => {
    vi.mocked(Co2Service.compute).mockResolvedValue({
      ownerId: 9100,
      fuel_code: 'F_GAS',
      co2_factor_kg_per_liter: 2.31,
      total_liters: 200,
      total_co2_kg: 462,
      period_from: null,
      period_to: null,
    });
    const res = await app.inject({
      method: 'GET',
      url: '/v1/fleet-units/GAS-001/co2',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.fuel_code).toBe('F_GAS');
    expect(res.json().data.co2_factor_kg_per_liter).toBe(2.31);
  });

  it('CO2-INT-5: 403 cuando usuario scoped accede a unidad de otro owner', async () => {
    vi.mocked(FleetService.getUserOwnerIds).mockResolvedValue([1111]);
    vi.mocked(Co2Service.compute).mockResolvedValue({ ...CO2_DIESEL, ownerId: 9100 });
    const res = await app.inject({
      method: 'GET',
      url: '/v1/fleet-units/UNIT-FOREIGN/co2',
      headers: { authorization: `Bearer ${scopedToken}` },
    });
    expect(res.statusCode).toBe(403);
  });

  it('CO2-INT-6: 404 cuando la unidad no existe', async () => {
    vi.mocked(Co2Service.compute).mockResolvedValue(null);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/fleet-units/NO-EXISTE/co2',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(404);
  });

  it('CO2-INT-7: respuesta no expone ownerId interno', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/fleet-units/ASM-001/co2',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data).not.toHaveProperty('ownerId');
  });

  it('CO2-INT-8: 403 inmediato cuando ownerScope está vacío', async () => {
    vi.mocked(FleetService.getUserOwnerIds).mockResolvedValue([]);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/fleet-units/ASM-001/co2',
      headers: { authorization: `Bearer ${scopedToken}` },
    });
    expect(res.statusCode).toBe(403);
    expect(vi.mocked(Co2Service.compute)).not.toHaveBeenCalled();
  });
});
