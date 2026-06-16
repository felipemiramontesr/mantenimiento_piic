import { describe, it, expect, vi, beforeEach, beforeAll, Mock } from 'vitest';
import buildApp from '../index';
import db from '../services/db';

/**
 * Archon Integration Test: Areas CRUD
 * Feature Contracts: Archon_Master_Fase2_Areas_y_SubUsuarios + Archon_Master_Fase3_VIM_Hierarchy
 * GET/POST /v1/owners/:id/areas · PUT/DELETE /v1/owners/:id/areas/:areaId · GET /v1/areas/templates
 * POST/PUT/DELETE restricted to Archon Master (isAdmin) per Scenarios 6/7.
 */

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

const OWNER_ID = 100;

describe('Areas Routes (Archon Master F2)', () => {
  const app = buildApp();
  let ownerToken: string;
  let adminToken: string;
  let otherToken: string;

  beforeAll(async () => {
    await app.ready();
    const { jwt } = app as unknown as { jwt: { sign: (_p: object) => string } };
    ownerToken = jwt.sign({
      id: 10,
      username: 'flotilla.owner',
      roleId: 1,
      roleName: 'Propietario de Flotilla',
      permissions: ['fleet:scoped', 'fleet:view'],
    });
    adminToken = jwt.sign({
      id: 1,
      username: 'admin',
      roleId: 7,
      roleName: 'Admin',
      permissions: ['user:admin'],
    });
    otherToken = jwt.sign({
      id: 99,
      username: 'other.owner',
      roleId: 1,
      roleName: 'Propietario de Flotilla',
      permissions: ['fleet:scoped', 'fleet:view'],
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();
    (db.execute as Mock).mockReset();
    (db.execute as Mock).mockResolvedValue([[], undefined]);
  });

  const auth = (token: string): Record<string, string> => ({ Authorization: `Bearer ${token}` });

  // ──────────────────────────────────────────────────────────────────────────
  describe('GET /v1/areas/templates', () => {
    it('returns 8 hardcoded templates without auth', async () => {
      const res = await app.inject({ method: 'GET', url: '/v1/areas/templates' });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(8);
      expect(body.data).toContain('Mantenimiento');
      expect(body.data).toContain('Finanzas');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  describe('GET /v1/owners/:id/areas', () => {
    it('returns 401 without session', async () => {
      const res = await app.inject({ method: 'GET', url: `/v1/owners/${OWNER_ID}/areas` });
      expect(res.statusCode).toBe(401);
    });

    it('returns 403 when caller does not own the owner', async () => {
      (db.execute as Mock).mockResolvedValueOnce([[{ owner_id: 999 }], undefined]); // other owner
      const res = await app.inject({
        method: 'GET',
        url: `/v1/owners/${OWNER_ID}/areas`,
        headers: auth(otherToken),
      });
      expect(res.statusCode).toBe(403);
    });

    it('returns areas for the owner', async () => {
      (db.execute as Mock)
        .mockResolvedValueOnce([[{ owner_id: OWNER_ID }], undefined]) // callerOwnerIds
        .mockResolvedValueOnce([
          [
            {
              id: 1,
              owner_id: OWNER_ID,
              name: 'Mantenimiento',
              is_active: 1,
              created_at: '2026-01-01',
            },
          ],
          undefined,
        ]);

      const res = await app.inject({
        method: 'GET',
        url: `/v1/owners/${OWNER_ID}/areas`,
        headers: auth(ownerToken),
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data[0].name).toBe('Mantenimiento');
    });

    it('allows admin to fetch any owner areas', async () => {
      (db.execute as Mock)
        .mockResolvedValueOnce([[{ owner_id: 999 }], undefined]) // admin owns different owner
        .mockResolvedValueOnce([
          [{ id: 2, owner_id: OWNER_ID, name: 'Finanzas', is_active: 1 }],
          undefined,
        ]);

      const res = await app.inject({
        method: 'GET',
        url: `/v1/owners/${OWNER_ID}/areas`,
        headers: auth(adminToken),
      });
      expect(res.statusCode).toBe(200);
    });

    it('returns 500 on db failure', async () => {
      (db.execute as Mock)
        .mockResolvedValueOnce([[{ owner_id: OWNER_ID }], undefined])
        .mockRejectedValueOnce(new Error('DB_FAIL'));
      const res = await app.inject({
        method: 'GET',
        url: `/v1/owners/${OWNER_ID}/areas`,
        headers: auth(ownerToken),
      });
      expect(res.statusCode).toBe(500);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  describe('POST /v1/owners/:id/areas', () => {
    it('returns 401 without session', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/v1/owners/${OWNER_ID}/areas`,
        payload: { name: 'Mantenimiento' },
      });
      expect(res.statusCode).toBe(401);
    });

    it('returns 400 for empty name', async () => {
      (db.execute as Mock).mockResolvedValueOnce([[{ owner_id: OWNER_ID }], undefined]);
      const res = await app.inject({
        method: 'POST',
        url: `/v1/owners/${OWNER_ID}/areas`,
        headers: auth(ownerToken),
        payload: { name: '' },
      });
      expect(res.statusCode).toBe(400);
    });

    // FC Fase3 — Scenario 6: Flotilla NO puede crear Área
    it('returns 403 FORBIDDEN for Rol 1 (Flotilla) caller — Scenario 6', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/v1/owners/${OWNER_ID}/areas`,
        headers: auth(ownerToken),
        payload: { name: 'Logística' },
      });
      expect(res.statusCode).toBe(403);
      const body = JSON.parse(res.body);
      expect(body.code).toBe('FORBIDDEN');
    });

    it('returns 403 for any non-admin caller', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/v1/owners/${OWNER_ID}/areas`,
        headers: auth(otherToken),
        payload: { name: 'Logística' },
      });
      expect(res.statusCode).toBe(403);
    });

    it('returns 400 when owner is not FLOTILLA type', async () => {
      (db.execute as Mock).mockResolvedValueOnce([[], undefined]); // owner type check → not FLOTILLA
      const res = await app.inject({
        method: 'POST',
        url: `/v1/owners/${OWNER_ID}/areas`,
        headers: auth(adminToken),
        payload: { name: 'Logística' },
      });
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body).error).toBe('INVALID_OWNER');
    });

    // FC Fase3 — Scenario 7: Archon Master SÍ puede crear Área
    it('creates an area for admin and returns 201 — Scenario 7', async () => {
      (db.execute as Mock)
        .mockResolvedValueOnce([[{ id: OWNER_ID }], undefined]) // FLOTILLA check
        .mockResolvedValueOnce([{ insertId: 7 }, undefined]);

      const res = await app.inject({
        method: 'POST',
        url: `/v1/owners/${OWNER_ID}/areas`,
        headers: auth(adminToken),
        payload: { name: 'Logística' },
      });
      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.id).toBe(7);
      expect(body.data.name).toBe('Logística');
    });

    it('returns 500 on db failure', async () => {
      (db.execute as Mock).mockRejectedValueOnce(new Error('DB_FAIL'));
      const res = await app.inject({
        method: 'POST',
        url: `/v1/owners/${OWNER_ID}/areas`,
        headers: auth(adminToken),
        payload: { name: 'Finanzas' },
      });
      expect(res.statusCode).toBe(500);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  describe('PUT /v1/owners/:id/areas/:areaId', () => {
    it('returns 401 without session', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: `/v1/owners/${OWNER_ID}/areas/5`,
        payload: { name: 'Nuevas Operaciones' },
      });
      expect(res.statusCode).toBe(401);
    });

    it('returns 400 for invalid payload', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: `/v1/owners/${OWNER_ID}/areas/5`,
        headers: auth(ownerToken),
        payload: { name: '' },
      });
      expect(res.statusCode).toBe(400);
    });

    it('returns 403 for non-admin caller', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: `/v1/owners/${OWNER_ID}/areas/5`,
        headers: auth(otherToken),
        payload: { name: 'Compras' },
      });
      expect(res.statusCode).toBe(403);
    });

    it('returns 403 for Rol 1 (Flotilla) caller', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: `/v1/owners/${OWNER_ID}/areas/5`,
        headers: auth(ownerToken),
        payload: { name: 'Compras' },
      });
      expect(res.statusCode).toBe(403);
      expect(JSON.parse(res.body).code).toBe('FORBIDDEN');
    });

    it('returns 404 when area not found', async () => {
      (db.execute as Mock).mockResolvedValueOnce([[], undefined]); // area not found
      const res = await app.inject({
        method: 'PUT',
        url: `/v1/owners/${OWNER_ID}/areas/999`,
        headers: auth(adminToken),
        payload: { name: 'Compras' },
      });
      expect(res.statusCode).toBe(404);
    });

    it('updates the area name', async () => {
      (db.execute as Mock)
        .mockResolvedValueOnce([[{ id: 5 }], undefined]) // area exists
        .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]); // update

      const res = await app.inject({
        method: 'PUT',
        url: `/v1/owners/${OWNER_ID}/areas/5`,
        headers: auth(adminToken),
        payload: { name: 'Compras Actualizadas' },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.name).toBe('Compras Actualizadas');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  describe('DELETE /v1/owners/:id/areas/:areaId', () => {
    it('returns 401 without session', async () => {
      const res = await app.inject({ method: 'DELETE', url: `/v1/owners/${OWNER_ID}/areas/5` });
      expect(res.statusCode).toBe(401);
    });

    it('returns 403 for non-admin caller', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/v1/owners/${OWNER_ID}/areas/5`,
        headers: auth(otherToken),
      });
      expect(res.statusCode).toBe(403);
    });

    it('returns 403 for Rol 1 (Flotilla) caller', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/v1/owners/${OWNER_ID}/areas/5`,
        headers: auth(ownerToken),
      });
      expect(res.statusCode).toBe(403);
      expect(JSON.parse(res.body).code).toBe('FORBIDDEN');
    });

    it('returns 404 when area not found', async () => {
      (db.execute as Mock).mockResolvedValueOnce([[], undefined]);
      const res = await app.inject({
        method: 'DELETE',
        url: `/v1/owners/${OWNER_ID}/areas/999`,
        headers: auth(adminToken),
      });
      expect(res.statusCode).toBe(404);
    });

    it('soft-deletes the area', async () => {
      (db.execute as Mock)
        .mockResolvedValueOnce([[{ id: 5 }], undefined])
        .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]);

      const res = await app.inject({
        method: 'DELETE',
        url: `/v1/owners/${OWNER_ID}/areas/5`,
        headers: auth(adminToken),
      });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).success).toBe(true);

      const sqls = (db.execute as Mock).mock.calls.map((c) => c[0] as string);
      expect(sqls.some((s) => s.includes('is_active = 0'))).toBe(true);
    });
  });
});
