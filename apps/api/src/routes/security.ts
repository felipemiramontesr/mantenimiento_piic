import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { randomUUID } from 'crypto';
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
  fastify.get('/security/audit-log', jwtGuard('security:audit:view'), async (request, reply) => {
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

  /**
   * POST /v1/security/panic
   * Triggers a SOS PANIC_ALERT notification to all users in the caller's universe.
   * EAL6+: scoped to caller's owner_id(s) via user_owner_membership.
   * Inserts one notifications_outbox row per target user_id.
   */
  fastify.post<{ Body: { latitude?: number; longitude?: number; unitId?: string } }>(
    '/security/panic',
    async (request, reply) => {
      try {
        await request.jwtVerify();
      } catch {
        return reply.code(401).send({ success: false, code: 'UNAUTHORIZED' });
      }

      const caller = request.user as { id: number; permissions: string[] };
      const { latitude, longitude, unitId } = request.body ?? {};
      const panicUuid = randomUUID();

      // Resolve universe members: all user_ids sharing at least one owner_id with caller
      const [membershipRows] = await db.execute<RowDataPacket[]>(
        `SELECT DISTINCT uom2.user_id
         FROM user_owner_membership uom1
         JOIN user_owner_membership uom2 ON uom2.owner_id = uom1.owner_id
         WHERE uom1.user_id = ? AND uom2.user_id != ?`,
        [caller.id, caller.id]
      );

      const targetUserIds = (membershipRows as { user_id: number }[]).map((r) => r.user_id);

      // Always include caller themselves (SOS self-alert)
      const allTargets = [caller.id, ...targetUserIds];

      // Build PANIC notification body including optional GPS context
      const panicNote = [
        unitId ? `Unit: ${unitId}` : null,
        latitude != null && longitude != null ? `GPS: ${latitude},${longitude}` : null,
      ]
        .filter(Boolean)
        .join(' | ');

      const sourceUuid = panicNote ? `${panicUuid}|${panicNote}` : panicUuid;

      // Insert one outbox record per target
      await Promise.all(
        allTargets.map((userId) =>
          db.execute<ResultSetHeader>(
            `INSERT INTO notifications_outbox (permission_slug, notification_type, source_uuid, user_id)
             VALUES (?, ?, ?, ?)`,
            ['*', 'PANIC_ALERT', sourceUuid.slice(0, 36), userId]
          )
        )
      );

      return reply.send({ success: true, panicUuid, notifiedCount: allTargets.length });
    }
  );
}
