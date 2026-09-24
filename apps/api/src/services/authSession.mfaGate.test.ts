import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { verify as argon2Verify } from '@node-rs/argon2';
import * as SessionRepository from './authSession.repository';
import * as CosmonautMiddleware from '../middleware/cosmonautMiddleware';
import * as MfaRepository from './mfa.repository';
import * as CosmonautRepository from './cosmonaut.repository';
import { login, refresh, switchTenant } from './authSession.service';

/**
 * FC195 F2 (antes FC185 F2) — tests enfocados de `evaluateMfaGate` y de la política única
 * `mfaPolicy.service.ts` vista desde `login()`/`refresh()`/`switchTenant()`,
 * mockeando `cosmonautMiddleware` directamente (a diferencia de `authSession.service.test.ts`,
 * que corre el chasis real) para controlar `tenantId` sin encadenar 4-5 mocks de `db.execute` por
 * escenario — separado en su propio archivo porque mockear `./mfa.repository`/
 * `./cosmonaut.repository` a nivel de módulo rompería las aserciones de conteo de queries reales
 * de `authSession.service.test.ts` si viviera ahí.
 */

vi.mock('./authSession.repository', () => ({
  findUserWithRoleAndDepartmentByUsername: vi.fn(),
  findActiveUserWithRoleAndDepartmentById: vi.fn(),
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
  ceilEffectivePermissions: vi.fn((p: string[]) => Promise.resolve(p)),
}));
vi.mock('./mfa.repository', () => ({ listCredentials: vi.fn() }));
vi.mock('./cosmonaut.repository', () => ({ hasAnyMuMembership: vi.fn() }));

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

type Cred = { type: 'totp' | 'email'; confirmed: boolean };

function givenCredentials(...credentials: Cred[]): void {
  (MfaRepository.listCredentials as Mock).mockResolvedValue(credentials);
}

function givenMuAnywhere(isMu: boolean): void {
  (CosmonautRepository.hasAnyMuMembership as Mock).mockResolvedValue(isMu);
}

async function loginAs(row: typeof OMEGA_ROW): Promise<Awaited<ReturnType<typeof login>>> {
  (SessionRepository.findUserWithRoleAndDepartmentByUsername as Mock).mockResolvedValue(row);
  return login(row.username, 'pw');
}

const TOTP_OK: Cred = { type: 'totp', confirmed: true };
const EMAIL_OK: Cred = { type: 'email', confirmed: true };

describe('FC195 F2 — evaluateMfaGate() vía login(): 2FA obligatorio para todos (D-Ω1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (argon2Verify as Mock).mockResolvedValue(true);
    mockAuthContext(null);
    givenMuAnywhere(false);
  });

  describe('Ω (roleId=0) — solo TOTP, sin consultar membresías MU', () => {
    it('sin credencial → MFA_SETUP_REQUIRED con solo TOTP permitido', async () => {
      givenCredentials();

      const result = await loginAs(OMEGA_ROW);

      expect(result).toEqual({
        ok: false,
        status: 200,
        errorCode: 'MFA_SETUP_REQUIRED',
        userId: 1,
        username: 'grayman',
        allowedMethods: ['totp'],
      });
      expect(CosmonautRepository.hasAnyMuMembership).not.toHaveBeenCalled();
    });

    it('TOTP pendiente sin confirmar → sigue siendo MFA_SETUP_REQUIRED', async () => {
      givenCredentials({ type: 'totp', confirmed: false });

      const result = await loginAs(OMEGA_ROW);

      expect(result.errorCode).toBe('MFA_SETUP_REQUIRED');
    });

    it('TOTP confirmado → MFA_REQUIRED por el canal totp (nunca sesión directa)', async () => {
      givenCredentials(TOTP_OK);

      const result = await loginAs(OMEGA_ROW);

      expect(result).toEqual({
        ok: false,
        status: 200,
        errorCode: 'MFA_REQUIRED',
        userId: 1,
        channel: 'totp',
      });
    });

    it('Invariante 9 — un 2FA por correo NO le basta: MFA_SETUP_REQUIRED de TOTP', async () => {
      givenCredentials(EMAIL_OK);

      const result = await loginAs(OMEGA_ROW);

      expect(result).toMatchObject({ errorCode: 'MFA_SETUP_REQUIRED', allowedMethods: ['totp'] });
    });
  });

  describe('MU en CUALQUIER universo (R10) — solo TOTP, aunque el login caiga en otro universo', () => {
    beforeEach(() => givenMuAnywhere(true));

    it('sin credencial → MFA_SETUP_REQUIRED solo TOTP; la consulta es por usuario, no por tenant', async () => {
      mockAuthContext(4);
      givenCredentials();

      const result = await loginAs(TENANT_USER_ROW);

      expect(result).toMatchObject({ errorCode: 'MFA_SETUP_REQUIRED', allowedMethods: ['totp'] });
      expect(CosmonautRepository.hasAnyMuMembership).toHaveBeenCalledWith(10);
    });

    it('Invariante 9 — solo correo confirmado (enrolado cuando era Arc) → MFA_SETUP_REQUIRED de TOTP', async () => {
      givenCredentials(EMAIL_OK);

      const result = await loginAs(TENANT_USER_ROW);

      expect(result).toMatchObject({ errorCode: 'MFA_SETUP_REQUIRED', allowedMethods: ['totp'] });
    });

    it('TOTP confirmado → MFA_REQUIRED totp', async () => {
      givenCredentials(TOTP_OK);

      const result = await loginAs(TENANT_USER_ROW);

      expect(result).toMatchObject({ errorCode: 'MFA_REQUIRED', channel: 'totp' });
    });
  });

  describe('Arc (con universo o itinerante) — TOTP o correo, pero nunca sin 2FA (Scenario 6)', () => {
    it.each([
      ['Arc con universo', TENANT_USER_ROW, 4],
      ['Arc itinerante', ARC_ITINERANT_ROW, null],
    ])('%s sin credencial → MFA_SETUP_REQUIRED con TOTP y correo', async (_label, row, tenant) => {
      mockAuthContext(tenant);
      givenCredentials();

      const result = await loginAs(row);

      expect(result).toMatchObject({
        errorCode: 'MFA_SETUP_REQUIRED',
        allowedMethods: ['totp', 'email'],
      });
    });

    it('correo confirmado → MFA_REQUIRED por el canal email', async () => {
      givenCredentials(EMAIL_OK);

      const result = await loginAs(ARC_ITINERANT_ROW);

      expect(result).toEqual({
        ok: false,
        status: 200,
        errorCode: 'MFA_REQUIRED',
        userId: 20,
        channel: 'email',
      });
    });

    it('correo pendiente sin confirmar → MFA_SETUP_REQUIRED', async () => {
      givenCredentials({ type: 'email', confirmed: false });

      const result = await loginAs(ARC_ITINERANT_ROW);

      expect(result.errorCode).toBe('MFA_SETUP_REQUIRED');
    });

    it('TOTP confirmado → MFA_REQUIRED totp', async () => {
      givenCredentials(TOTP_OK);

      const result = await loginAs(ARC_ITINERANT_ROW);

      expect(result).toMatchObject({ errorCode: 'MFA_REQUIRED', channel: 'totp' });
    });
  });

  it('la resolución del contexto sigue corriendo antes del reto (el HALT multi-universo se conserva)', async () => {
    givenCredentials(TOTP_OK);
    (CosmonautMiddleware.resolveAuthContext as Mock).mockRejectedValue(new Error('HALT'));

    await expect(loginAs(ARC_ITINERANT_ROW)).rejects.toThrow('HALT');
    expect(MfaRepository.listCredentials).not.toHaveBeenCalled();
  });
});

