/* eslint-disable */
// @ts-nocheck
import { describe, it, expect, vi, beforeAll } from 'vitest';
import buildApp from '../index';
import db from '../services/db';
import FleetService from '../services/fleetService';

vi.mock('../services/db', () => ({
  default: {
    query: vi.fn().mockResolvedValue([[], undefined]),
    execute: vi.fn().mockResolvedValue([[], undefined]),
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
    createUnit: vi.fn().mockResolvedValue({ id: 'X' }),
    updateUnit: vi.fn().mockResolvedValue(true),
    deleteUnit: vi.fn().mockResolvedValue(true),
    getUserOwnerIds: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../services/routeService', () => ({
  default: {
    startRoute: vi.fn().mockResolvedValue('uuid-1'),
    finishRoute: vi.fn().mockResolvedValue(undefined),
    reportIncident: vi.fn().mockResolvedValue(undefined),
    getIncidents: vi.fn().mockResolvedValue([]),
    getAllIncidents: vi.fn().mockResolvedValue([]),
    updateRoute: vi.fn().mockResolvedValue(undefined),
    deleteRoute: vi.fn().mockResolvedValue(undefined),
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

// FT-TCO-INT-1..2: HTTP-layer integration tests for /fleet-units/:unitId/tco (FC-3 Fase 3D)

describe('GET /v1/fleet-units/:unitId/tco — Integration (mocked DB)', () => {
  const app = buildApp();

  beforeAll(async () => {
    await app.ready();
  });

  it('FT-TCO-INT-1: 401 cuando no hay token JWT', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/fleet-units/PIIC-101/tco',
    });
    expect(res.statusCode).toBe(401);
  });

  it('FT-TCO-INT-2: 403 cuando usuario scoped sin owners (ownerScope = [])', async () => {
    const token = app.jwt.sign({
      id: 99,
      permissions: ['fleet:view', 'fleet:scoped'],
    });
    // db.query devuelve fila TCO con owner_id=9100 que NO está en ownerScope=[]
    (db.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      [
        {
          fleet_unit_id: 'PIIC-101',
          owner_id: 9100,
          suite: 'VIM',
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
        },
      ],
      undefined,
    ]);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/fleet-units/PIIC-101/tco',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(403);
  });
});
