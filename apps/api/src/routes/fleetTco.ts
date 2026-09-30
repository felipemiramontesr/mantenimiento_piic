import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { RowDataPacket } from 'mysql2';
import db from '../services/db';
import requirePermission from '../middleware/requirePermission';
import { resolveRequestOwnerScope as resolveOwnerScope } from '../services/ownerScopeResolver';
import requireSession from '../middleware/requireSession';

export type TcoRow = {
  fleet_unit_id: string;
  owner_id: number;
  tco_total: string | number;
  tco_maintenance: string | number;
  tco_insurance: string | number;
  tco_lease: string | number;
  tco_tenencia: string | number;
  tco_verificacion: string | number;
  tco_fuel: string | number;
  tco_other: string | number;
  total_records: string | number;
  last_record_at: string | null;
};

export function buildTcoResponse(row: TcoRow): Record<string, unknown> {
  return {
    fleet_unit_id: row.fleet_unit_id,
    tco_total: Number(row.tco_total),
    tco_maintenance: Number(row.tco_maintenance),
    tco_insurance: Number(row.tco_insurance),
    tco_lease: Number(row.tco_lease),
    tco_tenencia: Number(row.tco_tenencia),
    tco_verificacion: Number(row.tco_verificacion),
    tco_fuel: Number(row.tco_fuel),
    tco_other: Number(row.tco_other),
    total_records: Number(row.total_records),
    last_record_at: row.last_record_at ?? null,
  };
}

/** Rutas de costo total de propiedad (TCO) de la flota. */
export default function fleetTcoRoutes(
  fastify: FastifyInstance,
  _opts: FastifyPluginOptions,
  done: (err?: Error) => void
): void {
  fastify.addHook('onRequest', requireSession);

  fastify.get(
    '/fleet-units/:unitId/tco',
    { preHandler: [requirePermission('intelligence:tco:view')] },
    async (request, reply) => {
      const { unitId } = request.params as { unitId: string };
      try {
        const ownerScope = await resolveOwnerScope(request);
        if (ownerScope !== null && ownerScope.length === 0) {
          return reply.code(403).send({ error: 'Access denied' });
        }
        const [rows] = await db.query<RowDataPacket[]>(
          `SELECT fleet_unit_id, owner_id,
                  tco_total, tco_maintenance, tco_insurance, tco_lease,
                  tco_tenencia, tco_verificacion, tco_fuel, tco_other,
                  total_records, last_record_at
           FROM view_fleet_units_tco WHERE fleet_unit_id = ?`,
          [unitId]
        );
        if (rows.length === 0) return reply.code(404).send({ error: 'Unit not found' });
        const row = rows[0] as TcoRow;
        if (ownerScope !== null && !ownerScope.includes(row.owner_id)) {
          return reply.code(403).send({ error: 'Access denied' });
        }
        return reply.send({ success: true, data: buildTcoResponse(row) });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({ error: 'Internal error retrieving TCO' });
      }
    }
  );
  done();
}