describe('FC195 R10 — refresh() y switchTenant() no renuevan sesión sin un 2FA que le baste', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    givenMuAnywhere(false);
    (SessionRepository.findActiveUserWithRoleAndDepartmentById as Mock).mockResolvedValue(
      TENANT_USER_ROW
    );
    (CosmonautMiddleware.resolveAuthContextForRefresh as Mock).mockResolvedValue({
      tenantId: 4,
      permissions: ['x'],
      ownerType: null,
      availableTenants: [4],
    });
    (CosmonautMiddleware.isTenantAssignmentActive as Mock).mockResolvedValue(true);
    (CosmonautMiddleware.resolveEffectivePermissions as Mock).mockResolvedValue(['x']);
    (CosmonautMiddleware.deriveOwnerType as Mock).mockResolvedValue(null);
    (CosmonautMiddleware.getAvailableTenants as Mock).mockResolvedValue([4]);
  });

  it('refresh: Arc con 2FA por correo → sesión renovada', async () => {
    givenCredentials(EMAIL_OK);

    const result = await refresh(10, 4);

    expect(result.ok).toBe(true);
  });

  it('refresh: ahora es MU y solo tiene correo → 401 MFA_SETUP_REQUIRED, sin resolver contexto', async () => {
    givenMuAnywhere(true);
    givenCredentials(EMAIL_OK);

    const result = await refresh(10, 4);

    expect(result).toEqual({ ok: false, status: 401, errorCode: 'MFA_SETUP_REQUIRED' });
    expect(CosmonautMiddleware.resolveAuthContextForRefresh).not.toHaveBeenCalled();
  });

  it('refresh: sin ninguna credencial (p. ej. tras un reset de Ω) → 401 MFA_SETUP_REQUIRED', async () => {
    givenCredentials();

    const result = await refresh(10, 4);

    expect(result).toMatchObject({ ok: false, errorCode: 'MFA_SETUP_REQUIRED' });
  });

  it('switchTenant: MU en otro universo con solo correo → 401 MFA_SETUP_REQUIRED (sin downgrade)', async () => {
    givenMuAnywhere(true);
    givenCredentials(EMAIL_OK);

    const result = await switchTenant(10, 2, 4);

    expect(result).toEqual({
      ok: false,
      status: 401,
      code: 'MFA_SETUP_REQUIRED',
      message: 'Configura tu 2FA',
    });
    expect(CosmonautMiddleware.resolveEffectivePermissions).not.toHaveBeenCalled();
  });

  it('switchTenant: con TOTP → cambia de universo', async () => {
    givenMuAnywhere(true);
    givenCredentials(TOTP_OK);

    const result = await switchTenant(10, 2, 4);

    expect(result.ok).toBe(true);
  });
});
