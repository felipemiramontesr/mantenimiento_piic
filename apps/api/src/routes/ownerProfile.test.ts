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
 * Scenario AR-API-1: GET /catalogs/areas 401 sin sesión
 * Scenario AR-API-2: GET /catalogs/areas 200 lista correcta ordenada por id
 * Scenario AR-API-3: GET /catalogs/areas 500 en error de DB
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

  const makePatchConn = (): {
    beginTransaction: Mock;
    execute: Mock;
    commit: Mock;
    rollback: Mock;
    release: Mock;
  } => ({
    beginTransaction: vi.fn().mockResolvedValue(undefined),
    execute: vi.fn().mockResolvedValue([{ affectedRows: 1 }, undefined]),
    commit: vi.fn().mockResolvedValue(undefined),
    rollback: vi.fn().mockResolvedValue(undefined),
    release: vi.fn(),
  });

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
        .mockResolvedValueOnce([[PROFILE_ROW], undefined])
        .mockResolvedValueOnce([[], undefined]); // fetchEspecialidades → null

      const res = await app.inject({
        method: 'GET',
        url: '/v1/owners/me/profile',
        headers: auth(ownerToken),
      });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).data.rfc).toBe('TEST123456ABC');
    });

    it('returns 404 when ownerIds found but profile SELECT returns empty — Scenario OP-9', async () => {
      (db.execute as Mock)
        .mockResolvedValueOnce([[{ owner_id: OWNER_ID }], undefined]) // getCallerOwnerIds
        .mockResolvedValueOnce([[], undefined]); // profile SELECT → empty

      const res = await app.inject({
        method: 'GET',
        url: '/v1/owners/me/profile',
        headers: auth(ownerToken),
      });
      expect(res.statusCode).toBe(404);
      expect(JSON.parse(res.body).code).toBe('PROFILE_NOT_FOUND');
    });

    it('returns 500 PROFILE_FETCH_FAIL when DB throws on profile SELECT — Scenario OP-10', async () => {
      (db.execute as Mock)
        .mockResolvedValueOnce([[{ owner_id: OWNER_ID }], undefined]) // getCallerOwnerIds
        .mockRejectedValueOnce(new Error('DB crash')); // profile SELECT throws

      const res = await app.inject({
        method: 'GET',
        url: '/v1/owners/me/profile',
        headers: auth(ownerToken),
      });
      expect(res.statusCode).toBe(500);
      expect(JSON.parse(res.body).code).toBe('PROFILE_FETCH_FAIL');
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
        .mockResolvedValueOnce([[{ id: 1, owner_type: 'FLOTILLA' }], undefined]);

      const conn = makePatchConn();
      (db.getConnection as Mock).mockResolvedValueOnce(conn);

      const res = await app.inject({
        method: 'PATCH',
        url: '/v1/owners/me/profile',
        headers: auth(ownerToken),
        payload: { telefono: '3399999999' },
      });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).success).toBe(true);
    });

    it('returns 404 when profileRows empty inside try — Scenario OP-ME-404', async () => {
      (db.execute as Mock)
        .mockResolvedValueOnce([[{ owner_id: OWNER_ID }], undefined]) // getCallerOwnerIds
        .mockResolvedValueOnce([[], undefined]); // profileRows SELECT → empty → 404

      const res = await app.inject({
        method: 'PATCH',
        url: '/v1/owners/me/profile',
        headers: auth(ownerToken),
        payload: { telefono: '3311111111' },
      });
      expect(res.statusCode).toBe(404);
      expect(JSON.parse(res.body).code).toBe('PROFILE_NOT_FOUND');
    });

    it('returns 500 PROFILE_UPDATE_FAIL when conn.execute throws — Scenario OP-ME-500', async () => {
      (db.execute as Mock)
        .mockResolvedValueOnce([[{ owner_id: OWNER_ID }], undefined]) // getCallerOwnerIds
        .mockResolvedValueOnce([[{ id: 1, owner_type: 'CENTER' }], undefined]); // profileRows

      const conn = makePatchConn();
      (conn.execute as Mock).mockRejectedValueOnce(new Error('DB crash'));
      (db.getConnection as Mock).mockResolvedValueOnce(conn);

      const res = await app.inject({
        method: 'PATCH',
        url: '/v1/owners/me/profile',
        headers: auth(ownerToken),
        payload: { telefono: '3311111111' },
      });
      expect(res.statusCode).toBe(500);
      expect(JSON.parse(res.body).code).toBe('PROFILE_UPDATE_FAIL');
    });

    it('returns 200 with especialidades=null → covers applySpecialtiesUpdate codes=null branch — Scenario OP-ME-SPEC-NULL', async () => {
      (db.execute as Mock)
        .mockResolvedValueOnce([[{ owner_id: OWNER_ID }], undefined]) // getCallerOwnerIds
        .mockResolvedValueOnce([[{ id: 1, owner_type: 'CENTER' }], undefined]); // profileRows

      const conn = makePatchConn();
      (db.getConnection as Mock).mockResolvedValueOnce(conn);

      const res = await app.inject({
        method: 'PATCH',
        url: '/v1/owners/me/profile',
        headers: auth(ownerToken),
        payload: { especialidades: null },
      });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).success).toBe(true);
      const sqls = (conn.execute as Mock).mock.calls.map((c) => c[0] as string);
      expect(sqls.some((s) => s.includes('owner_specialties'))).toBe(true);
    });

    it('returns 400 MISSING_RFC cuando /me/profile intenta limpiar rfc con FLOTILLA — Scenario OP-16', async () => {
      (db.execute as Mock)
        .mockResolvedValueOnce([[{ owner_id: OWNER_ID }], undefined]) // getCallerOwnerIds
        .mockResolvedValueOnce([[{ id: 1, owner_type: 'FLOTILLA' }], undefined]); // profileRows

      const res = await app.inject({
        method: 'PATCH',
        url: '/v1/owners/me/profile',
        headers: auth(ownerToken),
        payload: { rfc: null },
      });
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body).code).toBe('MISSING_RFC');
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
        .mockResolvedValueOnce([[PROFILE_ROW], undefined])
        .mockResolvedValueOnce([[], undefined]); // fetchEspecialidades → null

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

    it('returns 500 PROFILE_FETCH_FAIL when DB throws on profile SELECT — Scenario OP-11', async () => {
      (db.execute as Mock)
        .mockResolvedValueOnce([[{ owner_id: OWNER_ID }], undefined]) // getCallerOwnerIds
        .mockRejectedValueOnce(new Error('DB crash')); // profile SELECT throws

      const res = await app.inject({
        method: 'GET',
        url: `/v1/owners/${OWNER_ID}/profile`,
        headers: auth(ownerToken),
      });
      expect(res.statusCode).toBe(500);
      expect(JSON.parse(res.body).code).toBe('PROFILE_FETCH_FAIL');
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
        .mockResolvedValueOnce([[{ id: 1, owner_type: 'FLOTILLA' }], undefined]);

      const conn = makePatchConn();
      (db.getConnection as Mock).mockResolvedValueOnce(conn);

      const res = await app.inject({
        method: 'PATCH',
        url: `/v1/owners/${OWNER_ID}/profile`,
        headers: auth(ownerToken),
        payload: { telefono: '3399999999', calle: 'Av. López Mateos' },
      });

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).success).toBe(true);

      const sqls = (conn.execute as Mock).mock.calls.map((c) => c[0] as string);
      expect(sqls.some((s) => s.includes('UPDATE owner_profiles SET'))).toBe(true);
    });

    it('returns 500 PROFILE_UPDATE_FAIL cuando conn.execute falla en transacción — Scenario PATCH-7', async () => {
      // adminToken → hasAdminAccess=true → skip getCallerOwnerIds
      // SELECT profileRows → found; conn.execute UPDATE → throws → rollback → outer 500
      (db.execute as Mock).mockResolvedValueOnce([[{ id: 1, owner_type: 'CENTER' }], undefined]);
      const conn = makePatchConn();
      (conn.execute as Mock).mockRejectedValueOnce(new Error('DB connection lost'));
      (db.getConnection as Mock).mockResolvedValueOnce(conn);

      const res = await app.inject({
        method: 'PATCH',
        url: `/v1/owners/${OWNER_ID}/profile`,
        headers: auth(adminToken),
        payload: { telefono: '3311111111' },
      });

      expect(res.statusCode).toBe(500);
      expect(JSON.parse(res.body).code).toBe('PROFILE_UPDATE_FAIL');
    });

    it('returns 400 INVALID_SPECIALTY_CODES for /:ownerId path — Scenario OP-13', async () => {
      (db.execute as Mock)
        .mockResolvedValueOnce([[{ owner_id: OWNER_ID }], undefined]) // getCallerOwnerIds
        .mockResolvedValueOnce([[{ cnt: 0 }], undefined]); // validateSpecialtyCodes → mismatch

      const res = await app.inject({
        method: 'PATCH',
        url: `/v1/owners/${OWNER_ID}/profile`,
        headers: auth(ownerToken),
        payload: { especialidades: ['INVALID'] },
      });

      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body).code).toBe('INVALID_SPECIALTY_CODES');
    });

    it('returns 400 MISSING_RFC when CENTER type tries to clear rfc with empty string — Scenario OP-15', async () => {
      (db.execute as Mock)
        .mockResolvedValueOnce([[{ owner_id: OWNER_ID }], undefined]) // getCallerOwnerIds
        .mockResolvedValueOnce([[{ id: 1, owner_type: 'CENTER' }], undefined]); // profileRows

      const res = await app.inject({
        method: 'PATCH',
        url: `/v1/owners/${OWNER_ID}/profile`,
        headers: auth(ownerToken),
        payload: { rfc: '' },
      });

      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body).code).toBe('MISSING_RFC');
    });

    it('returns 400 VALIDATION_ERROR con neighborhoodId negativo (lines 306-309) — Scenario OP-17', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/v1/owners/${OWNER_ID}/profile`,
        headers: auth(adminToken),
        payload: { neighborhoodId: -5 },
      });
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body).code).toBe('VALIDATION_ERROR');
    });
  });

  // ── GET /v1/catalogs/areas ────────────────────────────────────────────────

  describe('GET /v1/catalogs/areas', () => {
    it('returns 401 without session — Scenario AR-API-1', async () => {
      const res = await app.inject({ method: 'GET', url: '/v1/catalogs/areas' });
      expect(res.statusCode).toBe(401);
    });

    it('returns fleet area catalog list ordered by id — Scenario AR-API-2', async () => {
      (db.execute as Mock).mockResolvedValueOnce([
        [
          { code: 'ADMINISTRACION', label: 'Administración' },
          { code: 'FINANZAS', label: 'Finanzas' },
        ],
        undefined,
      ]);

      const res = await app.inject({
        method: 'GET',
        url: '/v1/catalogs/areas',
        headers: auth(ownerToken),
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data[0]).toHaveProperty('code');
      expect(body.data[0]).toHaveProperty('label');
    });

    it('returns 500 on DB error — Scenario AR-API-3', async () => {
      (db.execute as Mock).mockRejectedValueOnce(new Error('DB crash'));

      const res = await app.inject({
        method: 'GET',
        url: '/v1/catalogs/areas',
        headers: auth(ownerToken),
      });

      expect(res.statusCode).toBe(500);
      expect(JSON.parse(res.body).code).toBe('AREAS_FETCH_FAIL');
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

    it('returns 500 SPECIALTIES_FETCH_FAIL on DB error — Scenario SP-6', async () => {
      (db.execute as Mock).mockRejectedValueOnce(new Error('DB crash'));

      const res = await app.inject({
        method: 'GET',
        url: '/v1/catalogs/specialties',
        headers: auth(ownerToken),
      });

      expect(res.statusCode).toBe(500);
      expect(JSON.parse(res.body).code).toBe('SPECIALTIES_FETCH_FAIL');
    });
  });

  // ── PATCH especialidades ───────────────────────────────────────────────────

  describe('PATCH especialidades', () => {
    it('updates own profile with valid specialty codes — Scenario SP-3', async () => {
      (db.execute as Mock)
        .mockResolvedValueOnce([[{ owner_id: OWNER_ID }], undefined]) // getCallerOwnerIds
        .mockResolvedValueOnce([[{ cnt: 2 }], undefined]) // validateSpecialtyCodes
        .mockResolvedValueOnce([[{ id: 1, owner_type: 'CENTER' }], undefined]); // profileRow

      const conn = makePatchConn();
      (db.getConnection as Mock).mockResolvedValueOnce(conn);

      const res = await app.inject({
        method: 'PATCH',
        url: '/v1/owners/me/profile',
        headers: auth(ownerToken),
        payload: { especialidades: ['MOTOR', 'FRENOS'] },
      });

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).success).toBe(true);
      const sqls = (conn.execute as Mock).mock.calls.map((c) => c[0] as string);
      expect(sqls.some((s) => s.includes('owner_specialties'))).toBe(true);
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
        .mockResolvedValueOnce([[{ id: 1, owner_type: 'CENTER' }], undefined]); // profileRow

      const conn = makePatchConn();
      (db.getConnection as Mock).mockResolvedValueOnce(conn);

      const res = await app.inject({
        method: 'PATCH',
        url: `/v1/owners/${OWNER_ID}/profile`,
        headers: auth(ownerToken),
        payload: { especialidades: ['PINTURA'] },
      });

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).success).toBe(true);
      const sqls = (conn.execute as Mock).mock.calls.map((c) => c[0] as string);
      expect(sqls.some((s) => s.includes('owner_specialties'))).toBe(true);
    });
  });
});
