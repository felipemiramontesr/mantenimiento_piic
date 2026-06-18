import { useAuth } from '../context/AuthContext';

/**
 * 🔱 Archon Hook: usePermissions
 * Implementation: Sovereign Authorization Sensor
 * v.1.0.0 - Logic-based UI visibility control
 */
/**
 * Owner-Scoped Fleet Access (F1-A): the base permission envelope of
 * Propietario de Flotilla (1) and Propietario Privado (2). A user whose
 * permissions are a subset of this set only operates the fleet panel.
 */
const EXTERNAL_CLIENT_PERMISSIONS = [
  'fleet:view',
  'fleet:scoped',
  'fleet:write:scoped',
  'maint:view',
  'maint:write',
];

export default function usePermissions(): {
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  isOmnipotent: () => boolean;
  isExternalClientOnly: () => boolean;
  isSuiteVIM: () => boolean;
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

  // True only when the user carries fleet:scoped and nothing beyond the
  // owner-scoped envelope — a Gestor with fleet:write/delete never qualifies.
  const isExternalClientOnly = (): boolean => {
    const permissions = effectiveUser?.permissions;
    if (!permissions || permissions.length === 0) return false;
    if (!permissions.includes('fleet:scoped')) return false;
    return permissions.every((p) => EXTERNAL_CLIENT_PERMISSIONS.includes(p));
  };

  const isSuiteVIM = (): boolean => effectiveUser?.suite === 'VIM';

  return { hasPermission, hasAnyPermission, isOmnipotent, isExternalClientOnly, isSuiteVIM };
}
