import { describe, it, expect, vi, beforeEach, beforeAll, Mock } from 'vitest';
import buildApp from '../index';
import db from '../services/db';

/**
 * Archon Integration Test: ServiceCenters N:M Operational Links
 * Feature Contract: Archon_Master_Fase3_VIM_Hierarchy — Fase 4
 * Scenario 4: Privado vincula Centro operativo adicional (POST → 201)
 * Scenario 5: Privado elimina vínculo operativo (DELETE → 200)
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

const PRIVADO_ID = 200;
const CENTRO_ID = 300;

describe('ServiceCenters Routes — N:M Operational Links (Fase 4)', () => {
  const app = buildApp();
  let privadoToken: string;
  let adminToken: string;
  let otherToken: string;

  beforeAll(async () => {
    await app.ready();
    const { jwt } = app as unknown as { jwt: { sign: (_p: object) => string } };
    privadoToken = jwt.sign({
      id: 10,
      username: 'privado.uno',
      roleId: 4,
      roleName: 'Propietario Privado',
      permissions: ['fleet:scoped'],
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
      username: 'otro.privado',
      roleId: 4,
      roleName: 'Propietario Privado',
      permissions: ['fleet:scoped'],
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();
    (db.execute as Mock).mockReset();
    (db.execute as Mock).mockResolvedValue([[], undefined]);
  });

  const auth = (token: string): Record<string, string> => ({ Authorization: `Bearer ${token}` });

  // ──────────────────────────────────────────────────────────────────────────
  describe('GET /v1/owners/:privadoId/service-centers', () => {
    it('returns 401 without session', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/v1/owners/${PRIVADO_ID}/service-centers`,
      });
      expect(res.statusCode).toBe(401);
    });

    it('returns 403 when caller does not own privado', async () => {
      (db.execute as Mock).mockResolvedValueOnce([[{ owner_id: 999 }], undefined]);
      const res = await app.inject({
        method: 'GET',
        url: `/v1/owners/${PRIVADO_ID}/service-centers`,
        headers: auth(otherToken),
      });
      expect(res.statusCode).toBe(403);
    });

    it('returns list of service centers for privado owner', async () => {
      (db.execute as Mock)
        .mockResolvedValueOnce([[{ owner_id: PRIVADO_ID }], undefined])
        .mockResolvedValueOnce([[{ centro_owner_id: CENTRO_ID, label: 'Taller Uno' }], undefined]);

      const res = await app.inject({
        method: 'GET',
        url: `/v1/owners/${PRIVADO_ID}/service-centers`,
        headers: auth(privadoToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data[0].label).toBe('Taller Uno');
    });

    it('admin can list service centers of any privado', async () => {
      (db.execute as Mock).mockResolvedValueOnce([
        [{ centro_owner_id: CENTRO_ID, label: 'Taller Admin' }],
        undefined,
      ]);

      const res = await app.inject({
        method: 'GET',
        url: `/v1/owners/${PRIVADO_ID}/service-centers`,
        headers: auth(adminToken),
      });
      expect(res.statusCode).toBe(200);
    });

    it('returns 500 on db failure', async () => {
      (db.execute as Mock)
        .mockResolvedValueOnce([[{ owner_id: PRIVADO_ID }], undefined])
        .mockRejectedValueOnce(new Error('DB_FAIL'));

      const res = await app.inject({
        method: 'GET',
        url: `/v1/owners/${PRIVADO_ID}/service-centers`,
        headers: auth(privadoToken),
      });
      expect(res.statusCode).toBe(500);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  describe('POST /v1/owners/:privadoId/service-centers', () => {
    it('returns 401 without session', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/v1/owners/${PRIVADO_ID}/service-centers`,
        payload: { centroOwnerId: CENTRO_ID },
      });
      expect(res.statusCode).toBe(401);
    });

    it('returns 403 when caller does not own privado', async () => {
      (db.execute as Mock).mockResolvedValueOnce([[{ owner_id: 999 }], undefined]);

      const res = await app.inject({
        method: 'POST',
        url: `/v1/owners/${PRIVADO_ID}/service-centers`,
        headers: auth(otherToken),
        payload: { centroOwnerId: CENTRO_ID },
      });
      expect(res.statusCode).toBe(403);
    });

    it('returns 404 when centroOwnerId does not exist', async () => {
      (db.execute as Mock)
        .mockResolvedValueOnce([[{ owner_id: PRIVADO_ID }], undefined])
        .mockResolvedValueOnce([[], undefined]); // owners lookup → not found

      const res = await app.inject({
        method: 'POST',
        url: `/v1/owners/${PRIVADO_ID}/service-centers`,
        headers: auth(privadoToken),
        payload: { centroOwnerId: 9999 },
      });
      expect(res.statusCode).toBe(404);
      expect(JSON.parse(res.body).error).toBe('CENTRO_NOT_FOUND');
    });

    it('returns 400 when centroOwnerId is not CENTER type', async () => {
      (db.execute as Mock)
        .mockResolvedValueOnce([[{ owner_id: PRIVADO_ID }], undefined])
        .mockResolvedValueOnce([[{ id: 400, owner_type: 'FLOTILLA' }], undefined]);

      const res = await app.inject({
        method: 'POST',
        url: `/v1/owners/${PRIVADO_ID}/service-centers`,
        headers: auth(privadoToken),
        payload: { centroOwnerId: 400 },
      });
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body).error).toBe('NOT_A_CENTER');
    });

    it('returns 409 when link already exists', async () => {
      (db.execute as Mock)
        .mockResolvedValueOnce([[{ owner_id: PRIVADO_ID }], undefined])
        .mockResolvedValueOnce([[{ id: CENTRO_ID, owner_type: 'CENTER' }], undefined])
        .mockResolvedValueOnce([[{ id: 1 }], undefined]); // existing link

      const res = await app.inject({
        method: 'POST',
        url: `/v1/owners/${PRIVADO_ID}/service-centers`,
        headers: auth(privadoToken),
        payload: { centroOwnerId: CENTRO_ID },
      });
      expect(res.statusCode).toBe(409);
      expect(JSON.parse(res.body).error).toBe('LINK_EXISTS');
    });

    it('creates N:M link and returns 201 — Scenario 4', async () => {
      (db.execute as Mock)
        .mockResolvedValueOnce([[{ owner_id: PRIVADO_ID }], undefined])
        .mockResolvedValueOnce([[{ id: CENTRO_ID, owner_type: 'CENTER' }], undefined])
        .mockResolvedValueOnce([[], undefined]) // no duplicate
        .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]); // insert

      const res = await app.inject({
        method: 'POST',
        url: `/v1/owners/${PRIVADO_ID}/service-centers`,
        headers: auth(privadoToken),
        payload: { centroOwnerId: CENTRO_ID },
      });

      expect(res.statusCode).toBe(201);
      expect(JSON.parse(res.body).success).toBe(true);

      const sqls = (db.execute as Mock).mock.calls.map((c) => c[0] as string);
      expect(sqls.some((s) => s.includes('INSERT INTO owner_service_links'))).toBe(true);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  describe('DELETE /v1/owners/:privadoId/service-centers/:centroId', () => {
    it('returns 401 without session', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/v1/owners/${PRIVADO_ID}/service-centers/${CENTRO_ID}`,
      });
      expect(res.statusCode).toBe(401);
    });

    it('returns 403 when caller does not own privado', async () => {
      (db.execute as Mock).mockResolvedValueOnce([[{ owner_id: 999 }], undefined]);

      const res = await app.inject({
        method: 'DELETE',
        url: `/v1/owners/${PRIVADO_ID}/service-centers/${CENTRO_ID}`,
        headers: auth(otherToken),
      });
      expect(res.statusCode).toBe(403);
    });

    it('returns 404 when link does not exist', async () => {
      (db.execute as Mock)
        .mockResolvedValueOnce([[{ owner_id: PRIVADO_ID }], undefined])
        .mockResolvedValueOnce([[], undefined]); // link not found

      const res = await app.inject({
        method: 'DELETE',
        url: `/v1/owners/${PRIVADO_ID}/service-centers/${CENTRO_ID}`,
        headers: auth(privadoToken),
      });
      expect(res.statusCode).toBe(404);
      expect(JSON.parse(res.body).error).toBe('LINK_NOT_FOUND');
    });

    it('deletes link and returns 200 — Scenario 5', async () => {
      (db.execute as Mock)
        .mockResolvedValueOnce([[{ owner_id: PRIVADO_ID }], undefined])
        .mockResolvedValueOnce([[{ id: 1 }], undefined]) // link exists
        .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]); // delete

      const res = await app.inject({
        method: 'DELETE',
        url: `/v1/owners/${PRIVADO_ID}/service-centers/${CENTRO_ID}`,
        headers: auth(privadoToken),
      });

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).success).toBe(true);

      const sqls = (db.execute as Mock).mock.calls.map((c) => c[0] as string);
      expect(sqls.some((s) => s.includes('DELETE FROM owner_service_links'))).toBe(true);
    });
  });
});
