import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { RowDataPacket } from 'mysql2';
import db from '../services/db';
import requirePermission from '../middleware/requirePermission';

type RouteGuard = {
  onRequest: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  preHandler: ((request: FastifyRequest, reply: FastifyReply) => Promise<void>)[];
};

const jwtGuard = (permission: string): RouteGuard => ({
  onRequest: async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    try {
      await request.jwtVerify();
    } catch {
      reply.code(401).send({ success: false, code: 'UNAUTHORIZED', message: 'Session required' });
    }
  },
  preHandler: [requirePermission(permission)],
});

// Returns null for Archon (sees all), number[] of owner_ids for scoped users
const resolveAuditScope = async (request: FastifyRequest): Promise<number[] | null> => {
  const { id, permissions } = request.user as { id: number; permissions?: string[] };
  if (!permissions || permissions.includes('*')) return null;
  const [rows] = await db.execute<RowDataPacket[]>(
    'SELECT DISTINCT owner_id FROM user_owner_membership WHERE user_id = ?',
    [id]
  );
  return rows.map((r) => r.owner_id as number);
};

export default async function securityRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /security/audit-log
   * Returns paginated audit log scoped by universe.
   * Archon (permissions='*') sees all universes.
   * Other users see only entries belonging to their owner(s).
   */
  fastify.get('/security/audit-log', jwtGuard('user:admin'), async (request, reply) => {
    try {
      const query = request.query as {
        page?: string;
        limit?: string;
        entity_type?: string;
        action?: string;
        date_from?: string;
        date_to?: string;
      };

      const page = Math.max(1, parseInt(query.page ?? '1', 10));
      const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? '20', 10)));
      const offset = (page - 1) * limit;

      const ownerScope = await resolveAuditScope(request);

      // Build WHERE clauses dynamically
      const conditions: string[] = [];
      const params: (string | number | null)[] = [];

      if (ownerScope !== null) {
        if (ownerScope.length === 0) {
          return reply.send({ success: true, data: [], meta: { page, limit, total: 0 } });
        }
        conditions.push(`a.owner_id IN (${ownerScope.map(() => '?').join(',')})`);
        params.push(...ownerScope);
      }

      if (query.entity_type) {
        conditions.push('a.entity_type = ?');
        params.push(query.entity_type);
      }

      if (query.action) {
        conditions.push('a.action = ?');
        params.push(query.action);
      }

      if (query.date_from) {
        conditions.push('a.created_at >= ?');
        params.push(query.date_from);
      }

      if (query.date_to) {
        conditions.push('a.created_at <= ?');
        params.push(`${query.date_to} 23:59:59`);
      }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const countSql = `SELECT COUNT(*) AS total FROM administrative_audit_logs a ${where}`;
      const [countRows] = await db.execute<RowDataPacket[]>(countSql, params);
      const total = (countRows[0]?.total as number) ?? 0;

      const dataSql = `
        SELECT
          a.uuid, a.entity_type, a.entity_id, a.action,
          a.snapshot_before, a.snapshot_after, a.reason,
          a.created_at, a.owner_id,
          u.username AS actor_username, u.full_name AS actor_full_name,
          o.label AS universe_label
        FROM administrative_audit_logs a
        LEFT JOIN users u ON u.id = a.user_id
        LEFT JOIN owners o ON o.id = a.owner_id
        ${where}
        ORDER BY a.created_at DESC
        LIMIT ? OFFSET ?
      `;

      const [rows] = await db.execute<RowDataPacket[]>(dataSql, [...params, limit, offset]);

      return reply.send({ success: true, data: rows, meta: { page, limit, total } });
    } catch (e) {
      fastify.log.error(e);
      return reply.code(500).send({ success: false, code: 'AUDIT_FETCH_FAIL' });
    }
  });
}
