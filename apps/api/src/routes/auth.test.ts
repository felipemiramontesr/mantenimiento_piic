import { describe, it, expect, vi, beforeEach, beforeAll, Mock } from 'vitest';
import buildApp from '../index';
import db from '../services/db';

/**
 * Archon Integration Test: POST /v1/auth/register — Fase 3 extensions
 * Feature Contract: Archon_Master_Fase3_VIM_Hierarchy
 * Scenario 8: Rol 3 (CENTER) with owner_profiles (rfc mandatory)
 * Scenario 9: Rol 1 (FLOTILLA) with initial areas (optional)
 */

const mockConnection = {
  beginTransaction: vi.fn(),
  commit: vi.fn(),
  rollback: vi.fn(),
  release: vi.fn(),
  execute: vi.fn().mockResolvedValue([[], undefined]),
  query: vi.fn().mockResolvedValue([[], undefined]),
};

vi.mock('../services/db', () => ({
  default: {
    execute: vi.fn().mockResolvedValue([[], undefined]),
    query: vi.fn().mockResolvedValue([[], undefined]),
    getConnection: vi.fn(() => Promise.resolve(mockConnection)),
  },
}));

vi.mock('../services/encryption', () => ({
  default: {
    encrypt: vi.fn((v) => `enc_${v}`),
    decrypt: vi.fn((v) => (v && typeof v === 'string' ? v.replace('enc_', '') : v)),
    generateBlindIndex: vi.fn((v) => `hash_${v}`),
  },
}));

vi.mock('@node-rs/argon2', () => ({
  hash: vi.fn(() => Promise.resolve('hashed_pw')),
  verify: vi.fn(() => Promise.resolve(true)),
}));

const BASE_PASSWORD = 'Archon@1234!';

