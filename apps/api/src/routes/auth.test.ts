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

// ── GET /v1/auth/roles — retirado FC 082 F3c2 (Cond.2 Bravo) ───────────────

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

  it('410 GONE — retirado junto con el CRUD legacy de roles, sin tocar la DB', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/auth/roles',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(410);
    expect(JSON.parse(res.body).code).toBe('GONE');
    expect(db.execute).not.toHaveBeenCalled();
  });
});
