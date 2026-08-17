import { useAuth } from '../context/AuthContext';

// FC 082 F0c — isExternalClientOnly (rol 9), isSuiteVIM (eje suite) e
// isFamiliar (rol 10) murieron con la purga de identidad (084_AN §1a).

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
  isOmegaStrict: () => boolean;
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

  // FC161 Cond.R-161-R2 — matches backend requireOmega() exactly (roleId===0
  // OR permissions includes '*'). Unlike isOmnipotent(), does NOT accept
  // admin:role:edit/system:manage_roles alone — those pass isOmnipotent()
  // but still 403 against Ω-exclusive endpoints like /v1/cosmology/*. Use
  // this (not isOmnipotent()) to gate any UI whose backend is requireOmega().
  const isOmegaStrict = (): boolean => {
    if (!currentUser) return false;
    if (currentUser.roleId === 0) return true;
    return currentUser.permissions?.includes('*') ?? false;
  };

  return {
    hasPermission,
    hasAnyPermission,
    isOmnipotent,
    isOmegaStrict,
  };
}