describe('POST /v1/auth/register — Fase 3 (owner_profiles + areas)', () => {
  const app = buildApp();

  beforeAll(async () => {
    await app.ready();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    (db.execute as Mock).mockReset();
    mockConnection.execute.mockReset();
    (db.execute as Mock).mockResolvedValue([[], undefined]);
    mockConnection.execute.mockResolvedValue([[], undefined]);
  });

  // ── Scenario 8 — Centro con owner_profiles ──────────────────────────────

  it('returns 400 MISSING_RFC when roleId=3 and rfc is missing — Scenario 4', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: {
        username: 'centro.uno',
        email: 'centro@test.mx',
        password: BASE_PASSWORD,
        roleId: 3,
        fullName: 'Taller Uno',
        // profile omitted → rfc missing
      },
    });
    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.code).toBe('MISSING_RFC');
  });

  it('returns 400 VALIDATION_ERROR when roleId=3 and profile.rfc is empty — Scenario 8', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: {
        username: 'centro.uno',
        email: 'centro@test.mx',
        password: BASE_PASSWORD,
        roleId: 3,
        fullName: 'Taller Uno',
        profile: { rfc: '' },
      },
    });
    expect(res.statusCode).toBe(400);
  });

  it('creates Centro with owner_profiles transactionally — Scenario 8', async () => {
    (db.execute as Mock).mockResolvedValueOnce([[], undefined]); // username unique check
    mockConnection.execute
      .mockResolvedValueOnce([{ insertId: 50 }, undefined]) // INSERT users
      .mockResolvedValueOnce([[], undefined]) // owner label check → not exists
      .mockResolvedValueOnce([[{ nextId: 400 }], undefined]) // MAX(id)+1
      .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]) // INSERT common_catalogs
      .mockResolvedValueOnce([[], undefined]) // SELECT handle collision check
      .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]) // INSERT owners (CENTER)
      .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]) // INSERT user_owner_membership
      .mockResolvedValue([{ affectedRows: 1 }, undefined]); // INSERT owner_profiles

    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: {
        username: 'centro.dos',
        email: 'centro2@test.mx',
        password: BASE_PASSWORD,
        roleId: 3,
        fullName: 'Taller Dos',
        profile: {
          rfc: 'RFC123456789',
          razon_social: 'Taller Dos S.A.',
          direccion: 'Av. 1 #100',
          telefono: '5551234567',
          especialidades: 'Diésel,Motor',
        },
      },
    });

    expect(res.statusCode).toBe(201);
    expect(JSON.parse(res.body).success).toBe(true);

    const { calls } = mockConnection.execute.mock;
    const sqls = calls.map((c) => c[0] as string);
    expect(sqls.some((s) => s.includes('owner_profiles'))).toBe(true);
    const ownersInsert = calls.find((c) => (c[0] as string).includes('INSERT INTO owners'));
    expect(ownersInsert).toBeDefined();
    expect((ownersInsert?.[1] as unknown[])?.includes('CENTER')).toBe(true);
    expect(mockConnection.commit).toHaveBeenCalled();
  });

  // ── Scenario 9 — Flotilla con áreas iniciales ───────────────────────────

  it('creates Flotilla with areas transactionally — Scenario 9', async () => {
    (db.execute as Mock).mockResolvedValueOnce([[], undefined]); // username unique check
    mockConnection.execute
      .mockResolvedValueOnce([{ insertId: 60 }, undefined]) // INSERT users
      .mockResolvedValueOnce([[], undefined]) // owner label check → not exists
      .mockResolvedValueOnce([[{ nextId: 500 }], undefined]) // MAX(id)+1
      .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]) // INSERT common_catalogs
      .mockResolvedValueOnce([[], undefined]) // SELECT handle collision check
      .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]) // INSERT owners (FLOTILLA)
      .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]) // INSERT user_owner_membership
      .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]) // INSERT areas[0]
      .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]) // INSERT areas[1]
      .mockResolvedValue([{ affectedRows: 1 }, undefined]); // INSERT areas[2]

    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: {
        username: 'flotilla.tres',
        email: 'flotilla3@test.mx',
        password: BASE_PASSWORD,
        roleId: 1,
        fullName: 'Flotilla Tres',
        profile: { rfc: 'RFC_FLOTILLA' },
        areas: ['Operaciones', 'Logística', 'Administración'],
      },
    });

    expect(res.statusCode).toBe(201);
    expect(JSON.parse(res.body).success).toBe(true);

    const sqls = mockConnection.execute.mock.calls.map((c) => c[0] as string);
    const areaInserts = sqls.filter((s) => s.includes('INSERT INTO areas'));
    expect(areaInserts).toHaveLength(3);
    expect(mockConnection.commit).toHaveBeenCalled();
  });

  it('creates Flotilla without areas when areas field is omitted — Scenario 9', async () => {
    (db.execute as Mock).mockResolvedValueOnce([[], undefined]); // username unique
    mockConnection.execute
      .mockResolvedValueOnce([{ insertId: 61 }, undefined])
      .mockResolvedValueOnce([[], undefined])
      .mockResolvedValueOnce([[{ nextId: 501 }], undefined])
      .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]) // INSERT common_catalogs
      .mockResolvedValueOnce([[], undefined]) // SELECT handle collision check
      .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]) // INSERT owners
      .mockResolvedValue([{ affectedRows: 1 }, undefined]);

    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: {
        username: 'flotilla.cuatro',
        email: 'flotilla4@test.mx',
        password: BASE_PASSWORD,
        roleId: 1,
        fullName: 'Flotilla Cuatro',
        profile: { rfc: 'RFC_FLOTILLA' },
        // areas omitted
      },
    });

    expect(res.statusCode).toBe(201);
    const sqls = mockConnection.execute.mock.calls.map((c) => c[0] as string);
    expect(sqls.some((s) => s.includes('INSERT INTO areas'))).toBe(false);
    expect(mockConnection.commit).toHaveBeenCalled();
  });

  it('rolls back and returns 500 on transaction failure during register', async () => {
    (db.execute as Mock).mockResolvedValueOnce([[], undefined]);
    mockConnection.execute.mockRejectedValueOnce(new Error('TX_FAIL'));

    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: {
        username: 'centro.fail',
        email: 'fail@test.mx',
        password: BASE_PASSWORD,
        roleId: 3,
        fullName: 'Centro Fail',
        profile: { rfc: 'RFC999' },
      },
    });

    expect(res.statusCode).toBe(500);
    expect(mockConnection.rollback).toHaveBeenCalled();
  });

  // ── Scenario 1 — Flotilla con perfil + dirección multicampo ─────────────

  it('creates Flotilla with profile and address transactionally — Scenario 1', async () => {
    (db.execute as Mock).mockResolvedValueOnce([[], undefined]); // username unique check
    mockConnection.execute
      .mockResolvedValueOnce([{ insertId: 70 }, undefined]) // INSERT users
      .mockResolvedValueOnce([[], undefined]) // owner label check → not exists
      .mockResolvedValueOnce([[{ nextId: 600 }], undefined]) // MAX(id)+1
      .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]) // INSERT common_catalogs
      .mockResolvedValueOnce([[], undefined]) // SELECT handle collision check
      .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]) // INSERT owners (FLOTILLA)
      .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]) // INSERT user_owner_membership
      .mockResolvedValue([{ affectedRows: 1 }, undefined]); // INSERT owner_profiles

    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: {
        username: 'flotilla.perfilada',
        email: 'flotilla.p@test.mx',
        password: BASE_PASSWORD,
        roleId: 1,
        fullName: 'Flotilla SA',
        profile: { rfc: 'ABC010101000', razon_social: 'Flotilla SA', telefono: '3310001000' },
        address: { neighborhoodId: 500, calle: 'Av. Reforma', numeroExt: '42' },
      },
    });

    expect(res.statusCode).toBe(201);
    const sqls = mockConnection.execute.mock.calls.map((c) => c[0] as string);
    expect(sqls.some((s) => s.includes('owner_profiles'))).toBe(true);
    const profileInsert = mockConnection.execute.mock.calls.find((c) =>
      (c[0] as string).includes('INSERT INTO owner_profiles')
    );
    expect(profileInsert?.[1]).toEqual(expect.arrayContaining([500, 'Av. Reforma', '42']));
    expect(mockConnection.commit).toHaveBeenCalled();
  });

  // ── Scenario 2 — Privado sin RFC (opcional para Rol 4) ──────────────────

  it('creates Privado without rfc transactionally — Scenario 2', async () => {
    (db.execute as Mock).mockResolvedValueOnce([[], undefined]); // username unique check
    mockConnection.execute
      .mockResolvedValueOnce([{ insertId: 80 }, undefined]) // INSERT users
      .mockResolvedValueOnce([[], undefined]) // owner label check
      .mockResolvedValueOnce([[{ nextId: 700 }], undefined]) // MAX(id)+1
      .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]) // INSERT common_catalogs
      .mockResolvedValueOnce([[], undefined]) // SELECT handle collision check
      .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]) // INSERT owners (PRIVATE)
      .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]) // INSERT user_owner_membership
      .mockResolvedValue([{ affectedRows: 1 }, undefined]); // INSERT owner_profiles

    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: {
        username: 'privado.sinrfc',
        email: 'privado@test.mx',
        password: BASE_PASSWORD,
        roleId: 4,
        fullName: 'López Sánchez',
        profile: { razon_social: 'López Sánchez' }, // rfc omitted — nullable for Rol 4
        address: { neighborhoodId: 600, calle: 'Calle Hidalgo', numeroExt: '8' },
      },
    });

    expect(res.statusCode).toBe(201);
    const ownersInsert = mockConnection.execute.mock.calls.find((c) =>
      (c[0] as string).includes('INSERT INTO owners')
    );
    expect(ownersInsert?.[1]).toEqual(expect.arrayContaining(['PRIVATE']));
    const profileInsert = mockConnection.execute.mock.calls.find((c) =>
      (c[0] as string).includes('INSERT INTO owner_profiles')
    );
    expect((profileInsert?.[1] as unknown[])?.[1]).toBeNull(); // rfc param → null
    expect(mockConnection.commit).toHaveBeenCalled();
  });

  // ── Scenario 3 — Flotilla sin RFC → 400 MISSING_RFC ─────────────────────

  it('returns 400 MISSING_RFC when roleId=1 and rfc is missing — Scenario 3', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: {
        username: 'flotilla.sinrfc',
        email: 'flotilla.sinrfc@test.mx',
        password: BASE_PASSWORD,
        roleId: 1,
        fullName: 'Sin RFC SA',
        profile: { razon_social: 'Sin RFC SA' }, // rfc omitted
      },
    });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).code).toBe('MISSING_RFC');
  });
});

