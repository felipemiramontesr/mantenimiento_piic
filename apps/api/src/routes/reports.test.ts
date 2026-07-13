import { describe, it, expect, vi, beforeAll, beforeEach, Mock } from 'vitest';
import buildApp from '../index';
import db from '../services/db';

vi.mock('../services/db', () => ({
  default: {
    execute: vi.fn().mockResolvedValue([[], undefined]),
    query: vi.fn().mockResolvedValue([[], undefined]),
    getConnection: vi.fn(),
  },
}));

/**
 * 🔱 FC 041 Fase E — reports.ts (PDF backend)
 * Misma proyección anti-BOPLA del detalle, permiso real del módulo fuente,
 * cero campos PII en la consulta ni en el documento.
 */

const MOVEMENT_ROW = {
  id: 55,
  uuid: 'uuid-pdf-1',
  unit_id: 'PIIC-101',
  movement_status: 'CLOSED',
  service_date: '2026-07-01',
  odometer_at_service: 10000,
  odometer_at_close: 10010,
  service_type: 'BASIC_10K',
  service_mode: 'PREVENTIVE',
  cost: 1500,
  technician: 'Tec Uno',
  created_at: '2026-07-01',
};

describe('Reports Routes — GET /v1/reports/maintenance/:uuid/pdf', () => {
  const app = buildApp();
  let adminToken: string;
  let noPermToken: string;

  beforeAll(async (): Promise<void> => {
    await app.ready();
    adminToken = app.jwt.sign({
      id: 1,
      username: 'admin',
      roleId: 1,
      roleName: 'Director',
      permissions: ['*'],
    });
    noPermToken = app.jwt.sign({
      id: 2,
      username: 'viewer',
      roleId: 5,
      roleName: 'Viewer',
      permissions: ['fleet:view'],
    });
  });

  beforeEach((): void => {
    vi.clearAllMocks();
    (db.execute as Mock).mockResolvedValue([[], undefined]);
  });

  it('returns 401 without token', async (): Promise<void> => {
    const res = await app.inject({ method: 'GET', url: '/v1/reports/maintenance/x/pdf' });
    expect(res.statusCode).toBe(401);
  });

  it('returns 403 without maint:record:view:any permission', async (): Promise<void> => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/reports/maintenance/x/pdf',
      headers: { Authorization: `Bearer ${noPermToken}` },
    });
    expect(res.statusCode).toBe(403);
  });

  it('returns 404 for an unknown order', async (): Promise<void> => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/reports/maintenance/uuid-nope/pdf',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(404);
  });

  it('returns a real PDF with the anti-BOPLA projection (no PII queried)', async (): Promise<void> => {
    (db.execute as Mock)
      .mockResolvedValueOnce([[MOVEMENT_ROW], undefined])
      .mockResolvedValueOnce([
        [{ taskCode: 'OIL', status: 'DONE', label: 'Cambio de aceite', statusLabel: 'Completada' }],
        undefined,
      ]);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/reports/maintenance/uuid-pdf-1/pdf',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('application/pdf');
    expect(res.headers['content-disposition']).toContain('orden_uuid-pdf-1.pdf');
    expect(res.rawPayload.subarray(0, 5).toString()).toBe('%PDF-');
    // La consulta de la proyección jamás toca campos PII (§8.1)
    const firstSql = (db.execute as Mock).mock.calls[0][0] as string;
    ['placas', 'numero_serie', 'circulation'].forEach((pii) => {
      expect(firstSql.toLowerCase()).not.toContain(pii);
    });
  });

  it('applies fail-closed owner scoping for fleet:scoped users', async (): Promise<void> => {
    const scopedToken = app.jwt.sign({
      id: 3,
      username: 'scoped',
      roleId: 4,
      roleName: 'Gestor',
      permissions: ['maint:record:view:any', 'fleet:scoped'],
    });
    // Orden existe, pero el usuario no tiene owners vinculados → 404 fail-closed
    (db.execute as Mock)
      .mockResolvedValueOnce([[MOVEMENT_ROW], undefined]) // movimiento
      .mockResolvedValueOnce([[], undefined]); // getUserOwnerIds → sin owners
    const res = await app.inject({
      method: 'GET',
      url: '/v1/reports/maintenance/uuid-pdf-1/pdf',
      headers: { Authorization: `Bearer ${scopedToken}` },
    });
    expect(res.statusCode).toBe(404);
  });
});
