/* eslint-disable */
// @ts-nocheck
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
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

// ── NHTSA fetch mock ──────────────────────────────────────────────────────────

const NHTSA_MOCK_RESULTS = [
  {
    CampaignNumber: '19V648',
    NHTSAActionNumber: '19V-648',
    Subject: 'POWER TRAIN',
    Summary: 'Defect in transmission may cause unexpected rollaway.',
    Remedy: 'Dealers will inspect and replace.',
    Consequence: 'Vehicle may roll unexpectedly.',
    Component: 'POWER TRAIN:AUTOMATIC TRANSMISSION',
    Manufacturer: 'CHEVROLET',
  },
  {
    CampaignNumber: '21V201',
    NHTSAActionNumber: '21V-201',
    Subject: 'AIR BAGS',
    Summary: 'Airbag inflator may rupture.',
    Remedy: 'Dealers will replace inflator.',
    Consequence: 'Inflator rupture may cause injury.',
    Component: 'AIR BAGS',
    Manufacturer: 'CHEVROLET',
  },
];

function mockFetchOk(results = NHTSA_MOCK_RESULTS) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ Count: results.length, Message: 'OK', results }),
    })
  );
}

function mockFetchError() {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNABORTED')));
}

function mockFetchNonOk(status = 500) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status }));
}

// ── Tests: NHTSA-D-1..8 ──────────────────────────────────────────────────────

