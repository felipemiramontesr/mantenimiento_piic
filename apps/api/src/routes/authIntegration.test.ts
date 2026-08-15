import { describe, it, expect, vi, beforeEach, beforeAll, afterAll, afterEach, Mock } from 'vitest';
import { hash as argon2Hash, verify as argon2Verify } from '@node-rs/argon2';
import buildApp from '../index';
import db from '../services/db';
import FleetService from '../services/fleetService';
import {
  resolveAuthContext,
  resolveAuthContextForRefresh,
  isTenantAssignmentActive,
  resolveEffectivePermissions,
  deriveOwnerType,
  getAvailableTenants,
  MultiMembershipHaltError,
  type ResolvedAuthContext,
} from '../middleware/cosmonautMiddleware';

/**
 * 🔱 Archon Integration Test: Nucleus Saturation (v.43.0.0)
 * Absolute Branch/Line/Statement/Function Coverage Strike
 *
 * FC 082 F3b (089_AN, O✓Alfa/R✓Bravo) — la resolución de permisos/tenant/ownerType
 * se mockea a nivel de cosmonautMiddleware (ya unit-testeada en
 * middleware/__tests__/cosmonautMiddleware.test.ts), no recomponiendo la cadena
 * SQL legacy (user_roles/role_permissions, retirada — Cond.5/9 Bravo).
 */

const mockConnection = {
  beginTransaction: vi.fn(),
  commit: vi.fn(),
  rollback: vi.fn(),
  release: vi.fn(),
  execute: vi.fn().mockResolvedValue([[], undefined]),
};

vi.mock('../services/db', () => ({
  default: {
    execute: vi.fn().mockResolvedValue([[], undefined]),
    getConnection: vi.fn(() => Promise.resolve(mockConnection)),
  },
}));
vi.mock('@node-rs/argon2', () => ({ hash: vi.fn(), verify: vi.fn() }));
vi.mock('../services/fleetService', () => ({
  default: { getUserOwnerIds: vi.fn().mockResolvedValue([]) },
}));
vi.mock('../services/encryption', () => ({
  default: {
    encrypt: vi.fn((v) => `enc_${v}`),
    decrypt: vi.fn((v) => (v ? v.replace('enc_', '') : '')),
  },
}));
vi.mock('../middleware/cosmonautMiddleware', async () => {
  const actual = await vi.importActual<typeof import('../middleware/cosmonautMiddleware')>(
    '../middleware/cosmonautMiddleware'
  );
  return {
    ...actual,
    resolveAuthContext: vi.fn(),
    resolveAuthContextForRefresh: vi.fn(),
    resolveEffectivePermissions: vi.fn().mockResolvedValue([]),
    deriveOwnerType: vi.fn().mockResolvedValue(null),
    getAvailableTenants: vi.fn().mockResolvedValue([]),
    isTenantAssignmentActive: vi.fn().mockResolvedValue(false),
  };
});

const ARC_NO_TENANT: ResolvedAuthContext = {
  tenantId: null,
  permissions: [],
  ownerType: null,
  availableTenants: [],
};
const OMEGA_CTX: ResolvedAuthContext = {
  tenantId: null,
  permissions: ['*'],
  ownerType: null,
  availableTenants: [],
};

