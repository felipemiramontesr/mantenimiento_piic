import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '../test/testUtils';
import usePermissions from './usePermissions';
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
    login: vi.fn(),
    logout: vi.fn(),
    updateCurrentUser: vi.fn(),
    isAuthenticated: currentUser !== null,
    startImpersonation: vi.fn(),
    stopImpersonation: vi.fn(),
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
