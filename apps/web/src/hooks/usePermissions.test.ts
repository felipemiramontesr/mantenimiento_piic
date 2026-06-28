import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '../test/testUtils';
import usePermissions, { LEGACY_ALIASES, REVERSE_ALIASES } from './usePermissions';
import { useAuth } from '../context/AuthContext';

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  AuthProvider: ({ children }: { children: any }): any => children,
}));

const mockAuth = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  currentUser: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  effectiveUser: any = currentUser
): void => {
  vi.mocked(useAuth).mockReturnValue({
    currentUser,
    effectiveUser,
    isImpersonating: effectiveUser !== currentUser,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    updateCurrentUser: vi.fn(),
    isAuthenticated: currentUser !== null,
    startImpersonation: vi.fn(),
    stopImpersonation: vi.fn(),
    ownerType: currentUser?.ownerType ?? null,
    suite: currentUser?.suite ?? null,
  });
};

describe('usePermissions (Sovereign Authorization Sensor)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should deny all if no currentUser', () => {
    mockAuth(null);
    const { result } = renderHook(() => usePermissions());
    expect(result.current.hasPermission('fleet:read')).toBe(false);
    expect(result.current.hasAnyPermission(['fleet:read', 'fleet:write'])).toBe(false);
  });

  it('should grant absolute power to user with wildcard permissions', () => {
    mockAuth({
      id: '1',
      username: 'admin',
      roleId: 0,
      roleName: 'Master (Archon)',
      permissions: ['*'],
    });
    const { result } = renderHook(() => usePermissions());
    expect(result.current.hasPermission('any:permission')).toBe(true);
  });

  describe('isExternalClientOnly (Owner-Scoped F1-A)', () => {
    it('is true for Propietario de Flotilla (fleet:view + fleet:scoped)', () => {
      mockAuth({
        id: '19',
        username: 'juan.perez',
        roleId: 1,
        roleName: 'Propietario de Flotilla',
        permissions: ['fleet:view', 'fleet:scoped'],
      });
      const { result } = renderHook(() => usePermissions());
      expect(result.current.isExternalClientOnly()).toBe(true);
    });

    it('is true for Propietario Privado with scoped-write (fleet:view + fleet:scoped + fleet:write:scoped)', () => {
      mockAuth({
        id: '20',
        username: 'maria.privada',
        roleId: 2,
        roleName: 'Propietario Privado',
        permissions: ['fleet:view', 'fleet:scoped', 'fleet:write:scoped'],
      });
      const { result } = renderHook(() => usePermissions());
      expect(result.current.isExternalClientOnly()).toBe(true);
    });

    it('is true for owner-scoped user with full V.200 permissions (fleet + maint)', () => {
      mockAuth({
        id: '19',
        username: 'flotilla.v200',
        roleId: 1,
        roleName: 'Propietario de Flotilla',
        permissions: [
          'fleet:view',
          'fleet:scoped',
          'fleet:write:scoped',
          'maint:view',
          'maint:write',
        ],
      });
      const { result } = renderHook(() => usePermissions());
      expect(result.current.isExternalClientOnly()).toBe(true);
    });

    it('is false for scoped carriers with extra permissions (F1-B Gestor variable)', () => {
      mockAuth({
        id: '4',
        username: 'gestor',
        roleId: 4,
        roleName: 'Gestor de Flotilla',
        permissions: ['fleet:view', 'fleet:write', 'fleet:delete', 'fleet:scoped'],
      });
      const { result } = renderHook(() => usePermissions());
      expect(result.current.isExternalClientOnly()).toBe(false);
    });

    it('is false for unscoped staff and omnipotent users', () => {
      mockAuth({
        id: '1',
        username: 'staff',
        roleId: 1,
        roleName: 'Operador General',
        permissions: ['fleet:view'],
      });
      const { result: staff } = renderHook(() => usePermissions());
      expect(staff.current.isExternalClientOnly()).toBe(false);

      mockAuth({
        id: '0',
        username: 'archon',
        roleId: 0,
        roleName: 'Master (Archon)',
        permissions: ['*'],
      });
      const { result: archon } = renderHook(() => usePermissions());
      expect(archon.current.isExternalClientOnly()).toBe(false);
    });

    it('is false without an effective user', () => {
      mockAuth(null);
      const { result } = renderHook(() => usePermissions());
      expect(result.current.isExternalClientOnly()).toBe(false);
    });
  });

  it('should grant specific permission to user with system:manage_roles', () => {
    mockAuth({
      id: '2',
      username: 'user',
      roleId: 5,
      roleName: 'Admin',
      permissions: ['system:manage_roles', 'fleet:view'],
    });
    const { result } = renderHook(() => usePermissions());
    expect(result.current.hasPermission('system:manage_roles')).toBe(true);
    expect(result.current.hasPermission('fleet:view')).toBe(true);
    expect(result.current.hasPermission('financial:view')).toBe(false);
  });

  it('should check actual permissions for regular users', () => {
    mockAuth({
      id: '4',
      username: 'operator',
      roleId: 3,
      roleName: 'Operador',
      permissions: ['fleet:read', 'routes:read'],
    });
    const { result } = renderHook(() => usePermissions());
    expect(result.current.hasPermission('fleet:read')).toBe(true);
    expect(result.current.hasPermission('fleet:write')).toBe(false);
    expect(result.current.hasAnyPermission(['fleet:write', 'routes:read'])).toBe(true);
    expect(result.current.hasAnyPermission(['fleet:write', 'admin:all'])).toBe(false);
  });

  it('should handle user with no permissions array', () => {
    mockAuth({ id: '5', username: 'newuser', roleId: 3, roleName: 'Operador' });
    const { result } = renderHook(() => usePermissions());
    expect(result.current.hasPermission('fleet:read')).toBe(false);
  });

  it('isOmnipotent returns false when no currentUser', () => {
    mockAuth(null);
    const { result } = renderHook(() => usePermissions());
    expect(result.current.isOmnipotent()).toBe(false);
  });

  it('isOmnipotent returns true for wildcard permissions', () => {
    mockAuth({
      id: '1',
      username: 'admin',
      roleId: 0,
      roleName: 'Master (Archon)',
      permissions: ['*'],
    });
    const { result } = renderHook(() => usePermissions());
    expect(result.current.isOmnipotent()).toBe(true);
  });

  it('isOmnipotent returns true for admin:role:edit (granular slug, FC-18)', () => {
    mockAuth({
      id: '8',
      username: 'admin.ti',
      roleId: 8,
      roleName: 'Administrador de TI',
      permissions: ['admin:role:edit', 'admin:role:view'],
    });
    const { result } = renderHook(() => usePermissions());
    expect(result.current.isOmnipotent()).toBe(true);
  });

  it('isOmnipotent returns true for system:manage_roles permission', () => {
    mockAuth({
      id: '2',
      username: 'user',
      roleId: 5,
      roleName: 'Admin',
      permissions: ['system:manage_roles'],
    });
    const { result } = renderHook(() => usePermissions());
    expect(result.current.isOmnipotent()).toBe(true);
  });

  it('isOmnipotent returns false for regular user without manage_roles', () => {
    mockAuth({
      id: '4',
      username: 'operator',
      roleId: 3,
      roleName: 'Operador',
      permissions: ['fleet:read'],
    });
    const { result } = renderHook(() => usePermissions());
    expect(result.current.isOmnipotent()).toBe(false);
  });

  // effectiveUser tests — impersonation
  it('hasPermission uses effectiveUser when impersonating — grants only target role permissions', () => {
    const adminUser = {
      id: '1',
      username: 'grayman',
      roleId: 0,
      roleName: 'Master (Archon)',
      permissions: ['*'],
    };
    const limitedUser = {
      id: 'impersonated-3',
      username: '[Operador]',
      roleId: 3,
      roleName: 'Operador',
      permissions: ['fleet:read'],
    };
    mockAuth(adminUser, limitedUser);
    const { result } = renderHook(() => usePermissions());
    expect(result.current.hasPermission('fleet:read')).toBe(true);
    expect(result.current.hasPermission('admin:all')).toBe(false);
  });

  describe('FC-18 FaseD-4 — REVERSE_ALIASES (AT-FC18-D4-RA)', () => {
    it('AT-FC18-D4-RA-1 — hasPermission("fleet:unit:view:any") passes for user with legacy fleet:view JWT', () => {
      mockAuth({
        id: '1',
        username: 'operador',
        roleId: 1,
        roleName: 'Operador General',
        permissions: ['fleet:view'],
      });
      const { result } = renderHook(() => usePermissions());
      expect(result.current.hasPermission('fleet:unit:view:any')).toBe(true);
    });

    it('AT-FC18-D4-RA-2 — hasPermission("maint:record:view:any") passes for user with legacy maint:view JWT', () => {
      mockAuth({
        id: '2',
        username: 'supervisor',
        roleId: 2,
        roleName: 'Supervisor de Mantenimiento',
        permissions: ['maint:view'],
      });
      const { result } = renderHook(() => usePermissions());
      expect(result.current.hasPermission('maint:record:view:any')).toBe(true);
    });

    it('AT-FC18-D4-RA-3 — hasPermission("route:record:view:any") passes for user with legacy route:view JWT', () => {
      mockAuth({
        id: '5',
        username: 'planif',
        roleId: 5,
        roleName: 'Planificador',
        permissions: ['route:view'],
      });
      const { result } = renderHook(() => usePermissions());
      expect(result.current.hasPermission('route:record:view:any')).toBe(true);
    });

    it('AT-FC18-D4-RA-4 — hasPermission("finance:dashboard:view:any") passes for user with legacy financial:view JWT', () => {
      mockAuth({
        id: '3',
        username: 'director',
        roleId: 3,
        roleName: 'Director de Finanzas',
        permissions: ['financial:view'],
      });
      const { result } = renderHook(() => usePermissions());
      expect(result.current.hasPermission('finance:dashboard:view:any')).toBe(true);
    });

    it('AT-FC18-D4-RA-5 — hasPermission("intelligence:anomaly:view") is DENIED for legacy fleet:view (no alias path)', () => {
      mockAuth({
        id: '1',
        username: 'operador',
        roleId: 1,
        roleName: 'Operador',
        permissions: ['fleet:view'],
      });
      const { result } = renderHook(() => usePermissions());
      expect(result.current.hasPermission('intelligence:anomaly:view')).toBe(false);
    });

    it('AT-FC18-D4-RA-6 — LEGACY_ALIASES and REVERSE_ALIASES are consistent (all entries round-trip)', () => {
      Object.entries(LEGACY_ALIASES).forEach(([_legacy, granular]) => {
        const reverseKey = REVERSE_ALIASES[granular];
        // Every granular slug in LEGACY_ALIASES must have a REVERSE_ALIASES entry.
        expect(reverseKey).toBeDefined();
        // The reverse entry must be a valid legacy key in LEGACY_ALIASES.
        expect(LEGACY_ALIASES[reverseKey]).toBe(granular);
      });
    });
  });

  describe('FC-18 FaseD-4 — isExternalClientOnly granular path (portal:dashboard:view)', () => {
    it('returns true for role 9 user with portal:dashboard:view (new granular slug)', () => {
      mockAuth({
        id: '9',
        username: 'cliente',
        roleId: 9,
        roleName: 'Cliente Externo',
        permissions: [
          'portal:dashboard:view',
          'portal:fleet:view:own',
          'portal:report:download',
          'notifications:view:own',
        ],
      });
      const { result } = renderHook(() => usePermissions());
      expect(result.current.isExternalClientOnly()).toBe(true);
    });

    it('returns false for non-portal user with fleet:unit:view:any (granular fleet perm is not external)', () => {
      mockAuth({
        id: '1',
        username: 'operador',
        roleId: 1,
        roleName: 'Operador General',
        permissions: ['fleet:unit:view:any', 'maint:record:view:any'],
      });
      const { result } = renderHook(() => usePermissions());
      expect(result.current.isExternalClientOnly()).toBe(false);
    });
  });

  describe('isSuiteVIM (Multiverso Archon — VIM universe gate)', () => {
    it('is true when effectiveUser.suite is VIM', () => {
      mockAuth({
        id: '3',
        username: 'centro.vim',
        roleId: 3,
        suite: 'VIM',
        permissions: ['fleet:scoped'],
      });
      const { result } = renderHook(() => usePermissions());
      expect(result.current.isSuiteVIM()).toBe(true);
    });

    it('is false when effectiveUser.suite is ERP', () => {
      mockAuth({
        id: '1',
        username: 'flotilla.erp',
        roleId: 1,
        suite: 'ERP',
        permissions: ['fleet:view', 'fleet:scoped'],
      });
      const { result } = renderHook(() => usePermissions());
      expect(result.current.isSuiteVIM()).toBe(false);
    });

    it('is false when suite is null (Archon)', () => {
      mockAuth({ id: '0', username: 'archon', roleId: 0, suite: null, permissions: ['*'] });
      const { result } = renderHook(() => usePermissions());
      expect(result.current.isSuiteVIM()).toBe(false);
    });

    it('is false when no effectiveUser', () => {
      mockAuth(null);
      const { result } = renderHook(() => usePermissions());
      expect(result.current.isSuiteVIM()).toBe(false);
    });

    it('reads effectiveUser not currentUser during impersonation', () => {
      const archon = { id: '0', username: 'archon', roleId: 0, suite: null, permissions: ['*'] };
      const vimUser = {
        id: '3',
        username: 'centro',
        roleId: 3,
        suite: 'VIM',
        permissions: ['fleet:scoped'],
      };
      mockAuth(archon, vimUser);
      const { result } = renderHook(() => usePermissions());
      expect(result.current.isSuiteVIM()).toBe(true);
    });
  });

  it('isFamiliar returns true for roleId 10 (Operador / Familiar — FC-18 post-migration-095)', () => {
    mockAuth({
      id: '10',
      username: 'operador',
      roleId: 10,
      roleName: 'Operador / Familiar',
      permissions: ['fleet:unit:view:own', 'route:record:view:own'],
    });
    const { result } = renderHook(() => usePermissions());
    expect(result.current.isFamiliar()).toBe(true);
  });

  it('isFamiliar returns false for roleId 5 (Planificador de Rutas — not Familiar post-migration-095)', () => {
    mockAuth({
      id: '5',
      username: 'planificador',
      roleId: 5,
      roleName: 'Planificador de Rutas',
      permissions: ['route:record:view:any', 'route:record:create'],
    });
    const { result } = renderHook(() => usePermissions());
    expect(result.current.isFamiliar()).toBe(false);
  });

  it('isOmnipotent uses currentUser not effectiveUser — stays true while impersonating limited role', () => {
    const adminUser = {
      id: '1',
      username: 'grayman',
      roleId: 0,
      roleName: 'Master (Archon)',
      permissions: ['*'],
    };
    const limitedUser = {
      id: 'impersonated-3',
      username: '[Operador]',
      roleId: 3,
      roleName: 'Operador',
      permissions: [],
    };
    mockAuth(adminUser, limitedUser);
    const { result } = renderHook(() => usePermissions());
    expect(result.current.isOmnipotent()).toBe(true);
  });
});