describe('authIntegration.test', () => {
  const app = buildApp();
  const validCreds = { username: 'admin_test', password: 'password123' };
  let mockToken: string;
  let omegaToken: string;

  beforeAll(async () => {
    await app.ready();
    // FC159 T5b — GET/PATCH /users ahora exigen `user:admin` (userAdminGuard).
    // mockToken se usa en tests genéricos que no ejercitan el estado Ω/scope en
    // sí (resiliencia, validación, PATCH identity) — permissions:['*'] lo hace
    // pasar el guard nuevo y preserva `resolveOwnerScope → null` (mismo footprint
    // de llamadas a DB que antes de FC159, cuando el resolver local siempre caía
    // a null para un actor sin `fleet:scoped`).
    mockToken = await (
      app as unknown as { jwt: { sign: (_p: object) => Promise<string> } }
    ).jwt.sign({ id: 1, email: 'admin@piic.mx', permissions: ['*'] });
    // FC 082 F3c Cond.1 (Bravo) — R4 exige que el caller sea Ω (roleId=0) para
    // asignar role_id=0; mockToken no lleva roleId, así que las pruebas de esa
    // rama necesitan un token propio con el claim real.
    omegaToken = await (
      app as unknown as { jwt: { sign: (_p: object) => Promise<string> } }
    ).jwt.sign({ id: 1, email: 'admin@piic.mx', roleId: 0, permissions: ['*'] });
  });

  beforeEach(() => {
    vi.resetAllMocks();
    (db.execute as Mock).mockResolvedValue([[], undefined]);
    (argon2Verify as Mock).mockResolvedValue(true);
    (argon2Hash as Mock).mockResolvedValue('hash_value');
    // FC 082 F3b — default: Arc puro sin tenant (la mayoría de los tests de este
    // bloque no ejercitan la resolución de tenant/permisos en sí, solo el flujo).
    vi.mocked(resolveAuthContext).mockResolvedValue({ ...ARC_NO_TENANT });
    vi.mocked(resolveAuthContextForRefresh).mockResolvedValue({ ...ARC_NO_TENANT });
    vi.mocked(isTenantAssignmentActive).mockResolvedValue(false);
  });

  const authHeader = (): Record<string, string> => ({
    Authorization: `Bearer ${mockToken}`,
  });

  it('Path: Successful Login Matrix', async () => {
    (db.execute as Mock).mockResolvedValueOnce([
      [
        {
          id: 1,
          username: 'admin_test',
          email: 'enc_a',
          password_hash: 'h',
          role_id: 1,
          role_name: 'Admin',
          profile_picture_url: 'avatar.png',
        },
      ],
      undefined,
    ]);
    const r1 = await app.inject({ method: 'POST', url: '/v1/auth/login', payload: validCreds });
    expect(r1.statusCode).toBe(200);
    expect(JSON.parse(r1.body).user.imageUrl).toContain('/profile-image');

    // Plan Omega: data URI should pass through directly
    (db.execute as Mock).mockResolvedValueOnce([
      [
        {
          id: 3,
          username: 'omega_test',
          email: 'enc_omega',
          password_hash: 'h',
          role_id: 1,
          role_name: 'Admin',
          profile_picture_url: 'data:image/jpeg;base64,/9j/test',
        },
      ],
      undefined,
    ]);
    const r1b = await app.inject({ method: 'POST', url: '/v1/auth/login', payload: validCreds });
    expect(r1b.statusCode).toBe(200);
    expect(JSON.parse(r1b.body).user.imageUrl).toContain('data:image/jpeg;base64,');

    const email = 'target@piic.mx';
    (db.execute as Mock)
      .mockResolvedValueOnce([[], undefined])
      .mockResolvedValueOnce([[{ id: 2, email: `enc_${email}`, is_active: 1 }], undefined])
      .mockResolvedValueOnce([
        [
          {
            id: 2,
            username: 'u_target',
            email: `enc_${email}`,
            passwordHash: 'h',
            roleId: 2,
            roleName: 'U',
            imageUrl: 'pic.jpg',
          },
        ],
        undefined,
      ]);
    vi.mocked(resolveAuthContext).mockResolvedValueOnce({
      tenantId: null,
      permissions: ['fleet:view', 'maint:view'],
      ownerType: null,
      availableTenants: [],
    });
    const r2 = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { username: email, password: 'p' },
    });
    expect(r2.statusCode).toBe(200);
    expect(JSON.parse(r2.body).user.imageUrl).toContain('/profile-image');
  });

  // FC 082 F0c — "Register & Conflict Sovereign Logic" murió con POST /register
  // (bandas {1,3,4} — 084_AN §1a); el gate confirma la ruta muerta.
  it('Path: POST /register purgado responde 404', async () => {
    const r1 = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: { username: 'user70', email: 'e70@e.com', password: 'Archon@1234!' },
    });
    expect(r1.statusCode).toBe(404);
  });

  it('Path: Users (Filtered & Unfiltered) — Roles (FC 082 F3c2: retirado, 410)', async () => {
    (db.execute as Mock).mockResolvedValueOnce([[{ id: 1, email: 'e', role_id: 1 }], undefined]);
    const r1 = await app.inject({ method: 'GET', url: '/v1/auth/users', headers: authHeader() });
    expect(r1.statusCode).toBe(200);

    (db.execute as Mock).mockResolvedValueOnce([[{ id: 2, email: 'e2', role_id: 2 }], undefined]);
    const r1b = await app.inject({
      method: 'GET',
      url: '/v1/auth/users?role=2',
      headers: authHeader(),
    });
    expect(r1b.statusCode).toBe(200);

    const r2 = await app.inject({ method: 'GET', url: '/v1/auth/roles', headers: authHeader() });
    expect(r2.statusCode).toBe(410);
  });

  it('Path: PATCH Identity (Active & Inactive)', async () => {
    mockConnection.execute
      .mockResolvedValueOnce([[{ id: 1 }], undefined]) // Snapshot Before 1
      .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]) // Update 1
      .mockResolvedValueOnce([[{ id: 1 }], undefined]) // Snapshot After 1
      .mockResolvedValueOnce([[{ id: 1 }], undefined]) // Snapshot Before 2
      .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]) // Update 2
      .mockResolvedValueOnce([[{ id: 1 }], undefined]) // Snapshot After 2
      .mockResolvedValueOnce([[{ id: 1 }], undefined]) // Snapshot Before 3
      .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]) // Update 3
      .mockResolvedValueOnce([[{ id: 1 }], undefined]); // Snapshot After 3
    await app.inject({
      method: 'PATCH',
      url: '/v1/auth/users/1',
      headers: authHeader(),
      payload: { data: { fullName: 'N', is_active: true }, reason: 'Rectification A' },
    });
    await app.inject({
      method: 'PATCH',
      url: '/v1/auth/users/1',
      headers: authHeader(),
      payload: { data: { is_active: false }, reason: 'Rectification B' },
    });
    // FC 082 F3c Cond.1 (Bravo) — R4: roleId ya no forma parte de este payload
    // (solo 0 sería válido, y requeriría caller Ω — ver los 2 tests siguientes).
    const p3 = {
      department: 'D',
      email: 'e@e.com',
      password: 'password123',
      profilePictureUrl: 'p.jpg',
      employeeNumber: 'E1',
      departmentId: 5,
    };
    const r3 = await app.inject({
      method: 'PATCH',
      url: '/v1/auth/users/1',
      headers: authHeader(),
      payload: { data: p3, reason: 'Rectification C' },
    });
    expect(r3.statusCode).toBe(200);
  });

  // FC159 — mockToken ahora es Ω-equivalente (permissions:['*']) para simplificar
  // los tests genéricos; estos 2 casos exigen específicamente un actor NO-Ω que
  // sí tenga `user:admin` (pasa userAdminGuard, pero no adminIsOmega).
  const nonOmegaAdminHeader = async (): Promise<Record<string, string>> => {
    const t = await (app as unknown as { jwt: { sign: (_p: object) => Promise<string> } }).jwt.sign(
      { id: 1, email: 'admin@piic.mx', permissions: ['user:admin'] }
    );
    return { Authorization: `Bearer ${t}` };
  };

  // FC 082 F3c Cond.1 (Bravo) — R4: roles solo conserva la fila 0 desde mig.164;
  // cualquier roleId != 0 se rechaza explícito (400) antes de tocar la DB.
  it('PATCH roleId != 0 — 400 ROLE_ID_UNSUPPORTED (roles legacy purgada salvo id=0)', async () => {
    const r = await app.inject({
      method: 'PATCH',
      url: '/v1/auth/users/1',
      headers: await nonOmegaAdminHeader(),
      payload: { data: { roleId: 2 }, reason: 'Attempt legacy role' },
    });
    expect(r.statusCode).toBe(400);
    expect(JSON.parse(r.payload).code).toBe('ROLE_ID_UNSUPPORTED');
  });

  it('PATCH roleId=0 — 403 FORBIDDEN si el caller no es Ω', async () => {
    const r = await app.inject({
      method: 'PATCH',
      url: '/v1/auth/users/5',
      headers: await nonOmegaAdminHeader(), // user:admin, sin roleId/'*' (no-Ω)
      payload: { data: { roleId: 0 }, reason: 'Attempt Archon grant as non-Ω' },
    });
    expect(r.statusCode).toBe(403);
    expect(JSON.parse(r.payload).code).toBe('FORBIDDEN');
  });

  it('PATCH — roleId=0 by Ω persists role change via cosmonaut_role_assignments (no user_roles)', async () => {
    (db.execute as Mock)
      .mockResolvedValueOnce([[], undefined]) // antiEscalationGuard -> resolveEffectivePermissions(admin.id, null)
      .mockResolvedValueOnce([[{ role_id: 0 }], undefined]); // antiEscalationGuard -> omegaCheck bypass
    mockConnection.execute
      .mockResolvedValueOnce([[{ id: 5 }], undefined]) // Snapshot Before
      .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]) // UPDATE users SET role_id=0
      .mockResolvedValueOnce([[{ id: 8 }], undefined]) // SELECT cosmonaut_roles WHERE name='GrayMan'
      .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]) // UPDATE cosmonaut_role_assignments revoke
      .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]) // INSERT cosmonaut_role_assignments
      .mockResolvedValueOnce([[{ id: 5, role_id: 0 }], undefined]); // Snapshot After
    const r = await app.inject({
      method: 'PATCH',
      url: '/v1/auth/users/5',
      headers: { Authorization: `Bearer ${omegaToken}` },
      payload: { data: { roleId: 0 }, reason: 'Revert to Archon role' },
    });
    expect(r.statusCode).toBe(200);
    expect(JSON.parse(r.payload).success).toBe(true);
    const calls = mockConnection.execute.mock.calls.map((c) => String(c[0]));
    expect(calls.some((sql) => sql.includes('user_roles'))).toBe(false);
    expect(calls.some((sql) => sql.includes('cosmonaut_role_assignments'))).toBe(true);
    // Hallazgo soft Bravo (auditoría F3c1) — UNIQUE(user_id,role_id,tenant_id)
    // no protege con tenant_id NULL (NULL≠NULL); el INSERT debe ser NULL-safe
    // vía WHERE NOT EXISTS, no INSERT IGNORE (mismo footgun que mig.155).
    const insertSql = calls.find((sql) => sql.includes('INSERT INTO cosmonaut_role_assignments'));
    expect(insertSql).toBeDefined();
    expect(insertSql).toContain('WHERE NOT EXISTS');
    expect(insertSql).not.toContain('INSERT IGNORE');
  });

  it('Resilience: Catch Block Nucleus (Aggressive Rejection)', async () => {
    (db.execute as Mock).mockImplementation(() => {
      throw new Error('FATAL');
    });
    (db.getConnection as Mock).mockImplementation(() => {
      throw new Error('FATAL_CONN');
    });

    // FC 082 F0c — /register fuera de la matriz: el endpoint murió (404, no 500).
    const r1 = await app.inject({ method: 'POST', url: '/v1/auth/login', payload: validCreds });
    const r3 = await app.inject({
      method: 'GET',
      url: '/v1/auth/users',
      headers: authHeader(),
    });
    const r4 = await app.inject({
      method: 'PATCH',
      url: '/v1/auth/users/1',
      headers: authHeader(),
      payload: { data: { fullName: 'X' }, reason: 'FATAL_REASON' },
    });
    // GET /auth/roles excluido: FC 082 F3c2 lo retiró a 410 estático, sin
    // tocar DB — ya no ejercita el catch-block que este test verifica.
    expect([r1, r3, r4].every((r) => r.statusCode === 500)).toBe(true);
  });

  it('Edge: Validation & Atomic Fallbacks', async () => {
    (db.execute as Mock).mockResolvedValueOnce([
      [
        {
          id: 9,
          username: 'GrayMan',
          email: 'e',
          password_hash: 'h',
          role_id: 0,
          is_active: 0,
          employeeNumber: 'E-001',
        },
      ],
    ]);
    const r1 = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { username: 'GrayMan', password: 'p' },
    });
    expect(r1.statusCode).toBe(200);
    const body1 = JSON.parse(r1.body);
    expect(body1.user.is_active).toBe(false);
    expect(body1.user.employeeNumber).toBe('E-001');

    (db.execute as Mock).mockResolvedValueOnce(null);
    await app.inject({ method: 'POST', url: '/v1/auth/login', payload: validCreds });

    await app.inject({ method: 'POST', url: '/v1/auth/login', payload: {} });
    await app.inject({ method: 'POST', url: '/v1/auth/login', payload: { username: 'u' } });
    await app.inject({
      method: 'PATCH',
      url: '/v1/auth/users/1',
      payload: { data: {}, reason: 'R' },
    });

    (db.execute as Mock)
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[{ id: 3, email: 'corrupted', is_active: 1 }]]);
    await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { username: 'any', password: 'p' },
    });

    // Login fail password
    (argon2Verify as Mock).mockResolvedValueOnce(false);
    (db.execute as Mock).mockResolvedValueOnce([
      [{ id: 1, username: 'u', password_hash: 'h', role_id: 2 }],
    ]);
    const rFailPass = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: validCreds,
    });
    expect(rFailPass.statusCode).toBe(401);
    expect(JSON.parse(rFailPass.body)).toEqual({ error: 'L4' });

    // Validation rejection paths (FC 082 F0c: /register murió — fuera del edge)
    // FC159 — requiere headers ahora que userAdminGuard corre antes que el
    // parseo del handler (antes la validación del body corría sin auth previa).
    const rV2 = await app.inject({
      method: 'PATCH',
      url: '/v1/auth/users/1',
      headers: authHeader(),
      payload: { data: { email: 'not-an-email' }, reason: 'VALIDATION_FAIL' },
    });
    expect(rV2.statusCode).toBe(400);
  });

  it('Deep: findUserByEmail Resilience Matrix', async () => {
    // 53-54: response is null
    (db.execute as Mock).mockResolvedValueOnce([[]]).mockResolvedValueOnce(null);
    await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { username: 'e@e.com', password: 'p' },
    });

    // 57-58: results is null
    (db.execute as Mock).mockResolvedValueOnce([[]]).mockResolvedValueOnce([null]);
    await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { username: 'e@e.com', password: 'p' },
    });

    // 70-71: !found
    (db.execute as Mock).mockResolvedValueOnce([[]]).mockResolvedValueOnce([[{ email: 'not-me' }]]);
    await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { username: 'target@t.com', password: 'p' },
    });

    // 77-78: fullResponse is null
    (db.execute as Mock)
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[{ id: 5, email: 'e@e.com', is_active: 1 }]])
      .mockResolvedValueOnce(null);
    await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { username: 'e@e.com', password: 'p' },
    });

    // 81-83: !fullRows[0]
    (db.execute as Mock)
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[{ id: 6, email: 'e@e.com', is_active: 1 }]])
      .mockResolvedValueOnce([[]]);
    await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { username: 'e@e.com', password: 'p' },
    });
  });

  // ─── GET /users/:uuid/node ────────────────────────────────────────────────────

  // ─── GET /me ─────────────────────────────────────────────────────────────────

  it('GET /me — 404 when user not found in DB', async () => {
    (db.execute as Mock).mockResolvedValueOnce([[], undefined]);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/auth/me',
      headers: authHeader(),
    });
    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.payload).code).toBe('NOT_FOUND');
  });

  it('GET /me — 200 uses resolveAuthContextForRefresh (Cond.7 paridad login/me)', async () => {
    const userRow = {
      id: 1,
      uuid: 'uuid-1',
      username: 'tech02',
      full_name: 'Tecnico 2',
      email: 'enc_t2@piic.mx',
      role_id: 5,
      employee_number: 'E005',
      is_active: 1,
      last_login: null,
      created_at: '2026-01-01',
      profile_picture_url: null,
      department_id: null,
      role_name: 'Tecnico',
      department_name: null,
    };
    (db.execute as Mock).mockResolvedValueOnce([[userRow], undefined]);
    vi.mocked(resolveAuthContextForRefresh).mockResolvedValueOnce({
      tenantId: 7,
      permissions: ['fleet:view'],
      ownerType: 'FLOTILLA',
      availableTenants: [7],
    });

    const res = await app.inject({
      method: 'GET',
      url: '/v1/auth/me',
      headers: authHeader(),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.data.capabilities).toContain('fleet:view');
    expect(body.data.tenantId).toBe(7);
    expect(body.data.ownerType).toBe('FLOTILLA');
    expect(vi.mocked(resolveAuthContextForRefresh)).toHaveBeenCalledWith(1, 5, undefined);
  });

  it('GET /me — 200 with roleId=0 returns capabilities=[*]', async () => {
    const userRow = {
      id: 1,
      uuid: 'uuid-1',
      username: 'admin',
      full_name: 'Admin User',
      email: 'enc_admin@piic.mx',
      role_id: 0,
      employee_number: 'E000',
      is_active: 1,
      last_login: null,
      created_at: '2026-01-01',
      profile_picture_url: null,
      department_id: null,
      role_name: 'ARCHON',
      department_name: null,
    };
    (db.execute as Mock).mockResolvedValueOnce([[userRow], undefined]);
    vi.mocked(resolveAuthContextForRefresh).mockResolvedValueOnce({ ...OMEGA_CTX });

    const res = await app.inject({
      method: 'GET',
      url: '/v1/auth/me',
      headers: authHeader(),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.data.capabilities).toEqual(['*']);
    expect(body.data.tenantId).toBeNull();
  });

  it('GET /me — 200 with non-0 role fetches permissions via resolveAuthContextForRefresh', async () => {
    const userRow = {
      id: 1,
      uuid: 'uuid-1',
      username: 'tech01',
      full_name: 'Tecnico',
      email: 'enc_tech@piic.mx',
      role_id: 3,
      employee_number: 'E003',
      is_active: 1,
      last_login: null,
      created_at: '2026-01-01',
      profile_picture_url: null,
      department_id: 2,
      role_name: 'Tecnico',
      department_name: 'Taller',
    };
    (db.execute as Mock).mockResolvedValueOnce([[userRow], undefined]);
    vi.mocked(resolveAuthContextForRefresh).mockResolvedValueOnce({
      tenantId: null,
      permissions: ['maint:write'],
      ownerType: null,
      availableTenants: [],
    });

    const res = await app.inject({
      method: 'GET',
      url: '/v1/auth/me',
      headers: authHeader(),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.data.capabilities).toContain('maint:write');
  });

  it('GET /me — 409 MULTI_TENANT_MEMBERSHIP_UNRESOLVED on R2a halt', async () => {
    const userRow = {
      id: 1,
      uuid: 'uuid-1',
      username: 'multi',
      full_name: 'Multi',
      email: 'enc_multi@piic.mx',
      role_id: 2,
      is_active: 1,
      role_name: 'Arc',
    };
    (db.execute as Mock).mockResolvedValueOnce([[userRow], undefined]);
    vi.mocked(resolveAuthContextForRefresh).mockRejectedValueOnce(
      new MultiMembershipHaltError(1, [7, 8])
    );

    const res = await app.inject({
      method: 'GET',
      url: '/v1/auth/me',
      headers: authHeader(),
    });
    expect(res.statusCode).toBe(409);
    expect(JSON.parse(res.payload).code).toBe('MULTI_TENANT_MEMBERSHIP_UNRESOLVED');
  });

  it('GET /me — 500 on DB error', async () => {
    (db.execute as Mock).mockRejectedValueOnce(new Error('DB_FAIL'));
    const res = await app.inject({
      method: 'GET',
      url: '/v1/auth/me',
      headers: authHeader(),
    });
    expect(res.statusCode).toBe(500);
    expect(JSON.parse(res.payload).code).toBe('INTERNAL_ERROR');
  });

  // ─── GET /users/:uuid/node ────────────────────────────────────────────────────

  it('GET /users/:uuid/node — happy path returns user + permissions + routes', async () => {
    const omniToken = await (
      app as unknown as { jwt: { sign: (_p: object) => Promise<string> } }
    ).jwt.sign({ id: 1, email: 'a@a.mx', permissions: ['*'] });
    const uuid = 'fd88fbc8-6060-11f1-8001-30f6ef81858e';
    const userRow = {
      id: 10,
      uuid,
      username: 'graymantest',
      full_name: 'Test User',
      email: 'enc_test@a.mx',
      role_id: 2,
      employee_number: 'E001',
      is_active: 1,
      last_login: null,
      created_at: '2026-01-01',
      profile_picture_url: null,
      department_id: 1,
      role_name: 'Admin',
      department_name: 'IT',
    };
    // FC 082 F3c Cond.1 (Bravo) — R3: role_id=2 (no Ω) entra al chasis cosmonauta.
    // Sin membresías/asignaciones sembradas, resolvePrimaryTenant/permisos/nombre
    // de rol resuelven vacío por el default del mock (comportamiento real correcto
    // para un usuario sin cosmonaut_role_assignments, no un artefacto del test).
    (db.execute as Mock).mockResolvedValueOnce([[userRow]]).mockResolvedValueOnce([
      [
        {
          uuid: 'r-uuid',
          unit_id: 'ASM-001',
          destination: 'Mina',
          status: 'COMPLETED',
          start_at: null,
          end_at: null,
        },
      ],
    ]);
    const res = await app.inject({
      method: 'GET',
      url: `/v1/auth/users/${uuid}/node`,
      headers: { Authorization: `Bearer ${omniToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload) as {
      success: boolean;
      data: { user: { username: string }; permissions: unknown[] };
    };
    expect(body.success).toBe(true);
    expect(body.data.user.username).toBe('graymantest');
    expect(body.data.permissions).toEqual([]);
  });

  it('GET /users/:uuid/node — resolves permissions + role name via cosmonaut_role_assignments', async () => {
    const omniToken = await (
      app as unknown as { jwt: { sign: (_p: object) => Promise<string> } }
    ).jwt.sign({ id: 1, email: 'a@a.mx', permissions: ['*'] });
    const uuid = 'fd88fbc8-6060-11f1-8001-30f6ef818500';
    const userRow = {
      id: 21,
      uuid,
      username: 'arctest',
      full_name: 'Arc Test',
      email: 'enc_arc@a.mx',
      role_id: 2,
      employee_number: 'E021',
      is_active: 1,
      last_login: null,
      created_at: '2026-01-01',
      profile_picture_url: null,
      department_id: null,
      department_name: null,
    };
    (db.execute as Mock)
      .mockResolvedValueOnce([[userRow]]) // user select
      .mockResolvedValueOnce([[{ owner_id: 4 }]]) // resolvePrimaryTenant -> tenant_user_memberships (1 fila)
      .mockResolvedValueOnce([[{ slug: 'maint:write', description: 'Registrar mantenimientos' }]]) // cosmonaut permissions JOIN
      .mockResolvedValueOnce([[{ name: 'Arc' }]]) // cosmonaut role name
      .mockResolvedValueOnce([[]]); // recent routes
    const res = await app.inject({
      method: 'GET',
      url: `/v1/auth/users/${uuid}/node`,
      headers: { Authorization: `Bearer ${omniToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload) as {
      data: { user: { role_name: string }; permissions: { slug: string }[] };
    };
    expect(body.data.permissions).toEqual([
      { slug: 'maint:write', description: 'Registrar mantenimientos' },
    ]);
    expect(body.data.user.role_name).toBe('Arc');
  });

  it('GET /users/:uuid/node — role_id=0 (Ω) skips cosmonaut lookup, role_name=GrayMan', async () => {
    const omniToken = await (
      app as unknown as { jwt: { sign: (_p: object) => Promise<string> } }
    ).jwt.sign({ id: 1, email: 'a@a.mx', permissions: ['*'] });
    const uuid = 'fd88fbc8-6060-11f1-8001-30f6ef818501';
    const userRow = {
      id: 1,
      uuid,
      username: 'graymanself',
      full_name: 'GrayMan',
      email: 'enc_gm@a.mx',
      role_id: 0,
      employee_number: 'E000',
      is_active: 1,
      last_login: null,
      created_at: '2026-01-01',
      profile_picture_url: null,
      department_id: null,
      department_name: null,
    };
    (db.execute as Mock).mockResolvedValueOnce([[userRow]]).mockResolvedValueOnce([[]]); // recent routes
    const res = await app.inject({
      method: 'GET',
      url: `/v1/auth/users/${uuid}/node`,
      headers: { Authorization: `Bearer ${omniToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload) as {
      data: { user: { role_name: string }; permissions: unknown[] };
    };
    expect(body.data.permissions).toEqual([]);
    expect(body.data.user.role_name).toBe('GrayMan');
  });

  it('GET /users/:uuid/node — 409 MULTI_TENANT_MEMBERSHIP_UNRESOLVED on R2a halt', async () => {
    const omniToken = await (
      app as unknown as { jwt: { sign: (_p: object) => Promise<string> } }
    ).jwt.sign({ id: 1, email: 'a@a.mx', permissions: ['*'] });
    const uuid = 'fd88fbc8-6060-11f1-8001-30f6ef818502';
    const userRow = {
      id: 22,
      uuid,
      username: 'multitest',
      full_name: 'Multi Test',
      email: 'enc_multi@a.mx',
      role_id: 2,
      employee_number: 'E022',
      is_active: 1,
      last_login: null,
      created_at: '2026-01-01',
      profile_picture_url: null,
      department_id: null,
      department_name: null,
    };
    (db.execute as Mock)
      .mockResolvedValueOnce([[userRow]]) // user select
      .mockResolvedValueOnce([[{ owner_id: 4 }, { owner_id: 9 }]]); // R2a: >1 membresía
    const res = await app.inject({
      method: 'GET',
      url: `/v1/auth/users/${uuid}/node`,
      headers: { Authorization: `Bearer ${omniToken}` },
    });
    expect(res.statusCode).toBe(409);
    expect(JSON.parse(res.payload).code).toBe('MULTI_TENANT_MEMBERSHIP_UNRESOLVED');
  });

  it('GET /users/:uuid/node — 404 when user not found', async () => {
    const omniToken = await (
      app as unknown as { jwt: { sign: (_p: object) => Promise<string> } }
    ).jwt.sign({ id: 1, email: 'a@a.mx', permissions: ['*'] });
    (db.execute as Mock).mockResolvedValueOnce([[]]);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/auth/users/nonexistent-uuid/node',
      headers: { Authorization: `Bearer ${omniToken}` },
    });
    expect(res.statusCode).toBe(404);
  });

  it('GET /users/:uuid/node — 403 without user:admin permission', async () => {
    const noPermToken = await (
      app as unknown as { jwt: { sign: (_p: object) => Promise<string> } }
    ).jwt.sign({ id: 1, email: 'a@a.mx', permissions: ['fleet:view'] });
    const res = await app.inject({
      method: 'GET',
      url: '/v1/auth/users/any-uuid/node',
      headers: { Authorization: `Bearer ${noPermToken}` },
    });
    expect(res.statusCode).toBe(403);
  });

  it('GET /users/:uuid/node — 500 on DB error', async () => {
    const omniToken = await (
      app as unknown as { jwt: { sign: (_p: object) => Promise<string> } }
    ).jwt.sign({ id: 1, email: 'a@a.mx', permissions: ['*'] });
    (db.execute as Mock).mockRejectedValueOnce(new Error('DB error'));
    const res = await app.inject({
      method: 'GET',
      url: '/v1/auth/users/any-uuid/node',
      headers: { Authorization: `Bearer ${omniToken}` },
    });
    expect(res.statusCode).toBe(500);
  });

  it('GET /users/:uuid/node — passes through non-encrypted email unchanged (line 530 decrypt)', async () => {
    const omniToken = await (
      app as unknown as { jwt: { sign: (_p: object) => Promise<string> } }
    ).jwt.sign({ id: 1, email: 'a@a.mx', permissions: ['*'] });
    const userRow = {
      id: 10,
      uuid: 'uuid-corrupted',
      username: 'user10',
      full_name: 'User Ten',
      email: 'corrupted',
      role_id: 2,
      employee_number: 'E010',
      is_active: 1,
      last_login: null,
      created_at: '2026-01-01',
      profile_picture_url: null,
      department_id: null,
      role_name: 'Admin',
      department_name: null,
    };
    (db.execute as Mock)
      .mockResolvedValueOnce([[userRow], undefined])
      .mockResolvedValueOnce([[], undefined])
      .mockResolvedValueOnce([[], undefined]);

    const res = await app.inject({
      method: 'GET',
      url: '/v1/auth/users/uuid-corrupted/node',
      headers: { Authorization: `Bearer ${omniToken}` },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload).data.user.email).toBe('corrupted');
  });

  // ─── POST /login — access token claims ───────────────────────────────────────

  it('POST /login — access token has exp claim and type=access', async () => {
    (db.execute as Mock).mockResolvedValueOnce([
      [
        {
          id: 5,
          username: 'admin_test',
          email: 'enc_a',
          password_hash: 'h',
          role_id: 1,
          role_name: 'Admin',
          profile_picture_url: null,
        },
      ],
      undefined,
    ]);
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: validCreds,
    });
    expect(res.statusCode).toBe(200);
    const { token } = JSON.parse(res.body);
    const decoded = app.jwt.decode<{ exp: number; type: string }>(token);
    expect(decoded).not.toBeNull();
    expect(decoded!.type).toBe('access');
    expect(typeof decoded!.exp).toBe('number');
  });

  // ─── POST /refresh ────────────────────────────────────────────────────────────

  it('POST /refresh — 401 REFRESH_FAIL when no cookie', async () => {
    const res = await app.inject({ method: 'POST', url: '/v1/auth/refresh' });
    expect(res.statusCode).toBe(401);
    expect(JSON.parse(res.payload).error).toBe('REFRESH_FAIL');
  });

  it('POST /refresh — 401 INVALID_TOKEN_TYPE when cookie has access token', async () => {
    // Sign a token with type='access' (not 'refresh')
    const wrongToken = app.jwt.sign({ id: 1, type: 'access' });
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/refresh',
      cookies: { refresh_token: wrongToken },
    });
    expect(res.statusCode).toBe(401);
    expect(JSON.parse(res.payload).error).toBe('INVALID_TOKEN_TYPE');
  });

  it('POST /refresh — 401 USER_NOT_FOUND when user is inactive/missing', async () => {
    const refreshToken = app.jwt.sign({ id: 99, type: 'refresh' }, { expiresIn: '7d' });
    (db.execute as Mock).mockResolvedValueOnce([[], undefined]); // user not found
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/refresh',
      cookies: { refresh_token: refreshToken },
    });
    expect(res.statusCode).toBe(401);
    expect(JSON.parse(res.payload).error).toBe('USER_NOT_FOUND');
  });

  it('POST /refresh — 200 with new access token (Archon role, permissions=[*])', async () => {
    const refreshToken = app.jwt.sign({ id: 1, type: 'refresh' }, { expiresIn: '7d' });
    const userRow = {
      id: 1,
      uuid: 'uuid-1',
      username: 'grayman',
      full_name: 'GrayMan',
      email: 'enc_gm@piic.mx',
      role_id: 0,
      employee_number: 'E000',
      is_active: 1,
      last_login: null,
      created_at: '2026-01-01',
      profile_picture_url: null,
      department_id: null,
      role_name: 'ARCHON',
      department_name: null,
    };
    (db.execute as Mock).mockResolvedValueOnce([[userRow], undefined]); // user query
    vi.mocked(resolveAuthContextForRefresh).mockResolvedValueOnce({ ...OMEGA_CTX });
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/refresh',
      cookies: { refresh_token: refreshToken },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(typeof body.token).toBe('string');
    const decoded = app.jwt.decode<{ type: string; permissions: string[]; tenant_id: null }>(
      body.token
    );
    expect(decoded!.type).toBe('access');
    expect(decoded!.permissions).toEqual(['*']);
    expect(decoded!.tenant_id).toBeNull();
    expect(vi.mocked(resolveAuthContextForRefresh)).toHaveBeenCalledWith(1, 0, undefined);
  });

  it('POST /refresh — 200 with new access token (non-zero role, fetches permissions)', async () => {
    const refreshToken = app.jwt.sign({ id: 2, type: 'refresh' }, { expiresIn: '7d' });
    const userRow = {
      id: 2,
      uuid: 'uuid-2',
      username: 'operador',
      full_name: 'Operador',
      email: 'enc_op@piic.mx',
      role_id: 3,
      employee_number: 'E003',
      is_active: 1,
      last_login: null,
      created_at: '2026-01-01',
      profile_picture_url: null,
      department_id: null,
      role_name: 'Tecnico',
      department_name: null,
    };
    (db.execute as Mock).mockResolvedValueOnce([[userRow], undefined]); // user query
    vi.mocked(resolveAuthContextForRefresh).mockResolvedValueOnce({
      tenantId: 9,
      permissions: ['maint:view'],
      ownerType: 'FLOTILLA',
      availableTenants: [9],
    });
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/refresh',
      cookies: { refresh_token: refreshToken },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    const decoded = app.jwt.decode<{ type: string; permissions: string[]; tenant_id: number }>(
      body.token
    );
    expect(decoded!.type).toBe('access');
    expect(decoded!.permissions).toContain('maint:view');
    expect(decoded!.tenant_id).toBe(9);
    expect(vi.mocked(resolveAuthContextForRefresh)).toHaveBeenCalledWith(2, 3, undefined);
  });

  it('POST /refresh — 200 preserves claimed tenant_id from refresh token (§9.2.1, no reversión silenciosa)', async () => {
    const refreshToken = app.jwt.sign(
      { id: 2, type: 'refresh', tenant_id: 9 },
      { expiresIn: '7d' }
    );
    const userRow = {
      id: 2,
      uuid: 'uuid-2',
      username: 'operador',
      full_name: 'Operador',
      email: 'enc_op@piic.mx',
      role_id: 3,
      is_active: 1,
      role_name: 'Tecnico',
    };
    (db.execute as Mock).mockResolvedValueOnce([[userRow], undefined]);
    vi.mocked(resolveAuthContextForRefresh).mockResolvedValueOnce({
      tenantId: 9,
      permissions: ['maint:view'],
      ownerType: 'FLOTILLA',
      availableTenants: [9, 12],
    });
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/refresh',
      cookies: { refresh_token: refreshToken },
    });
    expect(res.statusCode).toBe(200);
    expect(vi.mocked(resolveAuthContextForRefresh)).toHaveBeenCalledWith(2, 3, 9);
  });

  it('POST /refresh — 409 MULTI_TENANT_MEMBERSHIP_UNRESOLVED on R2a halt', async () => {
    const refreshToken = app.jwt.sign({ id: 2, type: 'refresh' }, { expiresIn: '7d' });
    const userRow = { id: 2, username: 'multi', role_id: 2, is_active: 1, role_name: 'Arc' };
    (db.execute as Mock).mockResolvedValueOnce([[userRow], undefined]);
    vi.mocked(resolveAuthContextForRefresh).mockRejectedValueOnce(
      new MultiMembershipHaltError(2, [9, 12])
    );
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/refresh',
      cookies: { refresh_token: refreshToken },
    });
    expect(res.statusCode).toBe(409);
    expect(JSON.parse(res.payload).code).toBe('MULTI_TENANT_MEMBERSHIP_UNRESOLVED');
  });

  it('POST /refresh — 500 INTERNAL_ERROR on DB/system error (incidente DB-1045 P3 — ya no se disfraza de 401)', async () => {
    const refreshToken = app.jwt.sign({ id: 1, type: 'refresh' }, { expiresIn: '7d' });
    (db.execute as Mock).mockRejectedValueOnce(new Error('DB_FAIL'));
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/refresh',
      cookies: { refresh_token: refreshToken },
    });
    expect(res.statusCode).toBe(500);
    expect(JSON.parse(res.payload).code).toBe('INTERNAL_ERROR');
  });

  // ─── POST /logout ─────────────────────────────────────────────────────────────

  it('POST /logout — 200 clears refresh_token cookie', async () => {
    const res = await app.inject({ method: 'POST', url: '/v1/auth/logout' });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload).success).toBe(true);
    // Cookie should be cleared (empty value or Set-Cookie with expired date)
    const setCookieHeader = res.headers['set-cookie'];
    expect(setCookieHeader).toBeDefined();
    const cookieStr = Array.isArray(setCookieHeader)
      ? setCookieHeader.join('; ')
      : String(setCookieHeader);
    expect(cookieStr).toContain('refresh_token');
  });

  // ─── ownerScope branches — scoped user paths ──────────────────────────────

  it('AUTH-NODE-SCOPE-1: GET /users/:uuid/node — scoped token, user in scope → 200 (line 1197 closing })', async () => {
    const scopedToken = await (
      app as unknown as { jwt: { sign: (_p: object) => Promise<string> } }
    ).jwt.sign({ id: 5, email: 'scoped@piic.mx', permissions: ['user:admin', 'fleet:scoped'] });
    vi.mocked(FleetService.getUserOwnerIds).mockResolvedValueOnce([10, 20]);
    const userRow = {
      id: 15,
      uuid: 'scope-uuid-1',
      username: 'scoped_user',
      full_name: 'Scoped User',
      email: 'enc_su@a.mx',
      role_id: 2,
      employee_number: 'E015',
      is_active: 1,
      last_login: null,
      created_at: '2026-01-01',
      profile_picture_url: null,
      department_id: null,
      role_name: 'Operator',
      department_name: null,
    };
    (db.execute as Mock)
      .mockResolvedValueOnce([[userRow]])
      .mockResolvedValueOnce([[{ owner_id: 10 }]]);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/auth/users/scope-uuid-1/node',
      headers: { Authorization: `Bearer ${scopedToken}` },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload).data.user.username).toBe('scoped_user');
  });

  it('AUTH-NODE-SCOPE-2: GET /users/:uuid/node — scoped token, user NOT in scope → 403 (lines 1192-1196)', async () => {
    const scopedToken = await (
      app as unknown as { jwt: { sign: (_p: object) => Promise<string> } }
    ).jwt.sign({ id: 5, email: 'scoped@piic.mx', permissions: ['user:admin', 'fleet:scoped'] });
    vi.mocked(FleetService.getUserOwnerIds).mockResolvedValueOnce([10, 20]);
    const userRow = {
      id: 15,
      uuid: 'scope-uuid-2',
      username: 'out_of_scope',
      full_name: 'Out of Scope',
      email: 'enc_oos@a.mx',
      role_id: 2,
      employee_number: 'E016',
      is_active: 1,
      last_login: null,
      created_at: '2026-01-01',
      profile_picture_url: null,
      department_id: null,
      role_name: 'Operator',
      department_name: null,
    };
    (db.execute as Mock)
      .mockResolvedValueOnce([[userRow]])
      .mockResolvedValueOnce([[{ owner_id: 99 }]]);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/auth/users/scope-uuid-2/node',
      headers: { Authorization: `Bearer ${scopedToken}` },
    });
    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.payload).code).toBe('FORBIDDEN');
  });

  it('AUTH-PUT-SCOPE-3: PUT /users/:id/owners — scoped, all owners in scope → 200 (line 858)', async () => {
    const scopedToken = await (
      app as unknown as { jwt: { sign: (_p: object) => Promise<string> } }
    ).jwt.sign({
      id: 5,
      email: 'scoped@piic.mx',
      permissions: ['admin:role:edit', 'fleet:scoped'],
    });
    vi.mocked(FleetService.getUserOwnerIds).mockResolvedValueOnce([1, 2]);
    (db.getConnection as Mock).mockResolvedValueOnce(mockConnection);
    mockConnection.execute
      .mockResolvedValueOnce([[{ id: 20 }], undefined])
      .mockResolvedValueOnce([[], undefined])
      .mockResolvedValueOnce([[{ id: 1 }], undefined])
      .mockResolvedValueOnce([[], undefined])
      .mockResolvedValueOnce([{ affectedRows: 1 }, undefined])
      .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]);
    const res = await app.inject({
      method: 'PUT',
      url: '/v1/auth/users/20/owners',
      headers: { Authorization: `Bearer ${scopedToken}` },
      payload: { ownerIds: [1], reason: 'Scope test assignment' },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload).data.ownerIds).toEqual([1]);
  });

  it('AUTH-PUT-SCOPE-4: PUT /users/:id/owners — scoped, existing memberships outside scope → 403 (lines 843-848)', async () => {
    const scopedToken = await (
      app as unknown as { jwt: { sign: (_p: object) => Promise<string> } }
    ).jwt.sign({
      id: 5,
      email: 'scoped@piic.mx',
      permissions: ['admin:role:edit', 'fleet:scoped'],
    });
    vi.mocked(FleetService.getUserOwnerIds).mockResolvedValueOnce([1, 2]);
    (db.getConnection as Mock).mockResolvedValueOnce(mockConnection);
    mockConnection.execute
      .mockResolvedValueOnce([[{ id: 20 }], undefined])
      .mockResolvedValueOnce([[{ owner_id: 99 }], undefined]);
    const res = await app.inject({
      method: 'PUT',
      url: '/v1/auth/users/20/owners',
      headers: { Authorization: `Bearer ${scopedToken}` },
      payload: { ownerIds: [1], reason: 'Outside scope test' },
    });
    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.payload).message).toBe('User outside owner scope');
  });

  it('AUTH-PUT-SCOPE-5: PUT /users/:id/owners — scoped, new ownerIds outside scope → 403 (lines 851-857)', async () => {
    const scopedToken = await (
      app as unknown as { jwt: { sign: (_p: object) => Promise<string> } }
    ).jwt.sign({
      id: 5,
      email: 'scoped@piic.mx',
      permissions: ['admin:role:edit', 'fleet:scoped'],
    });
    vi.mocked(FleetService.getUserOwnerIds).mockResolvedValueOnce([1, 2]);
    (db.getConnection as Mock).mockResolvedValueOnce(mockConnection);
    mockConnection.execute
      .mockResolvedValueOnce([[{ id: 20 }], undefined])
      .mockResolvedValueOnce([[], undefined]);
    const res = await app.inject({
      method: 'PUT',
      url: '/v1/auth/users/20/owners',
      headers: { Authorization: `Bearer ${scopedToken}` },
      payload: { ownerIds: [3], reason: 'Outside scope assignment' },
    });
    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.payload).message).toBe('Cannot assign owner outside of scope');
  });

  it('AUTH-GET-OWNERS-SCOPE-1: GET /users/:id/owners — scoped, user in scope → 200 (line 787 closing })', async () => {
    const scopedToken = await (
      app as unknown as { jwt: { sign: (_p: object) => Promise<string> } }
    ).jwt.sign({
      id: 5,
      email: 'scoped@piic.mx',
      permissions: ['admin:role:edit', 'fleet:scoped'],
    });
    vi.mocked(FleetService.getUserOwnerIds).mockResolvedValueOnce([1, 2]);
    (db.execute as Mock)
      .mockResolvedValueOnce([[{ owner_id: 1 }]])
      .mockResolvedValueOnce([
        [{ ownerId: 1, label: 'Owner A', handle: 'oa', suite: null, ownerType: 'CENTRO' }],
      ]);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/auth/users/20/owners',
      headers: { Authorization: `Bearer ${scopedToken}` },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload).success).toBe(true);
  });

  it('AUTH-GET-OWNERS-SCOPE-2: GET /users/:id/owners — scoped, user NOT in scope → 403 (lines 782-785)', async () => {
    const scopedToken = await (
      app as unknown as { jwt: { sign: (_p: object) => Promise<string> } }
    ).jwt.sign({
      id: 5,
      email: 'scoped@piic.mx',
      permissions: ['admin:role:edit', 'fleet:scoped'],
    });
    vi.mocked(FleetService.getUserOwnerIds).mockResolvedValueOnce([1, 2]);
    (db.execute as Mock).mockResolvedValueOnce([[{ owner_id: 99 }]]);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/auth/users/20/owners',
      headers: { Authorization: `Bearer ${scopedToken}` },
    });
    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.payload).message).toBe('User outside owner scope');
  });

  it('AUTH-GET-USERS-SCOPE-1: GET /users — scoped user with empty owners → 200 data:[] (lines 522-524)', async () => {
    // FC159 T5b — GET /users ahora exige `user:admin` además de `fleet:scoped`.
    const scopedToken = await (
      app as unknown as { jwt: { sign: (_p: object) => Promise<string> } }
    ).jwt.sign({ id: 5, email: 'scoped@piic.mx', permissions: ['user:admin', 'fleet:scoped'] });
    vi.mocked(FleetService.getUserOwnerIds).mockResolvedValueOnce([]);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/auth/users',
      headers: { Authorization: `Bearer ${scopedToken}` },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload).data).toEqual([]);
  });

  // ─── FC159 T5a+T5b — AuthUserManagement BOLA + guard remediation ─────────────

  it('AUTH-BOLA-T5-1: GET /users — tenant-only (user:admin, sin fleet:scoped) → scope propio, no cross-tenant', async () => {
    const tenantOnlyToken = await (
      app as unknown as { jwt: { sign: (_p: object) => Promise<string> } }
    ).jwt.sign({ id: 5, email: 'tenant@piic.mx', permissions: ['user:admin'], tenant_id: 500 });
    (db.execute as Mock).mockResolvedValueOnce([[{ id: 5, email: 'e', role_id: 1 }], undefined]);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/auth/users',
      headers: { Authorization: `Bearer ${tenantOnlyToken}` },
    });
    expect(res.statusCode).toBe(200);
    const [sql, params] = (db.execute as Mock).mock.calls[0];
    expect(sql).toContain('user_owner_membership');
    expect(params).toEqual([500]);
  });

  it('AUTH-BOLA-T5-2: DELETE /users/:id — actor con user:admin pero NO Ω → 403 (enmienda de Ω, R3b)', async () => {
    const adminNotOmegaToken = await (
      app as unknown as { jwt: { sign: (_p: object) => Promise<string> } }
    ).jwt.sign({ id: 5, email: 'admin@piic.mx', permissions: ['user:admin'] });
    const res = await app.inject({
      method: 'DELETE',
      url: '/v1/auth/users/9',
      headers: { Authorization: `Bearer ${adminNotOmegaToken}` },
      payload: { reason: 'Attempt delete as non-Omega admin' },
    });
    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.payload).code).toBe('FORBIDDEN');
  });

  it('AUTH-BOLA-T5-3: PATCH /users/:id — sin user:admin → 403 (T5b, guard nuevo)', async () => {
    const noAdminToken = await (
      app as unknown as { jwt: { sign: (_p: object) => Promise<string> } }
    ).jwt.sign({ id: 5, email: 'x@piic.mx', permissions: ['fleet:view'] });
    const res = await app.inject({
      method: 'PATCH',
      url: '/v1/auth/users/1',
      headers: { Authorization: `Bearer ${noAdminToken}` },
      payload: { data: { fullName: 'X' }, reason: 'Attempt without permission' },
    });
    expect(res.statusCode).toBe(403);
  });

  it('AUTH-BOLA-T5-4: GET /users — sin user:admin → 403 (T5b, guard nuevo, antes no exigía nada)', async () => {
    const noAdminToken = await (
      app as unknown as { jwt: { sign: (_p: object) => Promise<string> } }
    ).jwt.sign({ id: 5, email: 'x@piic.mx', permissions: ['fleet:view'] });
    const res = await app.inject({
      method: 'GET',
      url: '/v1/auth/users',
      headers: { Authorization: `Bearer ${noAdminToken}` },
    });
    expect(res.statusCode).toBe(403);
  });

  it('AUTH-BOLA-T5-5: Ω — GET y DELETE /users sin regresión (bypass total, incl. borrar)', async () => {
    (db.execute as Mock).mockResolvedValueOnce([[{ id: 1, email: 'e', role_id: 1 }], undefined]);
    const rGet = await app.inject({
      method: 'GET',
      url: '/v1/auth/users',
      headers: { Authorization: `Bearer ${omegaToken}` },
    });
    expect(rGet.statusCode).toBe(200);

    mockConnection.execute
      .mockResolvedValueOnce([[{ id: 9 }], undefined]) // snapshot before
      .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]); // delete
    const rDelete = await app.inject({
      method: 'DELETE',
      url: '/v1/auth/users/9',
      headers: { Authorization: `Bearer ${omegaToken}` },
      payload: { reason: 'Omega cleanup' },
    });
    expect(rDelete.statusCode).toBe(200);
  });

  it('AUTH-BOLA-T5-6: fleet:scoped actor — GET /users sin regresión (T2 ya correcto, sin cambio)', async () => {
    const scopedToken = await (
      app as unknown as { jwt: { sign: (_p: object) => Promise<string> } }
    ).jwt.sign({ id: 5, email: 'scoped@piic.mx', permissions: ['user:admin', 'fleet:scoped'] });
    vi.mocked(FleetService.getUserOwnerIds).mockResolvedValueOnce([7, 8]);
    (db.execute as Mock).mockResolvedValueOnce([[{ id: 5, email: 'e', role_id: 1 }], undefined]);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/auth/users',
      headers: { Authorization: `Bearer ${scopedToken}` },
    });
    expect(res.statusCode).toBe(200);
  });

  it('AUTH-LOGIN-DECRYPT-CATCH: POST /login — decrypt throws → catch false → L3 (lines 179-181)', async () => {
    const { default: EncryptionService } = await import('../services/encryption');
    vi.mocked(EncryptionService.decrypt).mockImplementationOnce(() => {
      throw new Error('Crypto error');
    });
    (db.execute as Mock)
      .mockResolvedValueOnce([[], undefined]) // WHERE username = ? → no user
      .mockResolvedValueOnce([[{ id: 99, email: 'bad_cipher', username: 'someone' }], undefined]); // findUserByEmail SELECT
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { username: 'nonexistent@test.com', password: 'pass123' },
    });
    expect(res.statusCode).toBe(401);
    expect(JSON.parse(res.payload).error).toBe('L3');
  });
});

// ─── AUTH Branch Coverage Supplement (AUTH-BC) ───────────────────────────────

describe('AUTH — branch coverage supplement (AUTH-BC)', () => {
  const bcApp = buildApp();

  beforeAll(async () => {
    await bcApp.ready();
  });

  beforeEach(() => {
    vi.resetAllMocks();
    (db.execute as Mock).mockResolvedValue([[], undefined]);
    (argon2Verify as Mock).mockResolvedValue(true);
    (argon2Hash as Mock).mockResolvedValue('hash_value');
    vi.mocked(resolveAuthContext).mockResolvedValue({ ...ARC_NO_TENANT });
    vi.mocked(resolveAuthContextForRefresh).mockResolvedValue({ ...ARC_NO_TENANT });
  });

  afterAll(async () => {
    await bcApp.close();
  });

  // FC 082 F0c — AUTH-BC-1/2 (escenarios de /register) murieron con el
  // endpoint; AUTH-BC-3 muta: sin eje suite el login ya no expone user.suite.
  it('AUTH-BC-3 (FC082 F0c): POST /login sin eje suite → user.suite ausente', async () => {
    (db.execute as Mock).mockResolvedValueOnce([
      [
        {
          id: 2,
          username: 'admin_test',
          email: 'enc_a',
          password_hash: 'h',
          role_id: 1,
          role_name: 'Admin',
          profile_picture_url: null,
        },
      ],
      undefined,
    ]);
    const res = await bcApp.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { username: 'admin_test', password: 'password123' },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).user.suite).toBeUndefined();
  });

  // FC 082 F3b — Cond.7 (Bravo) matriz de tests C-ventana-equivalente.
  // AUTH-BC-4/7 (user_roles multi-fila) retirados: esa tabla/concepto no
  // participa del cutover — cosmonaut_role_assignments no tiene equivalente
  // de "unión de varios roleIds legacy simultáneos" (089_AN §9, Cond.5/9).

  it('AUTH-BC-5 (FC082 F3b): POST /login Arc R_global sin tenant → ownerType/tenantId null', async () => {
    (db.execute as Mock).mockResolvedValueOnce([
      [
        {
          id: 5,
          username: 'admin_test',
          email: 'enc_a',
          password_hash: 'h',
          role_id: 2,
          role_name: 'Arc',
          profile_picture_url: null,
        },
      ],
      undefined,
    ]);
    vi.mocked(resolveAuthContext).mockResolvedValueOnce({ ...ARC_NO_TENANT });
    const res = await bcApp.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { username: 'admin_test', password: 'password123' },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.user.ownerType).toBeNull();
    expect(body.user.tenantId).toBeNull();
  });

  it('AUTH-BC-6 (FC082 F3b): POST /login MU con 1 tenant → ownerType FLOTILLA derivado', async () => {
    (db.execute as Mock).mockResolvedValueOnce([
      [
        {
          id: 6,
          username: 'admin_test',
          email: 'enc_a',
          password_hash: 'h',
          role_id: 2,
          role_name: 'MU',
          profile_picture_url: null,
        },
      ],
      undefined,
    ]);
    vi.mocked(resolveAuthContext).mockResolvedValueOnce({
      tenantId: 4,
      permissions: ['admin:owner:view'],
      ownerType: 'FLOTILLA',
      availableTenants: [4],
    });
    const res = await bcApp.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { username: 'admin_test', password: 'password123' },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.user.ownerType).toBe('FLOTILLA');
    expect(body.user.tenantId).toBe(4);
    expect(body.user.availableTenants).toEqual([4]);
  });

  it('AUTH-BC-7 (FC082 F3b): POST /login Arc con N tenants → availableTenants expone todos', async () => {
    (db.execute as Mock).mockResolvedValueOnce([
      [
        {
          id: 7,
          username: 'admin_test',
          email: 'enc_a',
          password_hash: 'h',
          role_id: 2,
          role_name: 'Arc',
          profile_picture_url: null,
        },
      ],
      undefined,
    ]);
    vi.mocked(resolveAuthContext).mockResolvedValueOnce({
      tenantId: 4,
      permissions: ['fleet:read'],
      ownerType: 'FLOTILLA',
      availableTenants: [4, 9],
    });
    const res = await bcApp.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { username: 'admin_test', password: 'password123' },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).user.availableTenants).toEqual([4, 9]);
  });

  it('AUTH-BC-8 (FC082 F3b): POST /login — 409 MULTI_TENANT_MEMBERSHIP_UNRESOLVED (R2a)', async () => {
    (db.execute as Mock).mockResolvedValueOnce([
      [
        {
          id: 8,
          username: 'admin_test',
          email: 'enc_a',
          password_hash: 'h',
          role_id: 2,
          role_name: 'Arc',
          profile_picture_url: null,
        },
      ],
      undefined,
    ]);
    vi.mocked(resolveAuthContext).mockRejectedValueOnce(new MultiMembershipHaltError(8, [4, 9]));
    const res = await bcApp.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { username: 'admin_test', password: 'password123' },
    });
    expect(res.statusCode).toBe(409);
    expect(JSON.parse(res.body).code).toBe('MULTI_TENANT_MEMBERSHIP_UNRESOLVED');
  });

  it('AUTH-BC-9 (FC082 F3b): POST /refresh — legacy token sin tenant_id cae a resolveAuthContext (R2c)', async () => {
    const refreshToken = bcApp.jwt.sign({ id: 12, type: 'refresh' }, { expiresIn: '7d' });
    (db.execute as Mock).mockResolvedValueOnce([
      [
        {
          id: 12,
          uuid: 'uuid-12',
          username: 'legacy',
          full_name: 'Legacy',
          email: 'enc_p@piic.mx',
          role_id: 2,
          is_active: 1,
          role_name: 'Arc',
        },
      ],
      undefined,
    ]);
    vi.mocked(resolveAuthContextForRefresh).mockResolvedValueOnce({ ...ARC_NO_TENANT });
    const res = await bcApp.inject({
      method: 'POST',
      url: '/v1/auth/refresh',
      cookies: { refresh_token: refreshToken },
    });
    expect(res.statusCode).toBe(200);
    // decoded.tenant_id del refresh legacy es undefined — confirmado el fallback R2c
    expect(vi.mocked(resolveAuthContextForRefresh)).toHaveBeenCalledWith(12, 2, undefined);
    const decoded = bcApp.jwt.decode<{ owner_type: string | null }>(JSON.parse(res.body).token);
    expect(decoded!.owner_type).toBeNull();
  });
});

// ─── AUTH-BC Production Mode (B63 + B90 + B113) ─────────────────────────────
describe('AUTH — production mode branch coverage (AUTH-BC-PROD)', () => {
  let prodApp!: ReturnType<typeof buildApp>;
  const origEnv = process.env.NODE_ENV;

  beforeAll(async () => {
    process.env.NODE_ENV = 'production';
    prodApp = buildApp();
    await prodApp.ready();
  });

  beforeEach(() => {
    vi.resetAllMocks();
    (db.execute as Mock).mockResolvedValue([[], undefined]);
    (argon2Verify as Mock).mockResolvedValue(true);
    (argon2Hash as Mock).mockResolvedValue('hash_value');
    vi.mocked(resolveAuthContext).mockResolvedValue({ ...ARC_NO_TENANT });
    vi.mocked(resolveAuthContextForRefresh).mockResolvedValue({ ...ARC_NO_TENANT });
    process.env.NODE_ENV = 'production';
  });

  afterEach(() => {
    process.env.NODE_ENV = origEnv;
  });

  afterAll(async () => {
    process.env.NODE_ENV = origEnv;
    await prodApp.close();
  });

  it('AUTH-BC-10: POST /login production → rate limit max=10 + cookie domain .piic.com.mx (B63+B90)', async () => {
    (db.execute as Mock).mockResolvedValueOnce([
      [
        {
          id: 7,
          username: 'admin_test',
          email: 'enc_a',
          password_hash: 'h',
          role_id: 1,
          role_name: 'Admin',
          profile_picture_url: null,
        },
      ],
      undefined,
    ]);
    const res = await prodApp.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { username: 'admin_test', password: 'password123' },
    });
    expect(res.statusCode).toBe(200);
    const setCookieRaw = res.headers['set-cookie'];
    const setCookie = Array.isArray(setCookieRaw) ? setCookieRaw.join('; ') : String(setCookieRaw);
    expect(setCookie).toContain('.piic.com.mx');
    // FC 062 F1 (A05) — refresh cookie hardened flags in production
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('Secure');
    expect(setCookie).toContain('SameSite=Strict');
  });

  it('AUTH-BC-11: POST /logout production → clearCookie domain .piic.com.mx (B113)', async () => {
    const res = await prodApp.inject({ method: 'POST', url: '/v1/auth/logout' });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).success).toBe(true);
    const setCookieRaw = res.headers['set-cookie'];
    const setCookie = Array.isArray(setCookieRaw) ? setCookieRaw.join('; ') : String(setCookieRaw);
    expect(setCookie).toContain('.piic.com.mx');
  });
});

// ─── POST /switch-tenant (FC 082 F3b §9.2, 089_AN — O✓Alfa/R✓Bravo Cond.2+R2b) ─
describe('POST /v1/auth/switch-tenant', () => {
  const app = buildApp();
  let arcToken: string;
  let omegaToken: string;

  beforeAll(async () => {
    await app.ready();
    arcToken = app.jwt.sign({ id: 20, roleId: 2, permissions: ['fleet:read'] });
    omegaToken = app.jwt.sign({ id: 1, roleId: 0, permissions: ['*'] });
  });

  beforeEach(() => {
    vi.resetAllMocks();
    (db.execute as Mock).mockResolvedValue([[], undefined]);
    vi.mocked(isTenantAssignmentActive).mockResolvedValue(false);
  });

  it('400 OMEGA_NO_TENANT — Ω no puede hacer switch-tenant', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/switch-tenant',
      headers: { Authorization: `Bearer ${omegaToken}` },
      payload: { tenantId: 4 },
    });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.payload).code).toBe('OMEGA_NO_TENANT');
  });

  it('400 VALIDATION_ERROR — tenantId ausente/no numérico', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/switch-tenant',
      headers: { Authorization: `Bearer ${arcToken}` },
      payload: {},
    });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.payload).code).toBe('VALIDATION_ERROR');
  });

  it('403 FORBIDDEN — sin asignación activa en el tenant solicitado (anti-enumeración)', async () => {
    vi.mocked(isTenantAssignmentActive).mockResolvedValueOnce(false);
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/switch-tenant',
      headers: { Authorization: `Bearer ${arcToken}` },
      payload: { tenantId: 999 },
    });
    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.payload).code).toBe('FORBIDDEN');
  });

  it('200 — recalcula permisos/ownerType server-side y reemite ambas cookies (R2b)', async () => {
    vi.mocked(isTenantAssignmentActive).mockResolvedValueOnce(true);
    (db.execute as Mock).mockResolvedValueOnce([
      [{ id: 20, username: 'arc_multi', role_id: 2, is_active: 1, role_name: 'Arc' }],
      undefined,
    ]);
    vi.mocked(resolveEffectivePermissions).mockResolvedValueOnce(['fleet:read', 'maint:read']);
    vi.mocked(deriveOwnerType).mockResolvedValueOnce('FLOTILLA');
    vi.mocked(getAvailableTenants).mockResolvedValueOnce([4, 9]);

    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/switch-tenant',
      headers: { Authorization: `Bearer ${arcToken}` },
      payload: { tenantId: 9 },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.user.tenantId).toBe(9);
    expect(body.user.ownerType).toBe('FLOTILLA');
    expect(body.user.permissions).toEqual(['fleet:read', 'maint:read']);

    // Nunca confía tenantId/permissions del cliente — recalculado server-side
    expect(vi.mocked(resolveEffectivePermissions)).toHaveBeenCalledWith(20, 9);

    const decoded = app.jwt.decode<{ tenant_id: number; type: string }>(body.token);
    expect(decoded!.tenant_id).toBe(9);

    // R2b — misma cookie refresh_token que /login, con el tenant_id nuevo
    const setCookieRaw = res.headers['set-cookie'];
    const setCookie = Array.isArray(setCookieRaw) ? setCookieRaw.join('; ') : String(setCookieRaw);
    expect(setCookie).toContain('refresh_token=');
    expect(setCookie).toContain('HttpOnly');
    const cookieMatch = /refresh_token=([^;]+)/.exec(setCookie);
    const refreshDecoded = app.jwt.decode<{ tenant_id: number; type: string }>(cookieMatch![1]);
    expect(refreshDecoded!.type).toBe('refresh');
    expect(refreshDecoded!.tenant_id).toBe(9);
  });

  it('404 NOT_FOUND — usuario inactivo/eliminado entre la validación y la relectura', async () => {
    vi.mocked(isTenantAssignmentActive).mockResolvedValueOnce(true);
    (db.execute as Mock).mockResolvedValueOnce([[], undefined]);
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/switch-tenant',
      headers: { Authorization: `Bearer ${arcToken}` },
      payload: { tenantId: 9 },
    });
    expect(res.statusCode).toBe(404);
  });

  it('401 sin JWT válido', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/switch-tenant',
      payload: { tenantId: 9 },
    });
    expect(res.statusCode).toBe(401);
  });

  it('500 INTERNAL_ERROR — error inesperado al recalcular permisos/ownerType', async () => {
    vi.mocked(isTenantAssignmentActive).mockResolvedValueOnce(true);
    (db.execute as Mock).mockResolvedValueOnce([
      [{ id: 20, username: 'arc_multi', role_id: 2, is_active: 1, role_name: 'Arc' }],
      undefined,
    ]);
    vi.mocked(resolveEffectivePermissions).mockRejectedValueOnce(new Error('DB_FAIL'));
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/switch-tenant',
      headers: { Authorization: `Bearer ${arcToken}` },
      payload: { tenantId: 9 },
    });
    expect(res.statusCode).toBe(500);
    expect(JSON.parse(res.payload).code).toBe('INTERNAL_ERROR');
  });
});
