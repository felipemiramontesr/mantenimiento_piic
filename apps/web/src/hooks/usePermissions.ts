import { useAuth } from '../context/AuthContext';

const EXTERNAL_CLIENT_PERMISSIONS = [
  'fleet:view',
  'fleet:scoped',
  'fleet:write:scoped',
  'maint:view',
  'maint:write',
];

export const LEGACY_ALIASES: Record<string, string> = {
  'fleet:view': 'fleet:unit:view:any',
  'fleet:write': 'fleet:unit:edit:any',
  'fleet:delete': 'fleet:unit:delete:any',
  'maint:view': 'maint:record:view:any',
  'maint:write': 'maint:record:edit:any',
  'route:view': 'route:record:view:any',
  'route:write': 'route:record:edit:any',
  'financial:view': 'finance:dashboard:view:any',
  'financial:write': 'finance:transaction:create',
  'financial:report': 'finance:report:export',
  'report:export': 'intelligence:report:export',
  'user:admin': 'admin:role:edit',
  'system:manage_roles': 'admin:role:edit',
};

// Granular slug → legacy slug for backward compat (old JWTs still pass new permission checks).
// Mirrors REVERSE_ALIASES in apps/api/src/middleware/requirePermission.ts.
export const REVERSE_ALIASES: Record<string, string> = Object.entries(LEGACY_ALIASES).reduce(
  (acc: Record<string, string>, [legacy, granular]) =>
    acc[granular] ? acc : { ...acc, [granular]: legacy },
  {}
);

export default function usePermissions(): {
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  isOmnipotent: () => boolean;
  isExternalClientOnly: () => boolean;
  isSuiteVIM: () => boolean;
  isFamiliar: () => boolean;
} {
  const { currentUser, effectiveUser } = useAuth();

  const hasPermission = (permission: string): boolean => {
    if (!effectiveUser) return false;
    if (effectiveUser.permissions?.includes('*')) return true;
    if (effectiveUser.permissions?.includes(permission)) return true;
    // Backward compat: if user has legacy slug that maps to this granular slug, allow.
    const legacyAlias = REVERSE_ALIASES[permission];
    if (legacyAlias && effectiveUser.permissions?.includes(legacyAlias)) return true;
    return false;
  };

  const hasAnyPermission = (permissions: string[]): boolean =>
    permissions.some((p) => hasPermission(p));

  // isOmnipotent reads currentUser (not effectiveUser) so the God Mode switcher
  // stays visible while impersonating a limited role.
  const isOmnipotent = (): boolean => {
    if (!currentUser) return false;
    if (currentUser.permissions?.includes('*')) return true;
    if (currentUser.permissions?.includes('system:manage_roles')) return true;
    return currentUser.permissions?.includes('admin:role:edit') ?? false;
  };

  const isExternalClientOnly = (): boolean => {
    const permissions = effectiveUser?.permissions;
    if (!permissions || permissions.length === 0) return false;
    // Granular path: role 9 (Cliente Externo) carries portal:dashboard:view, not fleet:scoped.
    if (permissions.includes('portal:dashboard:view')) return true;
    // Legacy path: backward compat for old JWTs with fleet:scoped envelope.
    if (!permissions.includes('fleet:scoped')) return false;
    return permissions.every((p) => EXTERNAL_CLIENT_PERMISSIONS.includes(p));
  };

  const isSuiteVIM = (): boolean => effectiveUser?.suite === 'VIM';

  // roleId 10 = Operador / Familiar (FC-18 post-migration-095).
  const isFamiliar = (): boolean => effectiveUser?.roleId === 10;

  return {
    hasPermission,
    hasAnyPermission,
    isOmnipotent,
    isExternalClientOnly,
    isSuiteVIM,
    isFamiliar,
  };
}
