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

  // ─── POST /:userId/roles — happy-paths (líneas 165-188) ──────────────────

  it('AT-FC24-C-ASSIGN-9: Ω asigna role a Arc existente → 201', async () => {
    // requireMuOrOmega: Ω bypass (0 db calls)
    // antiEscalationGuard: (1) resolveEffectivePermissions + (2) omegaCheck→IS Ω → return true
    // memberRows: target IS Arc → 201 + INSERT
    (db.execute as Mock)
      .mockResolvedValueOnce([[]]) // resolveEffectivePermissions (antiEscalation call 1)
      .mockResolvedValueOnce([[{ role_id: 0 }]]) // omegaCheck → IS Ω → bypass (call 2)
      .mockResolvedValueOnce([[{ cosmonaut_type: 'ARC' }]]) // memberRows: target es Arc
      .mockResolvedValueOnce([{ insertId: 100 }]); // INSERT IGNORE success
    const res = await app.inject({
      method: 'POST',
      url: '/v1/cosmonauts/20/roles',
      headers: { authorization: `Bearer ${omegaToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({ roleId: 1, tenantId: 5 }),
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.userId).toBe(20);
  });

  it('AT-FC24-C-ASSIGN-10: target no es miembro del Universe → 404 ARC_NOT_FOUND', async () => {
    (db.execute as Mock)
      .mockResolvedValueOnce([[]]) // resolveEffectivePermissions
      .mockResolvedValueOnce([[{ role_id: 0 }]]) // omegaCheck → IS Ω
      .mockResolvedValueOnce([[]]); // memberRows empty → ARC_NOT_FOUND
    const res = await app.inject({
      method: 'POST',
      url: '/v1/cosmonauts/20/roles',
      headers: { authorization: `Bearer ${omegaToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({ roleId: 1, tenantId: 5 }),
    });
    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.body).code).toBe('ARC_NOT_FOUND');
  });

  // ─── DELETE /:userId/roles/:roleId — all paths (líneas 193-219) ──────────

  it('AT-FC24-C-ASSIGN-DEL-1: sin JWT → 401', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/v1/cosmonauts/20/roles/1?tenantId=5',
    });
    expect(res.statusCode).toBe(401);
  });

  it('AT-FC24-C-ASSIGN-DEL-2: sin tenantId → 400 VALIDATION_ERROR', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/v1/cosmonauts/20/roles/1',
      headers: { authorization: `Bearer ${omegaToken}` },
    });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).code).toBe('VALIDATION_ERROR');
  });

  it('AT-FC24-C-ASSIGN-DEL-3: Arc (no MU/Ω) → requireMuOrOmega falla → 403', async () => {
    (db.execute as Mock).mockResolvedValueOnce([[{ cosmonaut_type: 'ARC' }]]); // requireMuOrOmega: ARC → 403
    const res = await app.inject({
      method: 'DELETE',
      url: '/v1/cosmonauts/20/roles/1?tenantId=5',
      headers: { authorization: `Bearer ${arcToken}` },
    });
    expect(res.statusCode).toBe(403);
  });

  it('AT-FC24-C-ASSIGN-DEL-4: Ω revoca role → 200 success', async () => {
    // Ω bypass requireMuOrOmega → UPDATE
    (db.execute as Mock).mockResolvedValueOnce([{ affectedRows: 1 }]); // UPDATE success
    const res = await app.inject({
      method: 'DELETE',
      url: '/v1/cosmonauts/20/roles/1?tenantId=5',
      headers: { authorization: `Bearer ${omegaToken}` },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).success).toBe(true);
  });

  // ─── Branches faltantes: 401 / 400 / 404 ─────────────────────────────────

  it('AT-FC24-C-ASSIGN-11: GET /me/permissions sin JWT → 401 (line 29)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/cosmonauts/me/permissions?tenantId=5',
    });
    expect(res.statusCode).toBe(401);
    expect(JSON.parse(res.body).code).toBe('UNAUTHORIZED');
  });

  it('AT-FC24-C-ASSIGN-12: GET /arcs sin JWT → 401 (line 44)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/cosmonauts/arcs?tenantId=5',
    });
    expect(res.statusCode).toBe(401);
    expect(JSON.parse(res.body).code).toBe('UNAUTHORIZED');
  });

  it('AT-FC24-C-ASSIGN-13: POST /arcs sin JWT → 401 (line 83)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/cosmonauts/arcs',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ userId: 30, tenantId: 5 }),
    });
    expect(res.statusCode).toBe(401);
    expect(JSON.parse(res.body).code).toBe('UNAUTHORIZED');
  });

  it('AT-FC24-C-ASSIGN-14: POST /arcs body inválido → 400 VALIDATION_ERROR (lines 87-91)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/cosmonauts/arcs',
      headers: { authorization: `Bearer ${omegaToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({ userId: 'not-a-number', tenantId: 5 }),
    });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).code).toBe('VALIDATION_ERROR');
  });

  it('AT-FC24-C-ASSIGN-15: POST /arcs target user not found → 404 USER_NOT_FOUND (lines 116-118)', async () => {
    // Ω creating ARC: requireMuOrOmega bypass (no DB) → users check empty → 404
    (db.execute as Mock).mockResolvedValueOnce([[]]); // users check → empty → USER_NOT_FOUND
    const res = await app.inject({
      method: 'POST',
      url: '/v1/cosmonauts/arcs',
      headers: { authorization: `Bearer ${omegaToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({ userId: 999, tenantId: 5, cosmonaut_type: 'ARC' }),
    });
    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.body).code).toBe('USER_NOT_FOUND');
  });

  it('AT-FC24-C-ASSIGN-16: POST /:userId/roles sin JWT → 401 (lines 137-138)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/cosmonauts/20/roles',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ roleId: 1, tenantId: 5 }),
    });
    expect(res.statusCode).toBe(401);
    expect(JSON.parse(res.body).code).toBe('UNAUTHORIZED');
  });

  it('AT-FC24-C-ASSIGN-17: POST /:userId/roles body inválido → 400 VALIDATION_ERROR (lines 143-146)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/cosmonauts/20/roles',
      headers: { authorization: `Bearer ${omegaToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({ roleId: 'bad', tenantId: 'also-bad' }),
    });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).code).toBe('VALIDATION_ERROR');
  });

  it('AT-FC24-C-ASSIGN-18: GET /me/permissions sin tenantId → tid=null (line 33)', async () => {
    (db.execute as Mock).mockResolvedValueOnce([[]]); // resolveEffectivePermissions → empty
    const res = await app.inject({
      method: 'GET',
      url: '/v1/cosmonauts/me/permissions',
      headers: { authorization: `Bearer ${arcToken}` },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).data.permissions).toHaveLength(0);
  });

  it('AT-FC24-C-ASSIGN-19: GET /arcs con caller no MU/Ω → requireMuOrOmega → 403 (line 56)', async () => {
    // arcToken (roleId=3, permissions=[]) → not Ω → db.execute returns [] (no membership) → 403
    const res = await app.inject({
      method: 'GET',
      url: '/v1/cosmonauts/arcs?tenantId=5',
      headers: { authorization: `Bearer ${arcToken}` },
    });
    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.body).code).toBe('FORBIDDEN');
  });

  it('AT-FC24-C-ASSIGN-20: POST /arcs cosmonaut_type=ARC con caller no MU/Ω → 403 (line 108)', async () => {
    // arcToken → else block (ARC creation) → requireMuOrOmega → db.execute → [] → 403
    const res = await app.inject({
      method: 'POST',
      url: '/v1/cosmonauts/arcs',
      headers: { authorization: `Bearer ${arcToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({ userId: 30, tenantId: 5, cosmonaut_type: 'ARC' }),
    });
    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.body).code).toBe('FORBIDDEN');
  });

  it('AT-FC24-C-ASSIGN-21: POST /:userId/roles con caller no MU/Ω → 403 (line 150)', async () => {
    // arcToken → requireMuOrOmega(5) → db.execute → [] → 403
    const res = await app.inject({
      method: 'POST',
      url: '/v1/cosmonauts/20/roles',
      headers: { authorization: `Bearer ${arcToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({ roleId: 1, tenantId: 5 }),
    });
    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.body).code).toBe('FORBIDDEN');
  });

  it('AT-FC24-C-ASSIGN-22: POST /arcs MU con token sin permissions → permissions??[] (line 97)', async () => {
    // Token without permissions field → callerUser.permissions=undefined → undefined??[] → [] → not omega
    const { jwt: jwt2 } = app as unknown as { jwt: { sign: (_p: object) => string } };
    const noPermsToken = jwt2.sign({ id: 10, roleId: 2 });
    const res = await app.inject({
      method: 'POST',
      url: '/v1/cosmonauts/arcs',
      headers: { authorization: `Bearer ${noPermsToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({ userId: 30, tenantId: 5, cosmonaut_type: 'MU' }),
    });
    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.body).code).toBe('FORBIDDEN');
  });
});