// ── GET /v1/auth/roles — scope=personal hardening ─────────────────────────

describe('GET /v1/auth/roles', () => {
  const app = buildApp();
  let token: string;

  beforeAll(async () => {
    await app.ready();
    const { jwt } = app as unknown as { jwt: { sign: (_p: object) => string } };
    token = jwt.sign({ id: 1, username: 'archon', roleId: 0, permissions: ['*'] });
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('RS-1: without scope returns all roles (no WHERE filter)', async () => {
    const allRoles = [
      { id: 1, label: 'Propietario de Flotilla' },
      { id: 3, label: 'Centro Especializado' },
      { id: 2, label: 'Operador de Área' },
    ];
    (db.execute as Mock).mockResolvedValueOnce([allRoles, undefined]);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/auth/roles',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { id: number }[];
    expect(body).toHaveLength(3);
    expect((db.execute as Mock).mock.calls[0][0]).not.toContain('NOT IN');
  });

  it('RS-2: scope=personal uses SQL that excludes ids 1, 3, and Master (Archon)', async () => {
    const personalRoles = [
      { id: 2, label: 'Operador de Área' },
      { id: 4, label: 'Propietario Privado' },
      { id: 5, label: 'Familiar' },
    ];
    (db.execute as Mock).mockResolvedValueOnce([personalRoles, undefined]);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/auth/roles?scope=personal',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { id: number }[];
    expect(body).toHaveLength(3);
    const sql = (db.execute as Mock).mock.calls[0][0] as string;
    expect(sql).toContain('id NOT IN (1, 3)');
    expect(sql).toContain("name != 'Master (Archon)'");
  });
});
