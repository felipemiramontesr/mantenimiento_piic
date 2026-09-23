import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { verify as argon2Verify } from '@node-rs/argon2';
import db from './db';
import { login } from './authSession.service';

/**
 * FC176 F1 — Auth_Chassis_Measurement_And_Verification.
 * Evidencia empírica (no mockeando `cosmonautMiddleware`, a diferencia de
 * `authIntegration.test.ts`) de que `login()` ya resuelve tenant/permisos/
 * ownerType de un usuario no-Omega a través del chasis cosmonauta real
 * (`cosmonaut_role_assignments`/`tenant_user_memberships`, FC130), condición
 * previa a FC176 F2 (endpoint de siembra del primer usuario de un Universo).
 * Cond.R-176 R1 (Bravo, 309_AN): si estos tests pasan en verde, el puente ya
 * funciona y NO se reescribe `cosmonautMiddleware.ts`/`authSession.service.ts`.
 */

vi.mock('./db', () => ({
  default: { execute: vi.fn() },
}));
vi.mock('@node-rs/argon2', () => ({ verify: vi.fn() }));
vi.mock('./encryption', () => ({
  default: {
    encrypt: vi.fn((v: string) => `enc_${v}`),
    decrypt: vi.fn((v: string) => (v ? v.replace('enc_', '') : '')),
  },
}));
// FC193 F4 — resolveAuthContext techa los permisos vía getUniverseCapabilities (su propia caché por
// proceso, no `db.execute`): se mockea aparte del resto del chasis (que sigue siendo real, ver
// docstring del archivo) para no acoplar este test a esa tabla, y con RASTREO activo porque
// AT-FC176-F1-1 espera fleet:unit:view:any (RASTREO en permissionCeiling.ts) intacto — el caso
// "blueprint por defecto" (152/160), no-op probado en el propio mapa.
vi.mock('./universeCapabilities.service', () => ({
  getUniverseCapabilities: vi
    .fn()
    .mockResolvedValue({ superclusters: new Set(['RASTREO']), clusters: new Set() }),
}));

type MockDb = { execute: ReturnType<typeof vi.fn> };

const TENANT_USER_ROW = {
  id: 10,
  username: 'arc_tenant',
  email: 'enc_arc@piic.mx',
  password_hash: 'h',
  role_id: 2,
  role_name: null,
  department_name: null,
  profile_picture_url: null,
  employee_number: 'E010',
  is_active: 1,
};

const OMEGA_USER_ROW = {
  id: 1,
  username: 'grayman',
  email: 'enc_gm@piic.mx',
  password_hash: 'h',
  role_id: 0,
  role_name: 'GrayMan',
  department_name: null,
  profile_picture_url: null,
  employee_number: 'E000',
  is_active: 1,
};

describe('FC176 F1 — authSession.service login() via cosmonautMiddleware real', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (argon2Verify as Mock).mockResolvedValue(true);
  });

  it('AT-FC176-F1-1: usuario tenant no-Omega recibe tenant/permisos/ownerType reales del chasis cosmonauta', async () => {
    (db as unknown as MockDb).execute
      .mockResolvedValueOnce([[TENANT_USER_ROW], undefined]) // findUserWithRoleAndDepartmentByUsername
      .mockResolvedValueOnce([[{ owner_id: 4 }], undefined]) // resolvePrimaryTenant → tenant_user_memberships
      .mockResolvedValueOnce([[{ slug: 'fleet:unit:view:any' }], undefined]) // resolveEffectivePermissions
      .mockResolvedValueOnce([[{ code: 'FLOTILLA' }], undefined]) // deriveOwnerType
      .mockResolvedValueOnce([[{ tenantId: 4 }], undefined]) // getAvailableTenants
      .mockResolvedValueOnce([[], undefined]) // FC185 F2 — findCredentialByUserId: 0 MFA enrolado
      .mockResolvedValueOnce([[{ cosmonaut_type: 'ARC' }], undefined]); // FC185 F2 — findCosmonautType: sub-usuario, no MU → no mandatorio

    const result = await login('arc_tenant', 'password123');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.tenantId).toBe(4);
    expect(result.permissions).toEqual(['fleet:unit:view:any']);
    expect(result.ownerType).toBe('FLOTILLA');
    expect(result.availableTenants).toEqual([4]);
  });

  it('AT-FC176-F1-2 (actualizado FC185 F2): GrayMan (roleId=0) sigue bypaseando el chasis de permisos (0 consultas ahí), pero ahora el MFA es mandatorio — sin credencial enrolada, login() bloquea con MFA_SETUP_REQUIRED en vez de sesión completa', async () => {
    (db as unknown as MockDb).execute
      .mockResolvedValueOnce([[OMEGA_USER_ROW], undefined]) // findUserWithRoleAndDepartmentByUsername
      .mockResolvedValueOnce([[], undefined]); // FC185 F2 — findCredentialByUserId: 0 MFA enrolado

    const result = await login('grayman', 'password123');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result).toMatchObject({ status: 200, errorCode: 'MFA_SETUP_REQUIRED', userId: 1 });
    // 2 queries: lookup de usuario + findCredentialByUserId. El chasis de permisos
    // (resolveEffectivePermissions/deriveOwnerType/getAvailableTenants) sigue en 0 para Ω — el
    // bypass original de FC176 F1 no cambió, solo se agregó el gate de MFA después de él.
    expect((db as unknown as MockDb).execute).toHaveBeenCalledTimes(2);
  });
});

