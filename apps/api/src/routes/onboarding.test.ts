/* eslint-disable */
// @ts-nocheck
import { describe, it, expect, vi, beforeAll, beforeEach, Mock } from 'vitest';
import buildApp from '../index';
import db from '../services/db';
import FleetService from '../services/fleetService';

/**
 * Archon Integration Test: Onboarding — Multiverso Archon
 * Feature Contract: Archon_Master_MultiVerse_Onboarding · Fase 2
 *
 * UNI-1: 401 sin sesión → /onboarding/universe
 * UNI-2: 403 sin permiso Archon
 * UNI-3: 400 VALIDATION_ERROR body inválido
 * UNI-4: 400 MISSING_RFC
 * UNI-5: 409 CONFLICT username duplicado
 * UNI-6: 201 creación ERP (roleId=1) exitosa
 * UNI-7: 201 creación VIM (roleId=3) exitosa
 * UNI-8: 500 error de transacción → rollback
 *
 * CLI-1: 401 sin sesión → /onboarding/client
 * CLI-2: 403 rol ≠ 3
 * CLI-3: 400 OWNER_NOT_FOUND
 * CLI-4: 400 VALIDATION_ERROR targetOwnerId requerido para Familiar
 * CLI-5: 403 FORBIDDEN targetOwnerId fuera del universo (Anti-IDOR)
 * CLI-6: 409 CONFLICT
 * CLI-7: 201 creación P.Privado (roleId=4)
 * CLI-8: 201 creación Familiar (roleId=5)
 *
 * MEM-1: 401 sin sesión → /onboarding/member
 * MEM-2: 403 rol ≠ 1
 * MEM-3: 400 OWNER_NOT_FOUND
 * MEM-4: 409 CONFLICT
 * MEM-5: 201 creación Área (roleId=2)
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
    encrypt: vi.fn((v: string) => `enc_${v}`),
    decrypt: vi.fn((v: string) => (typeof v === 'string' ? v.replace('enc_', '') : v)),
    generateBlindIndex: vi.fn((v: string) => `hash_${v}`),
  },
}));

vi.mock('@node-rs/argon2', () => ({
  hash: vi.fn(() => Promise.resolve('hashed_pw')),
  verify: vi.fn(() => Promise.resolve(true)),
}));

vi.mock('../services/fleetService', () => ({
  default: {
    getUserOwnerIds: vi.fn().mockResolvedValue([10]),
    getAllUnits: vi.fn().mockResolvedValue([]),
    getUnitById: vi.fn().mockResolvedValue(null),
  },
}));

const VALID_PASSWORD = 'Archon123!@#';

const VALID_UNIVERSE_BODY = {
  username: 'piic.flotilla',
  email: 'piic@test.com',
  password: VALID_PASSWORD,
  roleId: 1,
  fullName: 'PIIC Flotilla',
  profile: { rfc: 'PIIC123456ABC', razon_social: 'PIIC SA de CV' },
};

const VALID_CLIENT_BODY = {
  username: 'juan.privado',
  email: 'juan@test.com',
  password: VALID_PASSWORD,
  roleId: 4,
  fullName: 'Juan Privado',
};

const VALID_MEMBER_BODY = {
  username: 'area.norte',
  email: 'norte@test.com',
  password: VALID_PASSWORD,
  fullName: 'Área Norte',
};

const makeConn = () => ({
  beginTransaction: vi.fn().mockResolvedValue(undefined),
  execute: vi
    .fn()
    .mockResolvedValueOnce([{ insertId: 100 }, undefined]) // INSERT users
    .mockResolvedValueOnce([[{ nextId: 200 }], undefined]) // SELECT MAX(id) common_catalogs
    .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]) // INSERT common_catalogs
    .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]) // INSERT owners
    .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]) // INSERT user_owner_membership
    .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]) // INSERT user_roles
    .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]), // INSERT owner_profiles
  commit: vi.fn().mockResolvedValue(undefined),
  rollback: vi.fn().mockResolvedValue(undefined),
  release: vi.fn(),
});

describe('Onboarding Routes — Multiverso Archon', () => {
  const app = buildApp();
  let archonToken: string;
  let centroToken: string;
  let flotillaToken: string;
  let areaToken: string;

  beforeAll(async () => {
    await app.ready();
    const { jwt } = app as unknown as { jwt: { sign: (_p: object) => string } };
    archonToken = jwt.sign({ id: 1, username: 'archon', roleId: 0, permissions: ['*'] });
    centroToken = jwt.sign({
      id: 2,
      username: 'centro',
      roleId: 3,
      permissions: ['user:admin', 'fleet:scoped'],
    });
    flotillaToken = jwt.sign({
      id: 3,
      username: 'flotilla',
      roleId: 1,
      permissions: ['user:admin', 'fleet:write'],
    });
    areaToken = jwt.sign({ id: 4, username: 'area', roleId: 2, permissions: ['fleet:view'] });
  });

  beforeEach(() => {
    vi.clearAllMocks();
    (db.execute as Mock).mockResolvedValue([[], undefined]);
    vi.mocked(FleetService.getUserOwnerIds).mockResolvedValue([10]);
  });

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  // ────────────────────────────────────────────────────────────────────────────
  // POST /v1/onboarding/universe
  // ────────────────────────────────────────────────────────────────────────────
  describe('POST /v1/onboarding/universe', () => {
    it('UNI-1: returns 401 without token', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/v1/onboarding/universe',
        payload: VALID_UNIVERSE_BODY,
      });
      expect(res.statusCode).toBe(401);
    });

    it('UNI-2: returns 403 when caller lacks Archon permission', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/v1/onboarding/universe',
        headers: auth(flotillaToken),
        payload: VALID_UNIVERSE_BODY,
      });
      expect(res.statusCode).toBe(403);
    });

    it('UNI-3: returns 400 on invalid body (missing email)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/v1/onboarding/universe',
        headers: auth(archonToken),
        payload: { username: 'x', password: VALID_PASSWORD, roleId: 1 },
      });
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body).code).toBe('VALIDATION_ERROR');
    });

    it('UNI-4: returns 400 MISSING_RFC when profile.rfc is absent', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/v1/onboarding/universe',
        headers: auth(archonToken),
        payload: { ...VALID_UNIVERSE_BODY, profile: { razon_social: 'Sin RFC' } },
      });
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body).code).toBe('MISSING_RFC');
    });

    it('UNI-5: returns 409 CONFLICT when username already exists', async () => {
      (db.execute as Mock).mockResolvedValueOnce([[{ id: 5 }], undefined]);
      const res = await app.inject({
        method: 'POST',
        url: '/v1/onboarding/universe',
        headers: auth(archonToken),
        payload: VALID_UNIVERSE_BODY,
      });
      expect(res.statusCode).toBe(409);
      expect(JSON.parse(res.body).code).toBe('CONFLICT');
    });

    it('UNI-6: returns 201 and creates ERP universe (roleId=1)', async () => {
      (db.execute as Mock).mockResolvedValueOnce([[], undefined]); // username check
      const conn = makeConn();
      vi.mocked(db).getConnection.mockResolvedValueOnce(conn);

      const res = await app.inject({
        method: 'POST',
        url: '/v1/onboarding/universe',
        headers: auth(archonToken),
        payload: VALID_UNIVERSE_BODY,
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.suite).toBe('ERP');
      expect(conn.beginTransaction).toHaveBeenCalled();
      expect(conn.commit).toHaveBeenCalled();
      expect(conn.rollback).not.toHaveBeenCalled();
    });

    it('UNI-7: returns 201 and creates VIM universe (roleId=3)', async () => {
      (db.execute as Mock).mockResolvedValueOnce([[], undefined]);
      const conn = makeConn();
      vi.mocked(db).getConnection.mockResolvedValueOnce(conn);

      const res = await app.inject({
        method: 'POST',
        url: '/v1/onboarding/universe',
        headers: auth(archonToken),
        payload: {
          ...VALID_UNIVERSE_BODY,
          username: 'centro.vim',
          roleId: 3,
          profile: { rfc: 'CENT123456ABC', especialidades: 'Cardio' },
        },
      });

      expect(res.statusCode).toBe(201);
      expect(JSON.parse(res.body).suite).toBe('VIM');
    });

    it('UNI-9: inserts areas rows for roleId=1 when areas array provided', async () => {
      (db.execute as Mock).mockResolvedValueOnce([[], undefined]); // username check
      const conn = makeConn();
      // extra calls for 2 area INSERTs
      conn.execute.mockResolvedValueOnce([{ affectedRows: 1 }, undefined]);
      conn.execute.mockResolvedValueOnce([{ affectedRows: 1 }, undefined]);
      vi.mocked(db).getConnection.mockResolvedValueOnce(conn);

      const res = await app.inject({
        method: 'POST',
        url: '/v1/onboarding/universe',
        headers: auth(archonToken),
        payload: { ...VALID_UNIVERSE_BODY, areas: ['Administración', 'Finanzas'] },
      });

      expect(res.statusCode).toBe(201);
      const areaCalls = conn.execute.mock.calls.filter(
        (c) => typeof c[0] === 'string' && c[0].includes('INSERT INTO areas')
      );
      expect(areaCalls).toHaveLength(2);
    });

    it('UNI-8: rolls back on transaction error', async () => {
      (db.execute as Mock).mockResolvedValueOnce([[], undefined]);
      const conn = makeConn();
      conn.execute.mockReset();
      conn.execute.mockRejectedValueOnce(new Error('DB crash'));
      vi.mocked(db).getConnection.mockResolvedValueOnce(conn);

      const res = await app.inject({
        method: 'POST',
        url: '/v1/onboarding/universe',
        headers: auth(archonToken),
        payload: VALID_UNIVERSE_BODY,
      });

      expect(res.statusCode).toBe(500);
      expect(conn.rollback).toHaveBeenCalled();
      expect(conn.commit).not.toHaveBeenCalled();
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // POST /v1/onboarding/client
  // ────────────────────────────────────────────────────────────────────────────
  describe('POST /v1/onboarding/client', () => {
    it('CLI-1: returns 401 without token', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/v1/onboarding/client',
        payload: VALID_CLIENT_BODY,
      });
      expect(res.statusCode).toBe(401);
    });

    it('CLI-2: returns 403 when caller is not Centro Especializado (roleId≠3)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/v1/onboarding/client',
        headers: auth(flotillaToken),
        payload: VALID_CLIENT_BODY,
      });
      expect(res.statusCode).toBe(403);
      expect(JSON.parse(res.body).message).toMatch(/Centro Especializado/);
    });

    it('CLI-3: returns 400 OWNER_NOT_FOUND when caller has no owner membership', async () => {
      vi.mocked(FleetService.getUserOwnerIds).mockResolvedValueOnce([]);

      const res = await app.inject({
        method: 'POST',
        url: '/v1/onboarding/client',
        headers: auth(centroToken),
        payload: VALID_CLIENT_BODY,
      });
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body).code).toBe('OWNER_NOT_FOUND');
    });

    it('CLI-4: returns 400 when targetOwnerId is missing for Familiar (roleId=5)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/v1/onboarding/client',
        headers: auth(centroToken),
        payload: { ...VALID_CLIENT_BODY, roleId: 5 },
      });
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body).message).toMatch(/targetOwnerId/);
    });

    it('CLI-5: returns 403 FORBIDDEN when targetOwnerId is outside caller universe (Anti-IDOR)', async () => {
      // Anti-IDOR: targetOwnerId=999 is not a child of callerOwnerId=10
      (db.execute as Mock).mockResolvedValueOnce([[], undefined]); // child check → empty

      const res = await app.inject({
        method: 'POST',
        url: '/v1/onboarding/client',
        headers: auth(centroToken),
        payload: { ...VALID_CLIENT_BODY, roleId: 5, targetOwnerId: 999 },
      });
      expect(res.statusCode).toBe(403);
      expect(JSON.parse(res.body).code).toBe('FORBIDDEN');
    });

    it('CLI-6: returns 409 CONFLICT when username already exists', async () => {
      (db.execute as Mock).mockResolvedValueOnce([[{ id: 99 }], undefined]); // username check

      const res = await app.inject({
        method: 'POST',
        url: '/v1/onboarding/client',
        headers: auth(centroToken),
        payload: VALID_CLIENT_BODY,
      });
      expect(res.statusCode).toBe(409);
    });

    it('CLI-7: returns 201 and creates P.Privado (roleId=4) with new owner', async () => {
      (db.execute as Mock).mockResolvedValueOnce([[], undefined]); // username check
      const conn = makeConn();
      vi.mocked(db).getConnection.mockResolvedValueOnce(conn);

      const res = await app.inject({
        method: 'POST',
        url: '/v1/onboarding/client',
        headers: auth(centroToken),
        payload: VALID_CLIENT_BODY,
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.userId).toBe(100);
      expect(conn.commit).toHaveBeenCalled();
    });

    it('CLI-8: returns 201 and creates Familiar (roleId=5) under existing P.Privado owner', async () => {
      (db.execute as Mock)
        .mockResolvedValueOnce([[{ id: 50 }], undefined]) // child check → owner exists within universe
        .mockResolvedValueOnce([[], undefined]); // username check

      const conn = makeConn();
      conn.execute.mockReset();
      // Familiar path: INSERT users, INSERT membership, INSERT user_roles
      conn.execute
        .mockResolvedValueOnce([{ insertId: 101 }, undefined])
        .mockResolvedValueOnce([{ affectedRows: 1 }, undefined])
        .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]);
      vi.mocked(db).getConnection.mockResolvedValueOnce(conn);

      const res = await app.inject({
        method: 'POST',
        url: '/v1/onboarding/client',
        headers: auth(centroToken),
        payload: { ...VALID_CLIENT_BODY, roleId: 5, targetOwnerId: 50 },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.userId).toBe(101);
      expect(body.ownerId).toBe(50);
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // POST /v1/onboarding/member
  // ────────────────────────────────────────────────────────────────────────────
  describe('POST /v1/onboarding/member', () => {
    it('MEM-1: returns 401 without token', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/v1/onboarding/member',
        payload: VALID_MEMBER_BODY,
      });
      expect(res.statusCode).toBe(401);
    });

    it('MEM-2: returns 403 when caller is not Propietario de Flotilla (roleId≠1)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/v1/onboarding/member',
        headers: auth(centroToken),
        payload: VALID_MEMBER_BODY,
      });
      expect(res.statusCode).toBe(403);
      expect(JSON.parse(res.body).message).toMatch(/Propietario de Flotilla/);
    });

    it('MEM-3: returns 400 OWNER_NOT_FOUND when caller has no owner membership', async () => {
      vi.mocked(FleetService.getUserOwnerIds).mockResolvedValueOnce([]);

      const res = await app.inject({
        method: 'POST',
        url: '/v1/onboarding/member',
        headers: auth(flotillaToken),
        payload: VALID_MEMBER_BODY,
      });
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body).code).toBe('OWNER_NOT_FOUND');
    });

    it('MEM-4: returns 409 CONFLICT when username already exists', async () => {
      (db.execute as Mock).mockResolvedValueOnce([[{ id: 20 }], undefined]);

      const res = await app.inject({
        method: 'POST',
        url: '/v1/onboarding/member',
        headers: auth(flotillaToken),
        payload: VALID_MEMBER_BODY,
      });
      expect(res.statusCode).toBe(409);
    });

    it('MEM-5: returns 201 and creates Área (roleId=2) under caller owner', async () => {
      (db.execute as Mock).mockResolvedValueOnce([[], undefined]); // username check
      const conn = makeConn();
      conn.execute.mockReset();
      conn.execute
        .mockResolvedValueOnce([{ insertId: 102 }, undefined])
        .mockResolvedValueOnce([{ affectedRows: 1 }, undefined])
        .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]);
      vi.mocked(db).getConnection.mockResolvedValueOnce(conn);

      const res = await app.inject({
        method: 'POST',
        url: '/v1/onboarding/member',
        headers: auth(flotillaToken),
        payload: VALID_MEMBER_BODY,
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.userId).toBe(102);
      expect(body.ownerId).toBe(10); // callerOwnerId from mock
      expect(conn.commit).toHaveBeenCalled();
    });
  });
});
