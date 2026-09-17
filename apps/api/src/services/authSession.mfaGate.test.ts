import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { verify as argon2Verify } from '@node-rs/argon2';
import * as SessionRepository from './authSession.repository';
import * as CosmonautMiddleware from '../middleware/cosmonautMiddleware';
import * as MfaRepository from './mfa.repository';
import * as CosmonautRepository from './cosmonaut.repository';
import { login } from './authSession.service';

/**
 * FC185 F2 — Backend_Two_Step_Auth_Pipeline_And_Recovery. Tests enfocados de
 * `evaluateMfaGate`/`isMfaMandatoryRole` (helpers privados de `authSession.service.ts::login()`),
 * mockeando `cosmonautMiddleware` directamente (a diferencia de `authSession.service.test.ts`,
 * que corre el chasis real) para controlar `tenantId` sin encadenar 4-5 mocks de `db.execute` por
 * escenario — separado en su propio archivo porque mockear `./mfa.repository`/
 * `./cosmonaut.repository` a nivel de módulo rompería las aserciones de conteo de queries reales
 * de `authSession.service.test.ts` si viviera ahí.
 */

vi.mock('./authSession.repository', () => ({
  findUserWithRoleAndDepartmentByUsername: vi.fn(),
  findAllActiveUsers: vi.fn(),
}));
vi.mock('@node-rs/argon2', () => ({ verify: vi.fn() }));
vi.mock('./encryption', () => ({
  default: {
    encrypt: vi.fn((v: string) => `enc_${v}`),
    decrypt: vi.fn((v: string) => (v ? v.replace('enc_', '') : '')),
  },
}));
vi.mock('../middleware/cosmonautMiddleware', () => ({
  resolveAuthContext: vi.fn(),
  resolveAuthContextForRefresh: vi.fn(),
  resolveEffectivePermissions: vi.fn(),
  deriveOwnerType: vi.fn(),
  getAvailableTenants: vi.fn(),
  isTenantAssignmentActive: vi.fn(),
}));
vi.mock('./mfa.repository', () => ({ findCredentialByUserId: vi.fn() }));
vi.mock('./cosmonaut.repository', () => ({ findCosmonautType: vi.fn() }));

const OMEGA_ROW = {
  id: 1,
  username: 'grayman',
  email: 'enc_gm@piic.mx',
  password_hash: 'h',
  role_id: 0,
  role_name: 'GrayMan',
  is_active: 1,
};

const TENANT_USER_ROW = {
  id: 10,
  username: 'sub_user',
  email: 'enc_sub@piic.mx',
  password_hash: 'h',
  role_id: 2,
  role_name: 'Operador',
  is_active: 1,
};

const ARC_ITINERANT_ROW = {
  id: 20,
  username: 'arc_itinerante',
  email: 'enc_arc@piic.mx',
  password_hash: 'h',
  role_id: 3,
  role_name: 'Arc',
  is_active: 1,
};

function mockAuthContext(tenantId: number | null): void {
  (CosmonautMiddleware.resolveAuthContext as Mock).mockResolvedValue({
    tenantId,
    permissions: ['x'],
    ownerType: null,
    availableTenants: [],
  });
}

