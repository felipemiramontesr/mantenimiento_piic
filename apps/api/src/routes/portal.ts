import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { RowDataPacket } from 'mysql2';
import db from '../services/db';

async function getCallerOwnerIds(userId: number): Promise<number[]> {
  const [rows] = await db.execute<RowDataPacket[]>(
    'SELECT owner_id FROM user_owner_membership WHERE user_id = ?',
    [userId]
  );
  return rows.map((r) => r.owner_id as number);
}

// EAL6+ portal gate — role_id=4 only; backend is the sole source of truth (AG)
async function portalScopeMiddleware(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    await request.jwtVerify();
  } catch {
    reply.code(401).send({ error: 'Session required' });
    return;
  }

  const caller = request.user as { id: number; roleId: number; permissions: string[] };

  if (caller.roleId !== 4) {
    reply.code(403).send({ error: 'PORTAL_ACCESS_DENIED' });
    return;
  }

  // Reject spoofed X-Owner-Id header if not in caller's legitimate scope
  const spoofedHeader = request.headers['x-owner-id'];
  if (spoofedHeader) {
    const ownerIds = await getCallerOwnerIds(caller.id);
    if (!ownerIds.includes(Number(spoofedHeader))) {
      reply.code(403).send({ error: 'CROSS_TENANT_BLOCKED' });
    }
  }
}

interface FleetUnitRow {
  id: string;
  owner_id: number;
  brand: string;
  model: string;
  year: number;
  status: string;
}

interface WorkOrderRow {
  id: number;
  unit_id: string;
  type: string;
  start_datetime: string;
  end_datetime: string | null;
}

export default async function portalRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get(
    '/portal/fleet-status',
    { preHandler: [portalScopeMiddleware] },
    async (request, reply) => {
      const caller = request.user as { id: number; roleId: number };

      try {
        const ownerIds = await getCallerOwnerIds(caller.id);
        if (ownerIds.length === 0) return reply.send({ units: [] });

        const ph = ownerIds.map(() => '?').join(',');
        const [rows] = await db.execute<RowDataPacket[]>(
          `SELECT id, owner_id, brand, model, year, status
           FROM fleet_units
           WHERE owner_id IN (${ph})
           ORDER BY id ASC`,
          ownerIds
        );

        return reply.send({
          units: rows.map((r) => {
            const row = r as FleetUnitRow;
            return {
              id: row.id,
              ownerId: row.owner_id,
              brand: row.brand,
              model: row.model,
              year: row.year,
              status: row.status,
            };
          }),
        });
      } catch {
        return reply.code(500).send({ error: 'PORTAL_FLEET_FAIL' });
      }
    }
  );

  fastify.get(
    '/portal/work-orders',
    { preHandler: [portalScopeMiddleware] },
    async (request, reply) => {
      const caller = request.user as { id: number; roleId: number };

      try {
        const ownerIds = await getCallerOwnerIds(caller.id);
        if (ownerIds.length === 0) return reply.send({ workOrders: [] });

        const ph = ownerIds.map(() => '?').join(',');
        const [rows] = await db.execute<RowDataPacket[]>(
          `SELECT fm.id, fm.unit_id, fm.movement_type AS type,
                  fm.start_datetime, fm.end_datetime
           FROM fleet_movements fm
           INNER JOIN fleet_units fu ON fu.id = fm.unit_id
           WHERE fu.owner_id IN (${ph}) AND fm.movement_type = 'MAINTENANCE'
           ORDER BY fm.start_datetime DESC
           LIMIT 50`,
          ownerIds
        );

        return reply.send({
          workOrders: rows.map((r) => {
            const row = r as WorkOrderRow;
            return {
              id: row.id,
              unitId: row.unit_id,
              type: row.type,
              startDatetime: row.start_datetime,
              endDatetime: row.end_datetime,
            };
          }),
        });
      } catch {
        return reply.code(500).send({ error: 'PORTAL_ORDERS_FAIL' });
      }
    }
  );
}
