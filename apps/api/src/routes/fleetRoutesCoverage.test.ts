/* eslint-disable */
// @ts-nocheck
import { describe, it, expect, vi, beforeAll, beforeEach, Mock } from 'vitest';
import buildApp from '../index';
import db from '../services/db';

vi.mock('../services/routeService', () => ({
  default: {
    startRoute: vi.fn().mockResolvedValue({}),
    finishRoute: vi.fn().mockResolvedValue({}),
    getActiveRoute: vi.fn().mockResolvedValue(null),
    reportIncident: vi.fn().mockResolvedValue({}),
    getIncidents: vi.fn().mockResolvedValue([]),
    getAllIncidents: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../services/db', () => ({
  default: {
    execute: vi.fn().mockResolvedValue([[], undefined]),
    query: vi.fn().mockResolvedValue([[], undefined]),
    getConnection: vi.fn(),
  },
}));

vi.mock('../services/notification.service', () => ({
  default: { dispatch: vi.fn().mockResolvedValue(undefined) },
  ArchonNotificationType: { MAINTENANCE_ALERT: 'MAINTENANCE_ALERT', SYSTEM: 'SYSTEM' },
  ArchonNotificationPriority: { HIGH: 'HIGH', MEDIUM: 'MEDIUM', CRITICAL: 'CRITICAL' },
}));

vi.mock('../services/encryption', () => ({
  default: {
    encrypt: vi.fn((v) => `enc_${v}`),
    decrypt: vi.fn((v) => (v && typeof v === 'string' ? v.replace('enc_', '') : v)),
    generateBlindIndex: vi.fn((v) => `hash_${v}`),
  },
}));

// ─── Shared app ───────────────────────────────────────────────────────────────

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

const auth = () => ({ Authorization: `Bearer ${token}` });

// ─── GET /routes/:uuid/node ───────────────────────────────────────────────────

describe('GET /routes/:uuid/node — Sovereign Route Node', () => {
  it('returns 404 when route not found', async () => {
    (db.execute as Mock).mockResolvedValueOnce([[], undefined]);

    const res = await app.inject({
      method: 'GET',
      url: '/v1/routes/GHOST-UUID/node',
      headers: auth(),
    });

    expect(res.statusCode).toBe(404);
    expect(res.json().message).toContain('Ruta no encontrada');
  });

  it('returns 200 with route and incidents', async () => {
    const routeRow = {
      id: 1,
      uuid: 'route-uuid-1',
      unit_id: 'ASM-001',
      status: 'COMPLETED',
      start_reading: 44000,
      end_reading: 44300,
      start_at: '2026-06-01T08:00:00Z',
      end_at: '2026-06-01T16:00:00Z',
      fuel_level_start: 80,
      fuel_level_end: 60,
      driver_name: 'Juan Pérez',
      unit_marca: 'Toyota',
      unit_modelo: 'Hilux',
      unit_year: 2022,
    };
    const incidentRows = [
      {
        id: 10,
        uuid: 'inc-1',
        category: 'COLLISION',
        severity: 'MEDIUM',
        status: 'OPEN',
        reported_at: '2026-06-01T10:00:00Z',
      },
    ];
    (db.execute as Mock)
      .mockResolvedValueOnce([[routeRow], undefined]) // routeRows
      .mockResolvedValueOnce([incidentRows, undefined]); // incidentRows

    const res = await app.inject({
      method: 'GET',
      url: '/v1/routes/route-uuid-1/node',
      headers: auth(),
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.route.uuid).toBe('route-uuid-1');
    expect(body.data.incidents).toHaveLength(1);
    expect(body.data.incidents[0].uuid).toBe('inc-1');
  });

  it('returns 500 on db.execute throw', async () => {
    (db.execute as Mock).mockRejectedValueOnce(new Error('DB down'));

    const res = await app.inject({
      method: 'GET',
      url: '/v1/routes/route-uuid-1/node',
      headers: auth(),
    });

    expect(res.statusCode).toBe(500);
    expect(res.json().message).toContain('Error al cargar nodo de ruta');
  });
});

// ─── GET /incidents/:uuid/node ────────────────────────────────────────────────

describe('GET /incidents/:uuid/node — Sovereign Incident Node', () => {
  it('returns 404 when incident not found', async () => {
    (db.execute as Mock).mockResolvedValueOnce([[], undefined]);

    const res = await app.inject({
      method: 'GET',
      url: '/v1/incidents/GHOST-INC/node',
      headers: auth(),
    });

    expect(res.statusCode).toBe(404);
    expect(res.json().message).toContain('Incidente no encontrado');
  });

  it('returns 200 with incident data', async () => {
    const incidentRow = {
      id: 5,
      uuid: 'inc-uuid-5',
      route_uuid: 'route-uuid-1',
      category: 'THEFT',
      description: 'Robo de herramienta',
      severity: 'HIGH',
      evidence_image: null,
      status: 'OPEN',
      reported_at: '2026-06-02T09:00:00Z',
      unit_id: 'ASM-002',
      driver_name: 'María López',
      unit_marca: 'Ford',
      unit_modelo: 'Ranger',
      unit_year: 2021,
    };
    (db.execute as Mock).mockResolvedValueOnce([[incidentRow], undefined]);

    const res = await app.inject({
      method: 'GET',
      url: '/v1/incidents/inc-uuid-5/node',
      headers: auth(),
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.uuid).toBe('inc-uuid-5');
    expect(body.data.category).toBe('THEFT');
    expect(body.data.driver_name).toBe('María López');
  });

  it('returns 500 on db.execute throw', async () => {
    (db.execute as Mock).mockRejectedValueOnce(new Error('DB down'));

    const res = await app.inject({
      method: 'GET',
      url: '/v1/incidents/inc-uuid-5/node',
      headers: auth(),
    });

    expect(res.statusCode).toBe(500);
    expect(res.json().message).toContain('Error al cargar nodo de incidente');
  });
});
