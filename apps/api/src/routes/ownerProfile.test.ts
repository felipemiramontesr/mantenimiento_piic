import { describe, it, expect, vi, beforeEach, beforeAll, Mock } from 'vitest';
import buildApp from '../index';
import db from '../services/db';

/**
 * Archon Integration Test: Owner Profile — View & Edit + Specialties
 * Feature Contract: Archon_Master_Fase7_OwnerProfile_ViewEdit
 * Feature Contract: Archon_VIM_CentroSpecialties v2
 * Scenario GET-1: 401 sin sesión
 * Scenario GET-2: 403 owner ajeno sin admin
 * Scenario GET-3: 404 perfil inexistente
 * Scenario GET-4: 200 owner obtiene su propio perfil con address hydration
 * Scenario GET-5: 200 admin obtiene perfil de cualquier owner
 * Scenario PATCH-1: 401 sin sesión
 * Scenario PATCH-2: 403 owner ajeno
 * Scenario PATCH-3: 404 perfil inexistente en PATCH
 * Scenario PATCH-4: 400 MISSING_RFC — FLOTILLA intenta borrar rfc
 * Scenario PATCH-5: 400 NO_FIELDS_TO_UPDATE — body vacío
 * Scenario PATCH-6: 200 actualización exitosa — SQL UPDATE ejecutado
 * Scenario SP-1: GET /catalogs/specialties 401 sin sesión
 * Scenario SP-2: GET /catalogs/specialties 200 lista correcta
 * Scenario SP-3: PATCH /owners/me/profile con especialidades válidas — 200
 * Scenario SP-4: PATCH /owners/me/profile con códigos inválidos — 400 INVALID_SPECIALTY_CODES
 * Scenario SP-5: PATCH /owners/:id/profile con especialidades válidas — 200
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

const OWNER_ID = 50;

const PROFILE_ROW = {
  id: 1,
  ownerId: OWNER_ID,
  rfc: 'TEST123456ABC',
  razonSocial: 'Flotillas SA',
  telefono: '3312345678',
  especialidades: null,
  calle: 'Av. Reforma',
  numeroExt: '42',
  numeroInt: null,
  neighborhoodId: 300,
  neighborhoodName: 'Chapalita',
  postalCode: '44500',
  municipalityId: 120,
  municipalityName: 'Guadalajara',
  stateId: 14,
  stateName: 'Jalisco',
  ownerType: 'FLOTILLA',
};

describe('OwnerProfile Routes — View & Edit (Fase 7)', () => {
  const app = buildApp();
  let ownerToken: string;
  let adminToken: string;
  let otherToken: string;

  beforeAll(async () => {
    await app.ready();
    const { jwt } = app as unknown as { jwt: { sign: (_p: object) => string } };
    ownerToken = jwt.sign({
      id: 10,
      username: 'flotilla.uno',
      roleId: 1,
      roleName: 'Propietario Flotilla',
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
      username: 'otro.owner',
      roleId: 1,
      roleName: 'Propietario Flotilla',
      permissions: ['fleet:scoped'],
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();
    (db.execute as Mock).mockReset();
    (db.execute as Mock).mockResolvedValue([[], undefined]);
  });

  const auth = (token: string): Record<string, string> => ({ Authorization: `Bearer ${token}` });

  // ── GET /v1/owners/:ownerId/profile ────────────────────────────────────────

  // ── GET /v1/owners/me/profile ──────────────────────────────────────────────

  describe('GET /v1/owners/me/profile', () => {
    it('returns 401 without session', async () => {
      const res = await app.inject({ method: 'GET', url: '/v1/owners/me/profile' });
      expect(res.statusCode).toBe(401);
    });

    it('returns 404 when caller has no owner membership', async () => {
      (db.execute as Mock).mockResolvedValueOnce([[], undefined]);

      const res = await app.inject({
        method: 'GET',
        url: '/v1/owners/me/profile',
        headers: auth(ownerToken),
      });
      expect(res.statusCode).toBe(404);
      expect(JSON.parse(res.body).code).toBe('PROFILE_NOT_FOUND');
    });

    it('returns own profile resolved from JWT user id', async () => {
      (db.execute as Mock)
        .mockResolvedValueOnce([[{ owner_id: OWNER_ID }], undefined])
        .mockResolvedValueOnce([[PROFILE_ROW], undefined]);

      const res = await app.inject({
        method: 'GET',
        url: '/v1/owners/me/profile',
        headers: auth(ownerToken),
      });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).data.rfc).toBe('TEST123456ABC');
    });
  });

  // ── PATCH /v1/owners/me/profile ────────────────────────────────────────────

  describe('PATCH /v1/owners/me/profile', () => {
    it('returns 401 without session', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/v1/owners/me/profile',
        payload: { telefono: '3311111111' },
      });
      expect(res.statusCode).toBe(401);
    });

    it('returns 404 when caller has no owner membership', async () => {
      (db.execute as Mock).mockResolvedValueOnce([[], undefined]);

      const res = await app.inject({
        method: 'PATCH',
        url: '/v1/owners/me/profile',
        headers: auth(ownerToken),
        payload: { telefono: '3311111111' },
      });
      expect(res.statusCode).toBe(404);
    });

    it('updates own profile and returns 200', async () => {
      (db.execute as Mock)
        .mockResolvedValueOnce([[{ owner_id: OWNER_ID }], undefined])
        .mockResolvedValueOnce([[{ id: 1, owner_type: 'FLOTILLA' }], undefined])
        .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]);

      const res = await app.inject({
        method: 'PATCH',
        url: '/v1/owners/me/profile',
        headers: auth(ownerToken),
        payload: { telefono: '3399999999' },
      });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).success).toBe(true);
    });
  });

  // ── GET /v1/owners/:ownerId/profile ────────────────────────────────────────

  describe('GET /v1/owners/:ownerId/profile', () => {
    it('returns 401 without session — Scenario GET-1', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/v1/owners/${OWNER_ID}/profile`,
      });
      expect(res.statusCode).toBe(401);
    });

    it('returns 403 when caller does not own the profile — Scenario GET-2', async () => {
      (db.execute as Mock).mockResolvedValueOnce([[{ owner_id: 999 }], undefined]);

      const res = await app.inject({
        method: 'GET',
        url: `/v1/owners/${OWNER_ID}/profile`,
        headers: auth(otherToken),
      });
      expect(res.statusCode).toBe(403);
      expect(JSON.parse(res.body).code).toBe('FORBIDDEN');
    });

    it('returns 404 when profile does not exist — Scenario GET-3', async () => {
      (db.execute as Mock).mockResolvedValueOnce([[{ owner_id: OWNER_ID }], undefined]);
      (db.execute as Mock).mockResolvedValueOnce([[], undefined]);

      const res = await app.inject({
        method: 'GET',
        url: `/v1/owners/${OWNER_ID}/profile`,
        headers: auth(ownerToken),
      });
      expect(res.statusCode).toBe(404);
      expect(JSON.parse(res.body).code).toBe('PROFILE_NOT_FOUND');
    });

    it('returns profile with address data for owner — Scenario GET-4', async () => {
      (db.execute as Mock)
        .mockResolvedValueOnce([[{ owner_id: OWNER_ID }], undefined])
        .mockResolvedValueOnce([[PROFILE_ROW], undefined]);

      const res = await app.inject({
        method: 'GET',
        url: `/v1/owners/${OWNER_ID}/profile`,
        headers: auth(ownerToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.rfc).toBe('TEST123456ABC');
      expect(body.data.neighborhoodName).toBe('Chapalita');
      expect(body.data.stateName).toBe('Jalisco');
      expect(body.data.postalCode).toBe('44500');
    });

    it('admin can retrieve any owner profile — Scenario GET-5', async () => {
      (db.execute as Mock).mockResolvedValueOnce([[PROFILE_ROW], undefined]);

      const res = await app.inject({
        method: 'GET',
        url: `/v1/owners/${OWNER_ID}/profile`,
        headers: auth(adminToken),
      });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).data.ownerType).toBe('FLOTILLA');
    });
  });

  // ── PATCH /v1/owners/:ownerId/profile ─────────────────────────────────────

  describe('PATCH /v1/owners/:ownerId/profile', () => {
    it('returns 401 without session — Scenario PATCH-1', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/v1/owners/${OWNER_ID}/profile`,
        payload: { telefono: '3311111111' },
      });
      expect(res.statusCode).toBe(401);
    });

    it('returns 403 when caller does not own the profile — Scenario PATCH-2', async () => {
      (db.execute as Mock).mockResolvedValueOnce([[{ owner_id: 999 }], undefined]);

      const res = await app.inject({
        method: 'PATCH',
        url: `/v1/owners/${OWNER_ID}/profile`,
        headers: auth(otherToken),
        payload: { telefono: '3311111111' },
      });
      expect(res.statusCode).toBe(403);
    });

    it('returns 404 when profile does not exist — Scenario PATCH-3', async () => {
      (db.execute as Mock)
        .mockResolvedValueOnce([[{ owner_id: OWNER_ID }], undefined])
        .mockResolvedValueOnce([[], undefined]);

      const res = await app.inject({
        method: 'PATCH',
        url: `/v1/owners/${OWNER_ID}/profile`,
        headers: auth(ownerToken),
        payload: { telefono: '3311111111' },
      });
      expect(res.statusCode).toBe(404);
      expect(JSON.parse(res.body).code).toBe('PROFILE_NOT_FOUND');
    });

    it('returns 400 MISSING_RFC when FLOTILLA tries to clear rfc — Scenario PATCH-4', async () => {
      (db.execute as Mock)
        .mockResolvedValueOnce([[{ owner_id: OWNER_ID }], undefined])
        .mockResolvedValueOnce([[{ id: 1, owner_type: 'FLOTILLA' }], undefined]);

      const res = await app.inject({
        method: 'PATCH',
        url: `/v1/owners/${OWNER_ID}/profile`,
        headers: auth(ownerToken),
        payload: { rfc: null },
      });
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body).code).toBe('MISSING_RFC');
    });

    it('returns 400 NO_FIELDS_TO_UPDATE when body is empty — Scenario PATCH-5', async () => {
      (db.execute as Mock)
        .mockResolvedValueOnce([[{ owner_id: OWNER_ID }], undefined])
        .mockResolvedValueOnce([[{ id: 1, owner_type: 'FLOTILLA' }], undefined]);

      const res = await app.inject({
        method: 'PATCH',
        url: `/v1/owners/${OWNER_ID}/profile`,
        headers: auth(ownerToken),
        payload: {},
      });
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body).code).toBe('NO_FIELDS_TO_UPDATE');
    });

    it('updates profile and returns 200 — Scenario PATCH-6', async () => {
      (db.execute as Mock)
        .mockResolvedValueOnce([[{ owner_id: OWNER_ID }], undefined])
        .mockResolvedValueOnce([[{ id: 1, owner_type: 'FLOTILLA' }], undefined])
        .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]);

      const res = await app.inject({
        method: 'PATCH',
        url: `/v1/owners/${OWNER_ID}/profile`,
        headers: auth(ownerToken),
        payload: { telefono: '3399999999', calle: 'Av. López Mateos' },
      });

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).success).toBe(true);

      const sqls = (db.execute as Mock).mock.calls.map((c) => c[0] as string);
      expect(sqls.some((s) => s.includes('UPDATE owner_profiles SET'))).toBe(true);
    });
  });

  // ── GET /v1/catalogs/specialties ───────────────────────────────────────────

  describe('GET /v1/catalogs/specialties', () => {
    it('returns 401 without session — Scenario SP-1', async () => {
      const res = await app.inject({ method: 'GET', url: '/v1/catalogs/specialties' });
      expect(res.statusCode).toBe(401);
    });

    it('returns specialty catalog list — Scenario SP-2', async () => {
      (db.execute as Mock).mockResolvedValueOnce([
        [
          { code: 'FRENOS', label: 'Frenos' },
          { code: 'MOTOR', label: 'Motor' },
        ],
        undefined,
      ]);

      const res = await app.inject({
        method: 'GET',
        url: '/v1/catalogs/specialties',
        headers: auth(ownerToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data[0]).toHaveProperty('code');
      expect(body.data[0]).toHaveProperty('label');
    });
  });

  // ── PATCH especialidades ───────────────────────────────────────────────────

  describe('PATCH especialidades', () => {
    it('updates own profile with valid specialty codes — Scenario SP-3', async () => {
      (db.execute as Mock)
        .mockResolvedValueOnce([[{ owner_id: OWNER_ID }], undefined]) // getCallerOwnerIds
        .mockResolvedValueOnce([[{ cnt: 2 }], undefined]) // validateSpecialtyCodes
        .mockResolvedValueOnce([[{ id: 1, owner_type: 'CENTER' }], undefined]) // profileRow
        .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]); // UPDATE

      const res = await app.inject({
        method: 'PATCH',
        url: '/v1/owners/me/profile',
        headers: auth(ownerToken),
        payload: { especialidades: ['MOTOR', 'FRENOS'] },
      });

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).success).toBe(true);
      const sqls = (db.execute as Mock).mock.calls.map((c) => c[0] as string);
      expect(sqls.some((s) => s.includes('especialidades = ?'))).toBe(true);
    });

    it('rejects invalid specialty codes with 400 — Scenario SP-4', async () => {
      (db.execute as Mock)
        .mockResolvedValueOnce([[{ owner_id: OWNER_ID }], undefined]) // getCallerOwnerIds
        .mockResolvedValueOnce([[{ cnt: 0 }], undefined]); // validateSpecialtyCodes → mismatch

      const res = await app.inject({
        method: 'PATCH',
        url: '/v1/owners/me/profile',
        headers: auth(ownerToken),
        payload: { especialidades: ['INVALID_CODE'] },
      });

      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body).code).toBe('INVALID_SPECIALTY_CODES');
    });

    it('updates ownerId profile with valid specialty codes — Scenario SP-5', async () => {
      (db.execute as Mock)
        .mockResolvedValueOnce([[{ owner_id: OWNER_ID }], undefined]) // getCallerOwnerIds
        .mockResolvedValueOnce([[{ cnt: 1 }], undefined]) // validateSpecialtyCodes
        .mockResolvedValueOnce([[{ id: 1, owner_type: 'CENTER' }], undefined]) // profileRow
        .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]); // UPDATE

      const res = await app.inject({
        method: 'PATCH',
        url: `/v1/owners/${OWNER_ID}/profile`,
        headers: auth(ownerToken),
        payload: { especialidades: ['PINTURA'] },
      });

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).success).toBe(true);
    });
  });
});
