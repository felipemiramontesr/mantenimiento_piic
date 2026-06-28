import { FastifyRequest, FastifyReply } from 'fastify';
import { RowDataPacket } from 'mysql2';
import db from '../services/db';

/**
 * FC-18 FaseD-2 — Scope enforcement middleware (BOLA / OWASP A01:2021)
 *
 * requireOwnership(permBase, operation) checks if the JWT holds:
 *   - `{permBase}:{operation}:any` → sets request.scopeFilter = { anyScope: true }
 *   - `{permBase}:{operation}:own` → queries tenant_user_memberships for owner_id,
 *                                    sets request.scopeFilter = { ownerId }
 *                                    and fills request.universeCtx.ownerId
 *   - neither → 403 FORBIDDEN
 *
 * Handlers read request.scopeFilter to build their WHERE clause:
 *   if (request.scopeFilter && 'ownerId' in request.scopeFilter) {
 *     // add AND owner_id = ? to query
 *   }
 */
const requireOwnership =
  (permBase: string, operation: string) =>
  async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const user = request.user as { id: number; permissions: string[] };
    const { permissions } = user;

    const anyPerm = `${permBase}:${operation}:any`;
    const ownPerm = `${permBase}:${operation}:own`;

    // Omnipotent bypass
    if (permissions.includes('*')) {
      // eslint-disable-next-line no-param-reassign
      request.scopeFilter = { anyScope: true };
      return;
    }

    // :any scope — cross-owner access within the same Universe
    if (permissions.includes(anyPerm)) {
      // eslint-disable-next-line no-param-reassign
      request.scopeFilter = { anyScope: true };
      return;
    }

    // :own scope — filtered to user's Supercluster (owner)
    if (permissions.includes(ownPerm)) {
      const [rows] = await db.execute<RowDataPacket[]>(
        'SELECT owner_id FROM tenant_user_memberships WHERE user_id = ? LIMIT 1',
        [user.id]
      );

      if (!rows.length || rows[0].owner_id == null) {
        reply.code(403).send({
          success: false,
          code: 'FORBIDDEN',
          message: 'No owner membership found for this user',
        });
        return;
      }

      const ownerId = rows[0].owner_id as number;

      // Propagate to universeCtx so downstream middleware can read it
      if (request.universeCtx) {
        // eslint-disable-next-line no-param-reassign
        request.universeCtx = { ...request.universeCtx, ownerId };
      }

      // eslint-disable-next-line no-param-reassign
      request.scopeFilter = { ownerId };
      return;
    }

    reply.code(403).send({
      success: false,
      code: 'FORBIDDEN',
      message: `Permission required: ${anyPerm} or ${ownPerm}`,
    });
  };

export default requireOwnership;