describe('GET /v1/recalls/nhtsa (FC DataResilience FaseD)', () => {
  const app = buildApp();
  let adminToken: string;
  let viewToken: string;

  beforeAll(async () => {
    await app.ready();
    adminToken = app.jwt.sign({ id: 1, permissions: ['*'] });
    viewToken = app.jwt.sign({ id: 2, permissions: ['intelligence:recall:view'] });
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('NHTSA-D-1: 401 sin token JWT', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/recalls/nhtsa?make=CHEVROLET&model=SILVERADO%201500&year=2019',
    });
    expect(res.statusCode).toBe(401);
  });

  it('NHTSA-D-2: 200 con array data y campaignNumber (búsqueda exitosa)', async () => {
    mockFetchOk();
    const res = await app.inject({
      method: 'GET',
      url: '/v1/recalls/nhtsa?make=CHEVROLET&model=SILVERADO%201500&year=2019',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data).toHaveLength(2);
    expect(body.data[0]).toHaveProperty('campaignNumber', '19V648');
    expect(body.count).toBe(2);
  });

  it('NHTSA-D-3: 400 si falta make, model o year', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/recalls/nhtsa?make=CHEVROLET',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(400);
  });

  it('NHTSA-D-4: 400 si year no es 4 dígitos', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/recalls/nhtsa?make=NISSAN&model=NP300&year=19',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(400);
  });

  it('NHTSA-D-5: 503 graceful degradation — NHTSA timeout (Fastify no crashea)', async () => {
    mockFetchError();
    const res = await app.inject({
      method: 'GET',
      url: '/v1/recalls/nhtsa?make=NISSAN&model=NP300&year=2021',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(503);
    expect(res.json()).toHaveProperty('error');
  });

  it('NHTSA-D-6: 503 cuando NHTSA devuelve status no-ok', async () => {
    mockFetchNonOk(502);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/recalls/nhtsa?make=NISSAN&model=NP300&year=2021',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(503);
  });

  it('NHTSA-D-7: data normalizada incluye subject, summary, remedy, consequence', async () => {
    mockFetchOk();
    const res = await app.inject({
      method: 'GET',
      url: '/v1/recalls/nhtsa?make=CHEVROLET&model=SILVERADO%201500&year=2019',
      headers: { authorization: `Bearer ${viewToken}` },
    });
    expect(res.statusCode).toBe(200);
    const item = res.json().data[0];
    expect(item).toHaveProperty('subject');
    expect(item).toHaveProperty('summary');
    expect(item).toHaveProperty('remedy');
    expect(item).toHaveProperty('consequence');
    expect(item).toHaveProperty('nhtsaActionNumber');
  });

  it('NHTSA-D-7b: json.results undefined → usa ?? [] → data=[] (line 82)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ Count: 0, Message: 'OK' }), // no results key → undefined
      })
    );
    const res = await app.inject({
      method: 'GET',
      url: '/v1/recalls/nhtsa?make=HONDA&model=CIVIC&year=2020',
      headers: { authorization: `Bearer ${viewToken}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data).toEqual([]);
    expect(res.json().count).toBe(0);
  });
});

describe('POST /v1/recalls/nhtsa/import (FC DataResilience FaseD)', () => {
  const app = buildApp();
  let adminToken: string;
  let viewOnlyToken: string;

  beforeAll(async () => {
    await app.ready();
    adminToken = app.jwt.sign({ id: 1, permissions: ['*'] });
    viewOnlyToken = app.jwt.sign({ id: 3, permissions: ['fleet:view'] });
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('NHTSA-D-8: 401 sin token JWT', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/recalls/nhtsa/import',
      payload: { campaignNumber: '19V648', make: 'CHEVROLET', model: 'SILVERADO 1500', year: 2019 },
    });
    expect(res.statusCode).toBe(401);
  });

  it('NHTSA-D-9: 403 sin fleet:write', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/recalls/nhtsa/import',
      headers: { authorization: `Bearer ${viewOnlyToken}` },
      payload: { campaignNumber: '19V648', make: 'CHEVROLET', model: 'SILVERADO 1500', year: 2019 },
    });
    expect(res.statusCode).toBe(403);
  });

  it('NHTSA-D-10: 400 si falta campaignNumber', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/recalls/nhtsa/import',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { make: 'CHEVROLET', model: 'SILVERADO 1500', year: 2019 },
    });
    expect(res.statusCode).toBe(400);
  });

  it('NHTSA-D-11: 201 importa nuevo recall', async () => {
    const { default: db } = await import('../services/db');
    vi.mocked(db.execute)
      .mockResolvedValueOnce([[], undefined]) // SELECT → no existe
      .mockResolvedValueOnce([{ insertId: 42 }, undefined]); // INSERT

    const res = await app.inject({
      method: 'POST',
      url: '/v1/recalls/nhtsa/import',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        campaignNumber: '19V648',
        make: 'CHEVROLET',
        model: 'SILVERADO 1500',
        year: 2019,
        description: 'Defect in transmission',
        publishedDate: '2019-10-01',
      },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.recall_id).toBe(42);
    expect(body.imported).toBe(true);
  });

  it('NHTSA-D-12: 200 import idempotente — devuelve recall_id existente sin error 409', async () => {
    const { default: db } = await import('../services/db');
    vi.mocked(db.execute).mockResolvedValueOnce([[{ id: 7 }], undefined]); // SELECT → existe

    const res = await app.inject({
      method: 'POST',
      url: '/v1/recalls/nhtsa/import',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { campaignNumber: 'DC-NP300-2021-A', make: 'NISSAN', model: 'NP300', year: 2021 },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.recall_id).toBe(7);
    expect(body.imported).toBe(false);
  });

  it('NHTSA-D-13: 201 sin description ni publishedDate → usa fallbacks ?? (lines 117-118)', async () => {
    const { default: db } = await import('../services/db');
    vi.mocked(db.execute)
      .mockResolvedValueOnce([[], undefined]) // SELECT → no existe
      .mockResolvedValueOnce([{ insertId: 99 }, undefined]); // INSERT con fallbacks

    const res = await app.inject({
      method: 'POST',
      url: '/v1/recalls/nhtsa/import',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { campaignNumber: '22V111', make: 'FORD', model: 'F-150', year: 2022 },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.recall_id).toBe(99);
    expect(body.imported).toBe(true);
  });
});
