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
      .mockResolvedValueOnce([[{ tenantId: 4 }], undefined]); // getAvailableTenants

    const result = await login('arc_tenant', 'password123');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.tenantId).toBe(4);
    expect(result.permissions).toEqual(['fleet:unit:view:any']);
    expect(result.ownerType).toBe('FLOTILLA');
    expect(result.availableTenants).toEqual([4]);
  });

  it('AT-FC176-F1-2: GrayMan (roleId=0) mantiene el bypass total, 0 consultas al chasis cosmonauta', async () => {
    (db as unknown as MockDb).execute.mockResolvedValueOnce([[OMEGA_USER_ROW], undefined]); // findUserWithRoleAndDepartmentByUsername

    const result = await login('grayman', 'password123');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.tenantId).toBeNull();
    expect(result.permissions).toEqual(['*']);
    expect((db as unknown as MockDb).execute).toHaveBeenCalledTimes(1);
  });
});