describe('FC185 F2 — evaluateMfaGate() vía login()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (argon2Verify as Mock).mockResolvedValue(true);
  });

  describe('Ω (roleId=0) — siempre mandatorio, 0 llamada a findCosmonautType (short-circuit)', () => {
    it('sin credencial confirmada → MFA_SETUP_REQUIRED', async () => {
      (SessionRepository.findUserWithRoleAndDepartmentByUsername as Mock).mockResolvedValue(
        OMEGA_ROW
      );
      mockAuthContext(null);
      (MfaRepository.findCredentialByUserId as Mock).mockResolvedValue(null);

      const result = await login('grayman', 'pw');

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result).toMatchObject({ status: 200, errorCode: 'MFA_SETUP_REQUIRED', userId: 1 });
      expect(CosmonautRepository.findCosmonautType).not.toHaveBeenCalled();
    });

    it('credencial pendiente sin confirmar (is_confirmed=0) → sigue siendo MFA_SETUP_REQUIRED', async () => {
      (SessionRepository.findUserWithRoleAndDepartmentByUsername as Mock).mockResolvedValue(
        OMEGA_ROW
      );
      mockAuthContext(null);
      (MfaRepository.findCredentialByUserId as Mock).mockResolvedValue({
        id: 5,
        is_confirmed: 0,
        secret_encrypted: 'enc_x',
        last_used_step: null,
      });

      const result = await login('grayman', 'pw');

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.errorCode).toBe('MFA_SETUP_REQUIRED');
    });

    it('con credencial confirmada → MFA_REQUIRED (nunca sesión completa directa)', async () => {
      (SessionRepository.findUserWithRoleAndDepartmentByUsername as Mock).mockResolvedValue(
        OMEGA_ROW
      );
      mockAuthContext(null);
      (MfaRepository.findCredentialByUserId as Mock).mockResolvedValue({
        id: 5,
        is_confirmed: 1,
        secret_encrypted: 'enc_x',
        last_used_step: 100,
      });

      const result = await login('grayman', 'pw');

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result).toEqual({ ok: false, status: 200, errorCode: 'MFA_REQUIRED', userId: 1 });
    });
  });

  describe('MU (tenantId asignado + cosmonaut_type=MU) — mandatorio', () => {
    it('sin credencial confirmada → MFA_SETUP_REQUIRED', async () => {
      (SessionRepository.findUserWithRoleAndDepartmentByUsername as Mock).mockResolvedValue(
        TENANT_USER_ROW
      );
      mockAuthContext(4);
      (MfaRepository.findCredentialByUserId as Mock).mockResolvedValue(null);
      (CosmonautRepository.findCosmonautType as Mock).mockResolvedValue('MU');

      const result = await login('sub_user', 'pw');

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result).toMatchObject({
        status: 200,
        errorCode: 'MFA_SETUP_REQUIRED',
        userId: 10,
        username: 'sub_user',
      });
      expect(CosmonautRepository.findCosmonautType).toHaveBeenCalledWith(10, 4);
    });

    it('con credencial confirmada → MFA_REQUIRED', async () => {
      (SessionRepository.findUserWithRoleAndDepartmentByUsername as Mock).mockResolvedValue(
        TENANT_USER_ROW
      );
      mockAuthContext(4);
      (MfaRepository.findCredentialByUserId as Mock).mockResolvedValue({
        id: 9,
        is_confirmed: 1,
        secret_encrypted: 'enc_x',
        last_used_step: 1,
      });

      const result = await login('sub_user', 'pw');

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.errorCode).toBe('MFA_REQUIRED');
      // La credencial confirmada corta el gate antes de necesitar saber si es MU — mismo
      // resultado (MFA_REQUIRED) sin importar el rol, así que 0 llamada extra.
      expect(CosmonautRepository.findCosmonautType).not.toHaveBeenCalled();
    });
  });

  describe('Sub-usuario ARC con tenant asignado (cosmonaut_type=ARC, NO MU) — opt-in, no mandatorio', () => {
    it('sin credencial confirmada → sesión completa normal (0 forzado a enrolar)', async () => {
      (SessionRepository.findUserWithRoleAndDepartmentByUsername as Mock).mockResolvedValue(
        TENANT_USER_ROW
      );
      mockAuthContext(4);
      (MfaRepository.findCredentialByUserId as Mock).mockResolvedValue(null);
      (CosmonautRepository.findCosmonautType as Mock).mockResolvedValue('ARC');

      const result = await login('sub_user', 'pw');

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.tenantId).toBe(4);
    });

    it('con credencial confirmada (opt-in ejercido) → MFA_REQUIRED igual que un rol mandatorio', async () => {
      (SessionRepository.findUserWithRoleAndDepartmentByUsername as Mock).mockResolvedValue(
        TENANT_USER_ROW
      );
      mockAuthContext(4);
      (MfaRepository.findCredentialByUserId as Mock).mockResolvedValue({
        id: 9,
        is_confirmed: 1,
        secret_encrypted: 'enc_x',
        last_used_step: 1,
      });

      const result = await login('sub_user', 'pw');

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.errorCode).toBe('MFA_REQUIRED');
    });
  });

  describe('Arc itinerante puro (tenantId=null, roleId≠0) — opt-in, 0 llamada a findCosmonautType', () => {
    it('sin credencial confirmada → sesión completa normal', async () => {
      (SessionRepository.findUserWithRoleAndDepartmentByUsername as Mock).mockResolvedValue(
        ARC_ITINERANT_ROW
      );
      mockAuthContext(null);
      (MfaRepository.findCredentialByUserId as Mock).mockResolvedValue(null);

      const result = await login('arc_itinerante', 'pw');

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.tenantId).toBeNull();
      expect(CosmonautRepository.findCosmonautType).not.toHaveBeenCalled();
    });

    it('con credencial confirmada (opt-in ejercido) → MFA_REQUIRED', async () => {
      (SessionRepository.findUserWithRoleAndDepartmentByUsername as Mock).mockResolvedValue(
        ARC_ITINERANT_ROW
      );
      mockAuthContext(null);
      (MfaRepository.findCredentialByUserId as Mock).mockResolvedValue({
        id: 9,
        is_confirmed: 1,
        secret_encrypted: 'enc_x',
        last_used_step: 1,
      });

      const result = await login('arc_itinerante', 'pw');

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.errorCode).toBe('MFA_REQUIRED');
    });
  });
});
