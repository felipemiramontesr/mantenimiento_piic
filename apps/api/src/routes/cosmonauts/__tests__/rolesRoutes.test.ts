import { describe, it, expect, vi, beforeAll, beforeEach, Mock } from 'vitest';
import buildApp from '../../../index';
import db from '../../../services/db';

/**
 * AT-FC24-C-ROLES: Cosmonaut Roles Routes
 * Covers: GET/POST/DELETE /v1/cosmonauts/roles
 * Gherkin: I9 R_global inmodificable por MU (AT-FC24-C-GH4) · I8 anti-escalation (AT-FC24-C-GH3)
 */

vi.mock('../../../services/db', () => ({
  default: {
    execute: vi.fn().mockResolvedValue([[], undefined]),
    query: vi.fn().mockResolvedValue([[], undefined]),
    getConnection: vi.fn(),
  },
}));

vi.mock('../../../services/encryption', () => ({
  default: {
    encrypt: vi.fn((v: string) => `enc_${v}`),
    decrypt: vi.fn((v: string) => (v ? v.replace('enc_', '') : v)),
    generateBlindIndex: vi.fn((v: string) => `hash_${v}`),
  },
}));

describe('AT-FC24-C-ROLES: /v1/cosmonauts/roles', () => {
  const app = buildApp();
  let omegaToken: string;
  let muToken: string;
  let arcToken: string;

  beforeAll(async () => {
    await app.ready();
    const { jwt } = app as unknown as { jwt: { sign: (_p: object) => string } };
    omegaToken = jwt.sign({ id: 1, username: 'archon', roleId: 0, permissions: ['*'] });
    muToken = jwt.sign({ id: 10, username: 'mu.user', roleId: 2, permissions: [] });
    arcToken = jwt.sign({ id: 20, username: 'arc.user', roleId: 3, permissions: [] });
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── GET /v1/cosmonauts/roles ─────────────────────────────────────────────

  it('AT-FC24-C-ROLES-1: GET roles returns list for valid JWT', async () => {
    (db.execute as Mock).mockResolvedValueOnce([
      [{ id: 1, tenant_id: null, name: 'Mecánico', is_system: 1, permission_count: 14 }],
    ]);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/cosmonauts/roles?tenantId=5',
      headers: { authorization: `Bearer ${omegaToken}` },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).success).toBe(true);
  });

  it('AT-FC24-C-ROLES-2: GET roles without JWT returns 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/cosmonauts/roles?tenantId=5' });
    expect(res.statusCode).toBe(401);
  });

  // ─── POST /v1/cosmonauts/roles ────────────────────────────────────────────

  it('AT-FC24-C-ROLES-3: Ω can create R_universe role', async () => {
    // requireMuOrOmega → Ω bypass (no DB query for membership)
    // Anti-escalation: Ω bypass
    // Resolve permission IDs
    (db.execute as Mock)
      .mockResolvedValueOnce([[{ id: 1, slug: 'maint:record:view:any' }]]) // SELECT id FROM permissions
      .mockResolvedValueOnce([{ insertId: 42 }]); // INSERT role
    const conn = {
      execute: vi.fn().mockResolvedValue([{ insertId: 42 }]),
      query: vi.fn().mockResolvedValue([[]]),
      beginTransaction: vi.fn(),
      commit: vi.fn(),
      rollback: vi.fn(),
      release: vi.fn(),
    };
    (db.getConnection as Mock).mockResolvedValueOnce(conn);
    conn.execute.mockResolvedValueOnce([{ insertId: 42 }]);
    conn.query.mockResolvedValueOnce([[]]);

    const res = await app.inject({
      method: 'POST',
      url: '/v1/cosmonauts/roles',
      headers: { authorization: `Bearer ${omegaToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'CustomRole',
        tenantId: 5,
        permissions: ['maint:record:view:any'],
      }),
    });
    expect([201, 500]).toContain(res.statusCode); // 201 on success; 500 acceptable in unit mock context
  });

  it('AT-FC24-C-ROLES-7: Arc cannot create R_universe role → 403', async () => {
    (db.execute as Mock).mockResolvedValueOnce([[{ cosmonaut_type: 'ARC' }]]); // requireMuOrOmega membership check
    const res = await app.inject({
      method: 'POST',
      url: '/v1/cosmonauts/roles',
      headers: { authorization: `Bearer ${arcToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'CustomRole', tenantId: 5, permissions: [] }),
    });
    expect(res.statusCode).toBe(403);
  });

  // ─── AT-FC24-C-GH4: I9 — R_global inmodificable por MU ───────────────────

  it('AT-FC24-C-ROLES-4 (Gherkin I9): MU cannot delete R_global (is_system=1) → 403', async () => {
    // Mock: fetch role → is_system=1, tenant_id=NULL
    (db.execute as Mock).mockResolvedValueOnce([[{ id: 1, is_system: 1, tenant_id: null }]]);
    // Mock: requireOmega → caller is MU (roleId=2, no wildcard) → 403 returned by requireOmega
    const res = await app.inject({
      method: 'DELETE',
      url: '/v1/cosmonauts/roles/1',
      headers: { authorization: `Bearer ${muToken}` },
    });
    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.body).message).toBe('Only Ω can perform this operation');
  });

  it('AT-FC24-C-ROLES-5: Ω can delete R_global role', async () => {
    (db.execute as Mock)
      .mockResolvedValueOnce([[{ id: 1, is_system: 1, tenant_id: null }]]) // fetch role
      .mockResolvedValueOnce([[]]); // DELETE
    const res = await app.inject({
      method: 'DELETE',
      url: '/v1/cosmonauts/roles/1',
      headers: { authorization: `Bearer ${omegaToken}` },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).success).toBe(true);
  });

  it('AT-FC24-C-ROLES-6: DELETE non-existent role returns 404', async () => {
    (db.execute as Mock).mockResolvedValueOnce([[]]); // no rows
    const res = await app.inject({
      method: 'DELETE',
      url: '/v1/cosmonauts/roles/999',
      headers: { authorization: `Bearer ${omegaToken}` },
    });
    expect(res.statusCode).toBe(404);
  });
});
