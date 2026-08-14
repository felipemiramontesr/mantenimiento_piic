/* eslint-disable */
// @ts-nocheck
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import buildApp from '../index';

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

const PATTERN_FIXTURE = {
  brand_id: 12,
  model_id: 34,
  make: 'NISSAN',
  model: 'NP300',
  year: 2021,
  failure_category: 'MAINTENANCE',
  occurrence_count: 6,
  affected_units: 2,
  avg_km_at_failure: 75000,
  km_std_dev: 5000,
  avg_cost_mxn: 4500.0,
  first_seen_at: '2025-07-01',
  confidence_score: '0.6667',
};

const REPAIR_FIXTURE = {
  ...PATTERN_FIXTURE,
  failure_category: 'REPAIR',
  affected_units: 2,
  confidence_score: '0.6667',
};

// ── Tests: PATTERNS-F-1..4 ────────────────────────────────────────────────────

// FC 082 F3c Cond.1 (Bravo) — enum scope 'suite'/'global' retirado (090_AN/093_AN):
// view_fleet_model_failure_patterns es inteligencia cross-tenant por diseño (sin
// columna tenant_id), y el default 'suite' ya se comportaba idéntico a 'global'
// sin exigir el permiso — se cierra exigiendo fleet:global siempre. globalToken
// (intelligence:recall:view + fleet:global) es el token del camino feliz ahora;
// viewToken (solo intelligence:recall:view) queda para probar el 403.
// FC158 T1 — renombrado desde recallsVim.test.ts (2026-08-13).
describe('GET /v1/recalls/internal-patterns (FC DataResilience FaseF)', () => {
  const app = buildApp();
  let adminToken: string;
  let viewToken: string;
  let globalToken: string;

  beforeAll(async () => {
    await app.ready();
    adminToken = app.jwt.sign({ id: 1, permissions: ['*'] });
    viewToken = app.jwt.sign({ id: 2, permissions: ['intelligence:recall:view'] });
    globalToken = app.jwt.sign({
      id: 3,
      permissions: ['intelligence:recall:view', 'fleet:global'],
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('PATTERNS-F-0: 401 sin token JWT', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/recalls/internal-patterns?make=NISSAN&model=NP300&year=2021',
    });
    expect(res.statusCode).toBe(401);
  });

  it('PATTERNS-F-1: 200 con ≥1 patrón MAINTENANCE (fleet:global)', async () => {
    const { default: db } = await import('../services/db');
    vi.mocked(db.execute)
      .mockResolvedValueOnce([[PATTERN_FIXTURE], undefined]) // view query
      .mockResolvedValueOnce([[{ cnt: 0 }], undefined]); // nhtsa check

    const res = await app.inject({
      method: 'GET',
      url: '/v1/recalls/internal-patterns?make=NISSAN&model=NP300&year=2021',
      headers: { authorization: `Bearer ${globalToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.count).toBeGreaterThanOrEqual(1);
    const maintenance = body.data.find((p: any) => p.failure_category === 'MAINTENANCE');
    expect(maintenance).toBeDefined();
  });

  it('PATTERNS-F-2: confidence_score = 0.6667 cuando 2 de 3 unidades mismo modelo con falla', async () => {
    const { default: db } = await import('../services/db');
    vi.mocked(db.execute)
      .mockResolvedValueOnce([[REPAIR_FIXTURE], undefined])
      .mockResolvedValueOnce([[{ cnt: 0 }], undefined]);

    const res = await app.inject({
      method: 'GET',
      url: '/v1/recalls/internal-patterns?make=NISSAN&model=NP300&year=2021',
      headers: { authorization: `Bearer ${globalToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    const pattern = body.data[0];
    expect(pattern.confidence_score).toBeCloseTo(0.6667, 3);
    expect(pattern.affected_units).toBe(2);
  });

  it('PATTERNS-F-3: 403 sin permiso fleet:global (solo intelligence:recall:view)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/recalls/internal-patterns?make=NISSAN&model=NP300&year=2021',
      headers: { authorization: `Bearer ${viewToken}` },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json()).toHaveProperty('error');
  });

  it('PATTERNS-F-3b: 200 con permiso fleet:global', async () => {
    const { default: db } = await import('../services/db');
    vi.mocked(db.execute)
      .mockResolvedValueOnce([[PATTERN_FIXTURE], undefined])
      .mockResolvedValueOnce([[{ cnt: 0 }], undefined]);

    const res = await app.inject({
      method: 'GET',
      url: '/v1/recalls/internal-patterns?make=NISSAN&model=NP300&year=2021',
      headers: { authorization: `Bearer ${globalToken}` },
    });
    expect(res.statusCode).toBe(200);
  });

  it('PATTERNS-F-3c: 200 con permiso wildcard (*)', async () => {
    const { default: db } = await import('../services/db');
    vi.mocked(db.execute)
      .mockResolvedValueOnce([[PATTERN_FIXTURE], undefined])
      .mockResolvedValueOnce([[{ cnt: 0 }], undefined]);

    const res = await app.inject({
      method: 'GET',
      url: '/v1/recalls/internal-patterns?make=NISSAN&model=NP300&year=2021',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(200);
  });

  it('PATTERNS-F-4: nhtsa_covered = true cuando recall existe en catalog_recalls', async () => {
    const { default: db } = await import('../services/db');
    vi.mocked(db.execute)
      .mockResolvedValueOnce([[PATTERN_FIXTURE], undefined])
      .mockResolvedValueOnce([[{ cnt: 3 }], undefined]); // 3 NHTSA recalls found

    const res = await app.inject({
      method: 'GET',
      url: '/v1/recalls/internal-patterns?make=NISSAN&model=NP300&year=2021',
      headers: { authorization: `Bearer ${globalToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data[0].nhtsa_covered).toBe(true);
  });

  it('PATTERNS-F-4b: nhtsa_covered = false cuando no hay recall en catalog_recalls', async () => {
    const { default: db } = await import('../services/db');
    vi.mocked(db.execute)
      .mockResolvedValueOnce([[PATTERN_FIXTURE], undefined])
      .mockResolvedValueOnce([[{ cnt: 0 }], undefined]);

    const res = await app.inject({
      method: 'GET',
      url: '/v1/recalls/internal-patterns?make=NISSAN&model=NP300&year=2021',
      headers: { authorization: `Bearer ${globalToken}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data[0].nhtsa_covered).toBe(false);
  });

  it('PATTERNS-F-5: signal_level SEÑAL cuando confidence_score >= 0.6', async () => {
    const { default: db } = await import('../services/db');
    vi.mocked(db.execute)
      .mockResolvedValueOnce([[{ ...PATTERN_FIXTURE, confidence_score: '0.7500' }], undefined])
      .mockResolvedValueOnce([[{ cnt: 0 }], undefined]);

    const res = await app.inject({
      method: 'GET',
      url: '/v1/recalls/internal-patterns?make=NISSAN&model=NP300&year=2021',
      headers: { authorization: `Bearer ${globalToken}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data[0].signal_level).toBe('SEÑAL');
  });

  it('PATTERNS-F-6: signal_level INVESTIGAR cuando 0.3 <= confidence_score < 0.6', async () => {
    const { default: db } = await import('../services/db');
    vi.mocked(db.execute)
      .mockResolvedValueOnce([[{ ...PATTERN_FIXTURE, confidence_score: '0.4000' }], undefined])
      .mockResolvedValueOnce([[{ cnt: 0 }], undefined]);

    const res = await app.inject({
      method: 'GET',
      url: '/v1/recalls/internal-patterns?make=NISSAN&model=NP300&year=2021',
      headers: { authorization: `Bearer ${globalToken}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data[0].signal_level).toBe('INVESTIGAR');
  });

  it('PATTERNS-F-7: 400 si falta make, model o year', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/recalls/internal-patterns?make=NISSAN',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(400);
  });

  it('PATTERNS-F-8: lista vacía cuando vista no retorna filas', async () => {
    const { default: db } = await import('../services/db');
    vi.mocked(db.execute)
      .mockResolvedValueOnce([[], undefined])
      .mockResolvedValueOnce([[{ cnt: 0 }], undefined]);

    const res = await app.inject({
      method: 'GET',
      url: '/v1/recalls/internal-patterns?make=TOYOTA&model=HILUX&year=2020',
      headers: { authorization: `Bearer ${globalToken}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data).toHaveLength(0);
    expect(res.json().count).toBe(0);
  });

  it('PATTERNS-F-9: signal_level DATOS_INSUFICIENTES cuando confidence_score < 0.3 (lines 19-20)', async () => {
    const { default: db } = await import('../services/db');
    vi.mocked(db.execute)
      .mockResolvedValueOnce([[{ ...PATTERN_FIXTURE, confidence_score: '0.2000' }], undefined])
      .mockResolvedValueOnce([[{ cnt: 0 }], undefined]);

    const res = await app.inject({
      method: 'GET',
      url: '/v1/recalls/internal-patterns?make=NISSAN&model=NP300&year=2021',
      headers: { authorization: `Bearer ${globalToken}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data[0].signal_level).toBe('DATOS_INSUFICIENTES');
  });

  it('PATTERNS-F-10: query ignora un parámetro scope residual del cliente (compat transicional)', async () => {
    const { default: db } = await import('../services/db');
    vi.mocked(db.execute)
      .mockResolvedValueOnce([[PATTERN_FIXTURE], undefined])
      .mockResolvedValueOnce([[{ cnt: 0 }], undefined]);

    const res = await app.inject({
      method: 'GET',
      url: '/v1/recalls/internal-patterns?make=NISSAN&model=NP300&year=2021&scope=suite',
      headers: { authorization: `Bearer ${globalToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.count).toBe(1);
  });
});
