/* eslint-disable */
// @ts-nocheck
import { describe, it, expect, vi, beforeAll, beforeEach, Mock } from 'vitest';
import buildApp from '../index';
import db from '../services/db';

vi.mock('../services/fleetService', () => ({
  default: {
    getAllUnits: vi.fn().mockResolvedValue([]),
    getUnitById: vi.fn().mockResolvedValue(null),
    createUnit: vi.fn().mockResolvedValue({ id: 'X', uuid: 'u-x' }),
    updateUnit: vi.fn().mockResolvedValue(true),
    deleteUnit: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock('../services/db', () => ({
  default: {
    execute: vi.fn().mockResolvedValue([[], undefined]),
    query: vi.fn().mockResolvedValue([[], undefined]),
    getConnection: vi.fn(),
  },
}));

vi.mock('../services/encryption', () => ({
  default: {
    encrypt: vi.fn((v) => `enc_${v}`),
    decrypt: vi.fn((v) => (v && typeof v === 'string' ? v.replace('enc_', '') : v)),
    generateBlindIndex: vi.fn((v) => `hash_${v}`),
  },
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

import FleetService from '../services/fleetService';

const UNIT = {
  id: 'ASM-001',
  uuid: 'fleet-uuid-1',
  assetType: 'Vehículo',
  marca: 'Toyota',
  modelo: 'Hilux',
  year: 2022,
  odometer: 45000,
  maintIntervalKm: 10000,
  lastFuelLevel: 80,
  images: [],
};

// ─── GET /fleet/:id/node ──────────────────────────────────────────────────────

describe('GET /fleet/:id/node — Sovereign Node', () => {
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

  it('returns 404 when unit not found', async () => {
    vi.mocked(FleetService.getUnitById).mockResolvedValueOnce(null);

    const res = await app.inject({
      method: 'GET',
      url: '/v1/fleet/GHOST/node',
      headers: auth(),
    });

    expect(res.statusCode).toBe(404);
    expect(res.json().error).toContain('no encontrada');
  });

  it('returns 200 with empty maintenance, financial and incidents', async () => {
    vi.mocked(FleetService.getUnitById).mockResolvedValueOnce(UNIT);
    (db.execute as Mock)
      .mockResolvedValueOnce([[], undefined]) // maintenance rows
      .mockResolvedValueOnce([[], undefined]) // financial rows
      .mockResolvedValueOnce([[], undefined]); // incident rows

    const res = await app.inject({
      method: 'GET',
      url: '/v1/fleet/ASM-001/node',
      headers: auth(),
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.unit.id).toBe('ASM-001');
    expect(body.data.maintenance.recentHistory).toHaveLength(0);
    expect(body.data.financial.totalCost).toBe(0);
    expect(body.data.financial.byCategory).toEqual({});
    expect(body.data.incidents.recent).toHaveLength(0);
    expect(body.data.incidents.openCount).toBe(0);
  });

  it('returns 200 with financial data aggregated by category', async () => {
    vi.mocked(FleetService.getUnitById).mockResolvedValueOnce(UNIT);
    const financialRows = [
      { category: 'FUEL', total: '3500' },
      { category: 'MAINTENANCE', total: '12000' },
    ];
    (db.execute as Mock)
      .mockResolvedValueOnce([[], undefined]) // maintenance
      .mockResolvedValueOnce([financialRows, undefined]) // financial
      .mockResolvedValueOnce([[], undefined]); // incidents

    const res = await app.inject({
      method: 'GET',
      url: '/v1/fleet/ASM-001/node',
      headers: auth(),
    });

    expect(res.statusCode).toBe(200);
    const { financial } = res.json().data;
    expect(financial.totalCost).toBe(15500);
    expect(financial.byCategory.FUEL).toBe(3500);
    expect(financial.byCategory.MAINTENANCE).toBe(12000);
    expect(financial.year).toBe(new Date().getFullYear());
  });

  it('returns correct openCount for incidents with mixed statuses', async () => {
    vi.mocked(FleetService.getUnitById).mockResolvedValueOnce(UNIT);
    const incidentRows = [
      { id: 1, category: 'COLLISION', severity: 'HIGH', status: 'OPEN', reported_at: '2026-06-01' },
      {
        id: 2,
        category: 'THEFT',
        severity: 'CRITICAL',
        status: 'CLOSED',
        reported_at: '2026-05-01',
      },
      { id: 3, category: 'MECHANICAL', severity: 'LOW', status: 'OPEN', reported_at: '2026-04-01' },
    ];
    (db.execute as Mock)
      .mockResolvedValueOnce([[], undefined]) // maintenance
      .mockResolvedValueOnce([[], undefined]) // financial
      .mockResolvedValueOnce([incidentRows, undefined]); // incidents

    const res = await app.inject({
      method: 'GET',
      url: '/v1/fleet/ASM-001/node',
      headers: auth(),
    });

    expect(res.statusCode).toBe(200);
    const { incidents } = res.json().data;
    expect(incidents.recent).toHaveLength(3);
    expect(incidents.openCount).toBe(2);
  });

  it('returns 200 with full maintenance history and all data populated', async () => {
    vi.mocked(FleetService.getUnitById).mockResolvedValueOnce(UNIT);
    const maintRow = {
      uuid: 'maint-uuid-1',
      service_date: '2026-06-01',
      service_type: 'BASIC_10K',
      service_mode: 'WORKSHOP',
      cost: 800,
      technician: 'Tech A',
      odometer: 45000,
      end_reading: 45200,
      status: 'COMPLETED',
      start_at: '2026-06-01T08:00:00Z',
      end_at: '2026-06-01T12:00:00Z',
    };
    (db.execute as Mock)
      .mockResolvedValueOnce([[maintRow], undefined])
      .mockResolvedValueOnce([[{ category: 'MAINTENANCE', total: '800' }], undefined])
      .mockResolvedValueOnce([[], undefined]);

    const res = await app.inject({
      method: 'GET',
      url: '/v1/fleet/ASM-001/node',
      headers: auth(),
    });

    expect(res.statusCode).toBe(200);
    const { maintenance } = res.json().data;
    expect(maintenance.recentHistory).toHaveLength(1);
    expect(maintenance.recentHistory[0].service_type).toBe('BASIC_10K');
  });

  it('returns 500 when db.execute throws in Promise.all', async () => {
    vi.mocked(FleetService.getUnitById).mockResolvedValueOnce(UNIT);
    (db.execute as Mock).mockRejectedValueOnce(new Error('DB down'));

    const res = await app.inject({
      method: 'GET',
      url: '/v1/fleet/ASM-001/node',
      headers: auth(),
    });

    expect(res.statusCode).toBe(500);
    expect(res.json().error).toContain('Error al cargar nodo');
  });
});
