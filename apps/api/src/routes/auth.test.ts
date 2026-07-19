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

// FC 082 F0c — los escenarios Fase 3 de POST /register (Centro/Flotilla/
// Privado, RFC, áreas) murieron con el endpoint (bandas {1,3,4} — 084_AN §1a).
describe('POST /v1/auth/register — purgado (FC 082 F0c)', () => {
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

  it('responde 404 (endpoint eliminado con las bandas de roles)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: { username: 'centro.uno', email: 'centro@test.mx', password: 'Archon@1234!' },
    });
    expect(res.statusCode).toBe(404);
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
