import { useAuth } from '../context/AuthContext';

/**
 * 🔱 Archon Hook: usePermissions
 * Implementation: Sovereign Authorization Sensor
 * v.1.0.0 - Logic-based UI visibility control
 */
export default function usePermissions(): {
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  isOmnipotent: () => boolean;
} {
  const { currentUser, effectiveUser } = useAuth();

  const hasPermission = (permission: string): boolean => {
    if (!effectiveUser) return false;

    if (
      Number(effectiveUser.roleId) === 0 ||
      effectiveUser.roleName === 'Master (Archon)' ||
      ['archon', 'greyman', 'grayman'].includes(effectiveUser.username.toLowerCase())
    ) {
      return true;
    }

    return effectiveUser.permissions?.includes(permission) || false;
  };

  const hasAnyPermission = (permissions: string[]): boolean =>
    permissions.some((p) => hasPermission(p));

  // isOmnipotent always reads currentUser (not effectiveUser) so the
  // God Mode switcher remains visible even while impersonating a limited role.
  const isOmnipotent = (): boolean => {
    if (!currentUser) return false;
    return (
      Number(currentUser.roleId) === 0 ||
      currentUser.roleName === 'Master (Archon)' ||
      ['archon', 'greyman', 'grayman'].includes(currentUser.username.toLowerCase())
    );
  };

  return { hasPermission, hasAnyPermission, isOmnipotent };
}
