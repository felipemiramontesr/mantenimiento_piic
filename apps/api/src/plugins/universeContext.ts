import { FastifyInstance } from 'fastify';

/**
 * UniverseContext — FC-18 FaseC-1
 * Global preHandler plugin that derives tenancy context from the decoded JWT
 * and decorates every authenticated request with `request.universeCtx`.
 *
 * Design choice: NO additional DB query at this layer.
 * ownerId resolution is intentionally deferred to FaseD-2's requireOwnership
 * middleware, which queries user_owner_membership on-demand per protected route.
 * This avoids an extra DB roundtrip on every authenticated request.
 *
 * Scope levels:
 *   isOmnipotent = true  → Archon (roleId=0 or permissions=['*']), unrestricted
 *   isOmnipotent = false → Regular user, scope enforced by FaseD-2 per route
 */

export default async function universeContextPlugin(fastify: FastifyInstance): Promise<void> {
  fastify.decorateRequest('universeCtx', null);

  fastify.addHook('preHandler', async (request) => {
    // Public routes (login, health) — jwtVerify() not yet called, user undefined
    const user = request.user as
      | { id?: number; roleId?: number; permissions?: string[] }
      | undefined;
    if (!user || !user.id) return;

    const { roleId = -1, permissions = [] } = user;
    const isOmnipotent = roleId === 0 || permissions.includes('*');

    // eslint-disable-next-line no-param-reassign
    request.universeCtx = {
      universeId: 1, // Singleton: one Archon universe per deployment
      tenantId: 0, // Resolved on-demand by FaseD-2 requireOwnership
      ownerId: null, // Resolved on-demand by FaseD-2 requireOwnership
      isOmnipotent,
    };
  });
}

// Skip encapsulation — hooks and decorators apply to the root Fastify scope (global)
(universeContextPlugin as unknown as Record<symbol, boolean>)[Symbol.for('skip-override')] = true;
