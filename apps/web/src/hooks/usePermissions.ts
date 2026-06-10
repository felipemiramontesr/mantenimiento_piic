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
    if (effectiveUser.permissions?.includes('*')) return true;
    return effectiveUser.permissions?.includes(permission) || false;
  };

  const hasAnyPermission = (permissions: string[]): boolean =>
    permissions.some((p) => hasPermission(p));

  // isOmnipotent reads currentUser (not effectiveUser) so the God Mode switcher
  // stays visible while impersonating a limited role. Delegates to system:manage_roles.
  const isOmnipotent = (): boolean => {
    if (!currentUser) return false;
    if (currentUser.permissions?.includes('*')) return true;
    return currentUser.permissions?.includes('system:manage_roles') ?? false;
  };

  return { hasPermission, hasAnyPermission, isOmnipotent };
}
