import { describe, it, expect, vi, beforeAll, beforeEach, Mock } from 'vitest';
import buildApp from '../../../index';
import db from '../../../services/db';

/**
 * AT-FC24-C-ASSIGN: Cosmonaut Assignments Routes
 * Covers: POST /arcs · POST /:userId/roles · DELETE /:userId/roles/:roleId · GET /arcs · GET /me/permissions
 * Gherkin: I2/I3 MU no crea MU · I8 anti-escalation · Arc sin roles → perms=[] · effective_permissions
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

describe('AT-FC24-C-ASSIGN: Cosmonaut Assignments', () => {
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

  // ─── AT-FC24-C-GH5: Arc sin roles → permissions=[] ───────────────────────

  it('AT-FC24-C-ASSIGN-1 (Gherkin Arc sin roles): GET /me/permissions retorna [] cuando no hay roles', async () => {
    (db.execute as Mock).mockResolvedValueOnce([[]]); // no role assignments
    const res = await app.inject({
      method: 'GET',
      url: '/v1/cosmonauts/me/permissions?tenantId=5',
      headers: { authorization: `Bearer ${arcToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.permissions).toEqual([]);
  });

  it('AT-FC24-C-ASSIGN-2: GET /me/permissions retorna unión de permisos multi-role', async () => {
    (db.execute as Mock).mockResolvedValueOnce([
      [
        { slug: 'maint:record:view:any' },
        { slug: 'fleet:unit:view:any' },
        { slug: 'maint:record:edit:any' },
      ],
    ]);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/cosmonauts/me/permissions?tenantId=5',
      headers: { authorization: `Bearer ${arcToken}` },
    });
    const body = JSON.parse(res.body);
    expect(body.data.permissions).toHaveLength(3);
    expect(body.data.permissions).toContain('maint:record:view:any');
  });

  // ─── AT-FC24-C-GH1: MU no puede crear otro MU (I2/I3) ────────────────────

  it('AT-FC24-C-ASSIGN-3 (Gherkin I2/I3): MU cannot POST /arcs with cosmonaut_type=MU → 403', async () => {
    // muToken has roleId=2 (not Ω) → requireOmega returns 403
    const res = await app.inject({
      method: 'POST',
      url: '/v1/cosmonauts/arcs',
      headers: { authorization: `Bearer ${muToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({ userId: 30, tenantId: 5, cosmonaut_type: 'MU' }),
    });
    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.body).message).toContain('Only Ω can create MU');
  });

  it('AT-FC24-C-ASSIGN-4: Ω can POST /arcs with cosmonaut_type=MU', async () => {
    // Ω bypass → check user exists → INSERT
    (db.execute as Mock)
      .mockResolvedValueOnce([[{ id: 30 }]]) // users check
      .mockResolvedValueOnce([[]]); // INSERT IGNORE
    const res = await app.inject({
      method: 'POST',
      url: '/v1/cosmonauts/arcs',
      headers: { authorization: `Bearer ${omegaToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({ userId: 30, tenantId: 5, cosmonaut_type: 'MU' }),
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.data.cosmonaut_type).toBe('MU');
  });

  it('AT-FC24-C-ASSIGN-5: MU can POST /arcs with cosmonaut_type=ARC', async () => {
    // requireMuOrOmega → MU membership check
    (db.execute as Mock)
      .mockResolvedValueOnce([[{ cosmonaut_type: 'MU' }]]) // MU check in requireMuOrOmega
      .mockResolvedValueOnce([[{ id: 30 }]]) // user exists
      .mockResolvedValueOnce([[]]); // INSERT IGNORE
    const res = await app.inject({
      method: 'POST',
      url: '/v1/cosmonauts/arcs',
      headers: { authorization: `Bearer ${muToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({ userId: 30, tenantId: 5, cosmonaut_type: 'ARC' }),
    });
    expect(res.statusCode).toBe(201);
  });

  // ─── AT-FC24-C-GH3: I8 — MU no otorga lo que no posee ───────────────────

  it('AT-FC24-C-ASSIGN-6 (Gherkin I8): MU con permisos limitados no puede asignar role con permisos mayores → 403', async () => {
    // requireMuOrOmega → MU ✅
    (db.execute as Mock)
      .mockResolvedValueOnce([[{ cosmonaut_type: 'MU' }]]) // requireMuOrOmega → MU
      .mockResolvedValueOnce([[{ slug: 'maint:record:view:any' }]]) // grantor effective perms (limited)
      .mockResolvedValueOnce([[]]) // omega check → NOT Ω
      .mockResolvedValueOnce([[{ slug: 'maint:record:edit:any' }]]); // role perms — escalation!
    const res = await app.inject({
      method: 'POST',
      url: '/v1/cosmonauts/20/roles',
      headers: { authorization: `Bearer ${muToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({ roleId: 3, tenantId: 5 }),
    });
    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.body).code).toBe('PRIVILEGE_ESCALATION');
  });

  // ─── GET /cosmonauts/arcs ─────────────────────────────────────────────────

  it('AT-FC24-C-ASSIGN-7: GET /arcs returns Arcs with effective_permissions (OQ-5)', async () => {
    // requireMuOrOmega → Ω bypass
    (db.execute as Mock)
      .mockResolvedValueOnce([
        [
          {
            id: 20,
            username: 'arc.user',
            email: 'arc@test.com',
            cosmonaut_type: 'ARC',
            tenant_id: 5,
          },
        ],
      ]) // arcs list
      .mockResolvedValueOnce([[{ slug: 'maint:record:view:any' }]]); // effective_permissions for arc 20
    const res = await app.inject({
      method: 'GET',
      url: '/v1/cosmonauts/arcs?tenantId=5',
      headers: { authorization: `Bearer ${omegaToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data[0]).toHaveProperty('effective_permissions');
    expect(body.data[0].effective_permissions).toContain('maint:record:view:any');
  });

  it('AT-FC24-C-ASSIGN-8: GET /arcs without tenantId returns 400', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/cosmonauts/arcs',
      headers: { authorization: `Bearer ${omegaToken}` },
    });
    expect(res.statusCode).toBe(400);
  });
});
