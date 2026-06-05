import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '../test/testUtils';
import usePermissions from './usePermissions';
import { useAuth } from '../context/AuthContext';

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  AuthProvider: ({ children }: { children: any }): any => children,
}));

describe('usePermissions (Sovereign Authorization Sensor)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should deny all if no currentUser', () => {
    vi.mocked(useAuth).mockReturnValue({
      currentUser: null,
      login: vi.fn(),
      logout: vi.fn(),
      updateCurrentUser: vi.fn(),
      isAuthenticated: false,
    });

    const { result } = renderHook(() => usePermissions());
    expect(result.current.hasPermission('fleet:read')).toBe(false);
    expect(result.current.hasAnyPermission(['fleet:read', 'fleet:write'])).toBe(false);
  });

  it('should grant absolute power to Archon roleId 0', () => {
    vi.mocked(useAuth).mockReturnValue({
      currentUser: {
        id: '1',
        username: 'admin',
        roleId: 0,
        roleName: 'Admin',
        permissions: [],
      } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      login: vi.fn(),
      logout: vi.fn(),
      updateCurrentUser: vi.fn(),
      isAuthenticated: true,
    });

    const { result } = renderHook(() => usePermissions());
    expect(result.current.hasPermission('any:permission')).toBe(true);
  });

  it('should grant absolute power to Master (Archon) roleName', () => {
    vi.mocked(useAuth).mockReturnValue({
      currentUser: {
        id: '2',
        username: 'user',
        roleId: 5,
        roleName: 'Master (Archon)',
        permissions: [],
      } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      login: vi.fn(),
      logout: vi.fn(),
      updateCurrentUser: vi.fn(),
      isAuthenticated: true,
    });

    const { result } = renderHook(() => usePermissions());
    expect(result.current.hasPermission('any:permission')).toBe(true);
  });

  it('should grant absolute power to greyman username', () => {
    vi.mocked(useAuth).mockReturnValue({
      currentUser: {
        id: '3',
        username: 'GrayMan',
        roleId: 5,
        roleName: 'Operador',
        permissions: [],
      } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      login: vi.fn(),
      logout: vi.fn(),
      updateCurrentUser: vi.fn(),
      isAuthenticated: true,
    });

    const { result } = renderHook(() => usePermissions());
    expect(result.current.hasPermission('any:permission')).toBe(true);
  });

  it('should check actual permissions for regular users', () => {
    vi.mocked(useAuth).mockReturnValue({
      currentUser: {
        id: '4',
        username: 'operator',
        roleId: 3,
        roleName: 'Operador',
        permissions: ['fleet:read', 'routes:read'],
      } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      login: vi.fn(),
      logout: vi.fn(),
      updateCurrentUser: vi.fn(),
      isAuthenticated: true,
    });

    const { result } = renderHook(() => usePermissions());
    expect(result.current.hasPermission('fleet:read')).toBe(true);
    expect(result.current.hasPermission('fleet:write')).toBe(false);
    expect(result.current.hasAnyPermission(['fleet:write', 'routes:read'])).toBe(true);
    expect(result.current.hasAnyPermission(['fleet:write', 'admin:all'])).toBe(false);
  });

  it('should handle user with no permissions array', () => {
    vi.mocked(useAuth).mockReturnValue({
      currentUser: {
        id: '5',
        username: 'newuser',
        roleId: 3,
        roleName: 'Operador',
      } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      login: vi.fn(),
      logout: vi.fn(),
      updateCurrentUser: vi.fn(),
      isAuthenticated: true,
    });

    const { result } = renderHook(() => usePermissions());
    expect(result.current.hasPermission('fleet:read')).toBe(false);
  });

  it('isOmnipotent returns false when no currentUser', () => {
    vi.mocked(useAuth).mockReturnValue({
      currentUser: null,
      login: vi.fn(),
      logout: vi.fn(),
      updateCurrentUser: vi.fn(),
      isAuthenticated: false,
    });
    const { result } = renderHook(() => usePermissions());
    expect(result.current.isOmnipotent()).toBe(false);
  });

  it('isOmnipotent returns true for roleId 0', () => {
    vi.mocked(useAuth).mockReturnValue({
      currentUser: {
        id: '1',
        username: 'admin',
        roleId: 0,
        roleName: 'Admin',
        permissions: [],
      } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      login: vi.fn(),
      logout: vi.fn(),
      updateCurrentUser: vi.fn(),
      isAuthenticated: true,
    });
    const { result } = renderHook(() => usePermissions());
    expect(result.current.isOmnipotent()).toBe(true);
  });

  it('isOmnipotent returns true for Master (Archon) roleName', () => {
    vi.mocked(useAuth).mockReturnValue({
      currentUser: {
        id: '2',
        username: 'user',
        roleId: 5,
        roleName: 'Master (Archon)',
        permissions: [],
      } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      login: vi.fn(),
      logout: vi.fn(),
      updateCurrentUser: vi.fn(),
      isAuthenticated: true,
    });
    const { result } = renderHook(() => usePermissions());
    expect(result.current.isOmnipotent()).toBe(true);
  });

  it('isOmnipotent returns true for grayman username', () => {
    vi.mocked(useAuth).mockReturnValue({
      currentUser: {
        id: '3',
        username: 'grayman',
        roleId: 5,
        roleName: 'Operador',
        permissions: [],
      } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      login: vi.fn(),
      logout: vi.fn(),
      updateCurrentUser: vi.fn(),
      isAuthenticated: true,
    });
    const { result } = renderHook(() => usePermissions());
    expect(result.current.isOmnipotent()).toBe(true);
  });

  it('isOmnipotent returns false for regular user', () => {
    vi.mocked(useAuth).mockReturnValue({
      currentUser: {
        id: '4',
        username: 'operator',
        roleId: 3,
        roleName: 'Operador',
        permissions: ['fleet:read'],
      } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      login: vi.fn(),
      logout: vi.fn(),
      updateCurrentUser: vi.fn(),
      isAuthenticated: true,
    });
    const { result } = renderHook(() => usePermissions());
    expect(result.current.isOmnipotent()).toBe(false);
  });
});
