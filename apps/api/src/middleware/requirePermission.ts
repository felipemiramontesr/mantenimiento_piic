import { FastifyRequest, FastifyReply } from 'fastify';

/**
 * Legacy → granular slug aliases (FaseD-2 · backward compat during FaseD-3 transition).
 * Removed in FaseD-4 once all route files use granular slugs.
 */
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

/**
 * RBAC permission guard — A01:2021 / A07:2021
 * Returns a Fastify preHandler that verifies the JWT user holds the required permission.
 * Omnipotent users (permissions: ['*']) bypass all checks.
 *
 * FC-18 FaseD-2 additions:
 * - Legacy alias resolution (fleet:view → fleet:unit:view:any).
 * - Users holding the legacy slug also pass (tokens not yet rotated).
 *
 * For scope-sensitive endpoints use requireOwnership() instead.
 */
// Reverse map for O(1) lookup: granular slug → [legacy slugs that map to it]
const REVERSE_ALIASES: Map<string, string[]> = Object.entries(LEGACY_ALIASES).reduce<
  Map<string, string[]>
>((acc, [legacySlug, granularSlug]) => {
  acc.set(granularSlug, [...(acc.get(granularSlug) ?? []), legacySlug]);
  return acc;
}, new Map<string, string[]>());

const requirePermission =
  (permission: string) =>
  async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const { permissions } = request.user as { permissions: string[] };

    if (permissions.includes('*')) return;

    // Resolve to granular slug
    const resolved = LEGACY_ALIASES[permission] ?? permission;

    // 1. Exact granular match
    if (permissions.includes(resolved)) return;

    // 2. User's JWT still holds a legacy slug that maps to the resolved granular slug
    //    (tokens issued before FaseD-3 rotation). O(1) via reverse map.
    const legacySlugs = REVERSE_ALIASES.get(resolved) ?? [];
    if (legacySlugs.some((s) => permissions.includes(s))) return;

    // 3. Route uses legacy slug, user JWT also has the legacy slug (unchanged token)
    if (resolved !== permission && permissions.includes(permission)) return;

    reply.code(403).send({
      success: false,
      code: 'FORBIDDEN',
      message: `Permission required: ${permission}`,
    });
  };

export default requirePermission;
