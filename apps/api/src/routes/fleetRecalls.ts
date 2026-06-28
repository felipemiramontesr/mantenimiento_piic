import { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import db from '../services/db';
import requirePermission from '../middleware/requirePermission';
import FleetService from '../services/fleetService';
import { RECALL_STATUS_ENUM } from '../constants/recalls';

const resolveOwnerScope = async (request: FastifyRequest): Promise<number[] | null> => {
  const { id, permissions } = request.user as { id: number; permissions?: string[] };
  if (!permissions || permissions.includes('*') || !permissions.includes('fleet:scoped'))
    return null;
  return FleetService.getUserOwnerIds(id);
};

const verifyUnitAccess = async (unitId: string, ownerScope: number[] | null): Promise<boolean> => {
  if (ownerScope === null) return true;
  if (ownerScope.length === 0) return false;
  const [rows] = await db.execute<RowDataPacket[]>(`SELECT ownerId FROM fleet_units WHERE id = ?`, [
    unitId,
  ]);
  if (rows.length === 0) return false;
  return ownerScope.includes(rows[0].ownerId as number);
};

const addRecallSchema = z.object({
  recallId: z.number({ required_error: 'recallId es requerido' }).int().positive(),
});

const updateRecallSchema = z.object({
  status: z.enum(RECALL_STATUS_ENUM, { required_error: 'status es requerido' }),
  workOrderId: z.number().int().positive().optional(),
});

export type RecallItem = {
  recall_id: number;
  campaign_code: string;
  description: string;
  make: string;
  model: string;
  year: number;
  published_date: string;
  status: string;
  resolved_at: string | null;
  work_order_id: number | null;
};

export function buildRecallItem(row: RecallItem): Record<string, unknown> {
  return {
    recall_id: row.recall_id,
    campaign_code: row.campaign_code,
    description: row.description,
    make: row.make,
    model: row.model,
    year: row.year,
    published_date: row.published_date,
    status: row.status,
    resolved_at: row.resolved_at ?? null,
    work_order_id: row.work_order_id ?? null,
  };
}

export default async function fleetRecallsRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      reply.code(401).send({ error: 'Archon Protection: Session required' });
    }
  });

  fastify.get(
    '/fleet-units/:unitId/recalls',
    { preHandler: [requirePermission('intelligence:recall:view')] },
    async (request, reply) => {
      const { unitId } = request.params as { unitId: string };
      try {
        const ownerScope = await resolveOwnerScope(request);
        const hasAccess = await verifyUnitAccess(unitId, ownerScope);
        if (!hasAccess) return reply.code(403).send({ error: 'Access denied' });
        const [rows] = await db.execute<RowDataPacket[]>(
          `SELECT fur.recall_id, cr.campaign_code, cr.description,
                  cr.make, cr.model, cr.year, cr.published_date,
                  fur.status, fur.resolved_at, fur.work_order_id
           FROM fleet_unit_recalls fur
           JOIN catalog_recalls cr ON cr.id = fur.recall_id
           WHERE fur.fleet_unit_id = ?
           ORDER BY cr.published_date DESC`,
          [unitId]
        );
        return reply.send({
          success: true,
          count: rows.length,
          data: (rows as RecallItem[]).map(buildRecallItem),
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({ error: 'Internal error retrieving recalls' });
      }
    }
  );

  fastify.post(
    '/fleet-units/:unitId/recalls',
    { preHandler: [requirePermission('intelligence:recall:manage')] },
    async (request, reply) => {
      const { unitId } = request.params as { unitId: string };
      const parse = addRecallSchema.safeParse(request.body);
      if (!parse.success) {
        return reply.code(400).send({ error: 'Validation failed', details: parse.error.format() });
      }
      const { recallId } = parse.data;
      try {
        const ownerScope = await resolveOwnerScope(request);
        const hasAccess = await verifyUnitAccess(unitId, ownerScope);
        if (!hasAccess) return reply.code(403).send({ error: 'Access denied' });
        const [rcRows] = await db.execute<RowDataPacket[]>(
          `SELECT id FROM catalog_recalls WHERE id = ?`,
          [recallId]
        );
        if (rcRows.length === 0) return reply.code(404).send({ error: 'Recall not found' });
        await db.execute<ResultSetHeader>(
          `INSERT INTO fleet_unit_recalls (fleet_unit_id, recall_id) VALUES (?, ?)`,
          [unitId, recallId]
        );
        return reply.code(201).send({ success: true });
      } catch (error: unknown) {
        if ((error as Error & { code?: string }).code === 'ER_DUP_ENTRY') {
          return reply.code(409).send({ error: 'Recall already linked to this unit' });
        }
        fastify.log.error(error);
        return reply.code(500).send({ error: 'Internal error linking recall' });
      }
    }
  );

  fastify.patch(
    '/fleet-units/:unitId/recalls/:recallId',
    { preHandler: [requirePermission('intelligence:recall:manage')] },
    async (request, reply) => {
      const { unitId, recallId } = request.params as { unitId: string; recallId: string };
      const parse = updateRecallSchema.safeParse(request.body);
      if (!parse.success) {
        return reply.code(400).send({ error: 'Validation failed', details: parse.error.format() });
      }
      const { status, workOrderId } = parse.data;
      const resolvedAt = status === 'COMPLETED' ? new Date().toISOString().slice(0, 10) : null;
      try {
        const ownerScope = await resolveOwnerScope(request);
        const hasAccess = await verifyUnitAccess(unitId, ownerScope);
        if (!hasAccess) return reply.code(403).send({ error: 'Access denied' });
        const [result] = await db.execute<ResultSetHeader>(
          `UPDATE fleet_unit_recalls
           SET status = ?, resolved_at = ?, work_order_id = ?
           WHERE fleet_unit_id = ? AND recall_id = ?`,
          [status, resolvedAt, workOrderId ?? null, unitId, Number(recallId)]
        );
        if (result.affectedRows === 0) {
          return reply.code(404).send({ error: 'Recall link not found for this unit' });
        }
        return reply.send({ success: true });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({ error: 'Internal error updating recall' });
      }
    }
  );
}
