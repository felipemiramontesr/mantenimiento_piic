/* eslint-disable */
// @ts-nocheck
import { describe, it, expect, vi, beforeAll, beforeEach, type Mock } from 'vitest';
import buildApp from '../index';
import db from '../services/db';
import FleetService from '../services/fleetService';
import { buildTcoResponse } from './fleetTco';
import type { TcoRow } from './fleetTco';

vi.mock('../services/db', () => ({
  default: {
    execute: vi.fn().mockResolvedValue([[], undefined]),
    query: vi.fn().mockResolvedValue([[], undefined]),
    getConnection: vi.fn(),
  },
}));

vi.mock('../services/encryption', () => ({
  default: {
    encrypt: vi.fn((v: string) => `enc_${v}`),
    decrypt: vi.fn((v: string) => (v ? v.replace('enc_', '') : v)),
    generateBlindIndex: vi.fn((v: string) => `hash_${v}`),
  },
}));

vi.mock('../services/fleetService', () => ({
  default: { getUserOwnerIds: vi.fn().mockResolvedValue([]) },
}));

// FT-TCO-1..2: GET /fleet-units/:unitId/tco — pure helper unit tests (FC-3 Fase 3D)

const baseTcoRow: TcoRow = {
  fleet_unit_id: 'PIIC-101',
  owner_id: 9100,
  suite: 'VIM',
  tco_total: '4200.00',
  tco_maintenance: '1000.00',
  tco_insurance: '1200.00',
  tco_lease: '0.00',
  tco_tenencia: '3200.00',
  tco_verificacion: '500.00',
  tco_fuel: '800.00',
  tco_other: '0.00',
  total_records: '5',
  last_record_at: '2026-06-15T10:00:00.000Z',
};

describe('buildTcoResponse (FT-TCO-1..2)', () => {
  it('FT-TCO-1: convierte todos los campos DECIMAL a number y preserva fleet_unit_id y suite', () => {
    const result = buildTcoResponse(baseTcoRow);
    expect(result.fleet_unit_id).toBe('PIIC-101');
    expect(result.suite).toBe('VIM');
    expect(result.tco_total).toBe(4200);
    expect(result.tco_maintenance).toBe(1000);
    expect(result.tco_insurance).toBe(1200);
    expect(result.tco_tenencia).toBe(3200);
    expect(result.tco_verificacion).toBe(500);
    expect(result.tco_fuel).toBe(800);
    expect(result.tco_other).toBe(0);
    expect(result.total_records).toBe(5);
  });

  it('FT-TCO-2: maneja last_record_at null sin lanzar excepción', () => {
    const row: TcoRow = { ...baseTcoRow, last_record_at: null };
    const result = buildTcoResponse(row);
    expect(result.last_record_at).toBeNull();
  });

  it('FT-TCO-3: no incluye owner_id en la respuesta (no exponer FK interno)', () => {
    const result = buildTcoResponse(baseTcoRow);
    expect(result).not.toHaveProperty('owner_id');
  });

  it('FT-TCO-4: unidad sin transacciones devuelve tco_total = 0', () => {
    const emptyRow: TcoRow = {
      ...baseTcoRow,
      tco_total: '0.00',
      tco_maintenance: '0.00',
      tco_insurance: '0.00',
      tco_lease: '0.00',
      tco_tenencia: '0.00',
      tco_verificacion: '0.00',
      tco_fuel: '0.00',
      tco_other: '0.00',
      total_records: '0',
      last_record_at: null,
    };
    const result = buildTcoResponse(emptyRow);
    expect(result.tco_total).toBe(0);
    expect(result.total_records).toBe(0);
    expect(result.last_record_at).toBeNull();
  });
});

// ─── GET /v1/fleet-units/:unitId/tco — route integration tests ───────────────

describe('FT-TCO-ROUTE: GET /v1/fleet-units/:unitId/tco', () => {
  const app = buildApp();
  let adminToken: string;
  let scopedToken: string;

  const tcoRow: TcoRow = {
    fleet_unit_id: 'PIIC-101',
    owner_id: 9100,
    suite: 'VIM',
    tco_total: '4200.00',
    tco_maintenance: '1000.00',
    tco_insurance: '1200.00',
    tco_lease: '0.00',
    tco_tenencia: '3200.00',
    tco_verificacion: '500.00',
    tco_fuel: '800.00',
    tco_other: '0.00',
    total_records: '5',
    last_record_at: '2026-06-15T10:00:00.000Z',
  };

  beforeAll(async () => {
    await app.ready();
    const { jwt } = app as any;
    adminToken = jwt.sign({ id: 1, username: 'archon', roleId: 0, permissions: ['*'] });
    // scoped: tiene fleet:scoped → llama FleetService.getUserOwnerIds
    scopedToken = jwt.sign({
      id: 2,
      username: 'scoped',
      roleId: 1,
      permissions: ['fleet:scoped', 'intelligence:tco:view'],
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('FT-TCO-ROUTE-1: sin JWT → 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/fleet-units/PIIC-101/tco' });
    expect(res.statusCode).toBe(401);
  });

  it('FT-TCO-ROUTE-2: unidad no encontrada (0 rows) → 404', async () => {
    (db.query as Mock).mockResolvedValueOnce([[]]); // empty rows
    const res = await app.inject({
      method: 'GET',
      url: '/v1/fleet-units/PIIC-101/tco',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(404);
  });

  it('FT-TCO-ROUTE-3: admin no-scoped, unidad existe → 200 con TCO', async () => {
    (db.query as Mock).mockResolvedValueOnce([[tcoRow]]);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/fleet-units/PIIC-101/tco',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.tco_total).toBe(4200);
    expect(body.data.fleet_unit_id).toBe('PIIC-101');
  });

  it('FT-TCO-ROUTE-4: usuario scoped sin ownerIds → 403 (ownerScope=[]) ', async () => {
    // FleetService.getUserOwnerIds mocked to return [] globally
    (FleetService.getUserOwnerIds as Mock).mockResolvedValueOnce([]);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/fleet-units/PIIC-101/tco',
      headers: { authorization: `Bearer ${scopedToken}` },
    });
    expect(res.statusCode).toBe(403);
  });

  it('FT-TCO-ROUTE-5: usuario scoped, ownerScope=[5] pero unit.owner_id=9100 → 403', async () => {
    (FleetService.getUserOwnerIds as Mock).mockResolvedValueOnce([5]); // no incluye 9100
    (db.query as Mock).mockResolvedValueOnce([[tcoRow]]); // tcoRow.owner_id = 9100
    const res = await app.inject({
      method: 'GET',
      url: '/v1/fleet-units/PIIC-101/tco',
      headers: { authorization: `Bearer ${scopedToken}` },
    });
    expect(res.statusCode).toBe(403);
  });

  it('FT-TCO-ROUTE-6: db.query lanza error → 500 (B81-83 catch block)', async () => {
    (db.query as Mock).mockRejectedValueOnce(new Error('DB connection timeout'));
    const res = await app.inject({
      method: 'GET',
      url: '/v1/fleet-units/PIIC-101/tco',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(500);
    expect(res.json()).toHaveProperty('error', 'Internal error retrieving TCO');
  });
});