describe('FC177 F1 — login() hard-gates is_active (Cond.R-177 R2, Bravo)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (argon2Verify as Mock).mockResolvedValue(true);
  });

  it('AT-FC177-F1-1: is_active=0 con password correcto → 403 ACCOUNT_PENDING_ACTIVATION, 0 llamada a resolveAuthContext', async () => {
    (db as unknown as MockDb).execute.mockResolvedValueOnce([
      [{ ...TENANT_USER_ROW, is_active: 0 }],
      undefined,
    ]); // findUserWithRoleAndDepartmentByUsername

    const result = await login('arc_tenant', 'password123');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(403);
    expect(result.errorCode).toBe('ACCOUNT_PENDING_ACTIVATION');
    // el gate corre tras verificar password y ANTES de tocar el chasis cosmonauta —
    // 1 sola query (el lookup del usuario), 0 llamadas a resolvePrimaryTenant/etc.
    expect((db as unknown as MockDb).execute).toHaveBeenCalledTimes(1);
  });

  it('AT-FC177-F1-2: password incorrecto en cuenta is_active=0 → 401 L4, no 403 (anti-enumeración)', async () => {
    (argon2Verify as Mock).mockResolvedValue(false);
    (db as unknown as MockDb).execute.mockResolvedValueOnce([
      [{ ...TENANT_USER_ROW, is_active: 0 }],
      undefined,
    ]);

    const result = await login('arc_tenant', 'wrong-password');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(401);
    expect(result.errorCode).toBe('L4');
  });

  it('AT-FC177-F1-3: is_active=1 no se ve afectado — el gate no introduce falsos positivos', async () => {
    (db as unknown as MockDb).execute
      .mockResolvedValueOnce([[TENANT_USER_ROW], undefined])
      .mockResolvedValueOnce([[{ owner_id: 4 }], undefined])
      .mockResolvedValueOnce([[{ slug: 'fleet:unit:view:any' }], undefined])
      .mockResolvedValueOnce([[{ code: 'FLOTILLA' }], undefined])
      .mockResolvedValueOnce([[{ tenantId: 4 }], undefined])
      .mockResolvedValueOnce([[], undefined]) // FC185 F2 — findCredentialByUserId: 0 MFA enrolado
      .mockResolvedValueOnce([[{ cosmonaut_type: 'ARC' }], undefined]); // FC185 F2 — findCosmonautType: no MU

    const result = await login('arc_tenant', 'password123');

    expect(result.ok).toBe(true);
  });
});

describe('FC182 (Scenario 2, Modelo B) — login() de un Arconauta Itinerante puro (rol global Arc, 0 tenant)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (argon2Verify as Mock).mockResolvedValue(true);
  });

  it('AT-FC182-1: usuario activo con solo asignación global Arc resuelve tenantId=null y los permisos de Arc — sin cambio en authSession.service.ts, ya cubierto por el chasis cosmonauta real', async () => {
    (db as unknown as MockDb).execute
      .mockResolvedValueOnce([[TENANT_USER_ROW], undefined]) // findUserWithRoleAndDepartmentByUsername (is_active:1, FC182 nace así)
      .mockResolvedValueOnce([[], undefined]) // resolvePrimaryTenant → findTenantMembershipOwnerIds → 0 filas
      .mockResolvedValueOnce([[], undefined]) // resolvePrimaryTenant → findEarliestActiveAssignmentTenantId → 0 filas (solo asignación global tenant_id NULL) → null
      .mockResolvedValueOnce([
        [{ slug: 'social:post:view:own' }, { slug: 'social:post:create:own' }],
        undefined,
      ]) // resolveEffectivePermissions(userId, null) → recoge la fila global vía `tenant_id IS NULL`
      .mockResolvedValueOnce([[], undefined]) // getAvailableTenants → 0 (deriveOwnerType(null) no hace query, retorna null directo)
      .mockResolvedValueOnce([[], undefined]); // FC185 F2 — findCredentialByUserId: 0 MFA enrolado (opt-in, tenantId=null → 0 findCosmonautType)

    const result = await login('arc_tenant', 'password123');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.tenantId).toBeNull();
    expect(result.permissions).toEqual(['social:post:view:own', 'social:post:create:own']);
    expect(result.ownerType).toBeNull();
    expect(result.availableTenants).toEqual([]);
  });
});
