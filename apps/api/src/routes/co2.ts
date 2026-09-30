import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import requirePermission from '../middleware/requirePermission';
import Co2Service from '../services/co2Service';
import { resolveRequestOwnerScope as resolveOwnerScope } from '../services/ownerScopeResolver';
import requireSession from '../middleware/requireSession';

/** Rutas de emisiones de CO2 de la flota. */
export default function co2Routes(
  fastify: FastifyInstance,
  _opts: FastifyPluginOptions,
  done: (err?: Error) => void
): void {
  fastify.addHook('onRequest', requireSession);

  fastify.get(
    '/fleet-units/:unitId/co2',
    { preHandler: [requirePermission('intelligence:co2:view')] },
    async (request, reply) => {
      const { unitId } = request.params as { unitId: string };
      const { from, to } = request.query as { from?: string; to?: string };
      try {
        const ownerScope = await resolveOwnerScope(request);
        if (ownerScope !== null && ownerScope.length === 0) {
          return reply.code(403).send({ error: 'Access denied' });
        }

        const result = await Co2Service.compute(unitId, { from, to });
        if (!result) return reply.code(404).send({ error: 'Unit not found' });

        if (ownerScope !== null && !ownerScope.includes(result.ownerId)) {
          return reply.code(403).send({ error: 'Access denied' });
        }

        return reply.send({
          success: true,
          data: {
            fuel_code: result.fuel_code,
            co2_factor_kg_per_liter: result.co2_factor_kg_per_liter,
            total_liters: result.total_liters,
            total_co2_kg: result.total_co2_kg,
            period_from: result.period_from,
            period_to: result.period_to,
          },
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({ error: 'Internal error computing CO2 emissions' });
      }
    }
  );
  done();
}
