import { useAuth } from '../context/AuthContext';

/**
 * 🔱 Archon Hook: usePermissions
 * Implementation: Sovereign Authorization Sensor
 * v.1.0.0 - Logic-based UI visibility control
 */
export default function usePermissions(): {
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
} {
  const { currentUser } = useAuth();

  /**
   * Checks if the user has a specific permission slug.
   * Master (Archon) has ID 0 and always returns true.
   */
  const hasPermission = (permission: string): boolean => {
    if (!currentUser) return false;

    // 🛡️ OMEGA BYPASS: Master (Archon) has absolute power
    // We check ID (flexible), Name, and Username to be indestructible
    if (
      Number(currentUser.roleId) === 0 ||
      currentUser.roleName === 'Master (Archon)' ||
      ['archon', 'greyman', 'grayman'].includes(currentUser.username.toLowerCase())
    ) {
      return true;
    }

    return currentUser.permissions?.includes(permission) || false;
  };

  /**
   * Checks if the user has ANY of the provided permissions.
   */
  const hasAnyPermission = (permissions: string[]): boolean =>
    permissions.some((p) => hasPermission(p));

  return { hasPermission, hasAnyPermission };
}
