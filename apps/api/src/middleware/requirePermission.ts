import { FastifyRequest, FastifyReply } from 'fastify';

/**
 * RBAC permission guard — A01:2021 / A07:2021
 * Returns a Fastify preHandler that verifies the JWT user holds the required permission.
 * Omnipotent users (permissions: ['*']) bypass all checks.
 *
 * Usage:
 *   // Route-level (all endpoints):
 *   fastify.addHook('preHandler', requirePermission('fleet:view'));
 *
 *   // Endpoint-level:
 *   fastify.post('/fleet', { preHandler: [requirePermission('fleet:write')] }, handler);
 */
const requirePermission =
  (permission: string) =>
  async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const user = request.user as { permissions?: string[] } | undefined;
    const permissions = user?.permissions ?? [];

    if (permissions.includes('*') || permissions.includes(permission)) return;

    reply.code(403).send({
      success: false,
      code: 'FORBIDDEN',
      message: `Permission required: ${permission}`,
    });
  };

export default requirePermission;
