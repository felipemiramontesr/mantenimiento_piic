import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import requirePermission from '../middleware/requirePermission';
import OperatorScorecardService from '../services/operatorScorecardService';
import { resolveRequestOwnerScope as resolveOwnerScope } from '../services/ownerScopeResolver';
import requireSession from '../middleware/requireSession';

/** Rutas del scorecard de operadores. */
export default function operatorScorecardRoutes(
  fastify: FastifyInstance,
  _opts: FastifyPluginOptions,
  done: (err?: Error) => void
): void {
  fastify.addHook('onRequest', requireSession);

  fastify.get(
    '/fleet-units/:unitId/operator-score',
    { preHandler: [requirePermission('intelligence:scorecard:view')] },
    async (request, reply) => {
      const { unitId } = request.params as { unitId: string };
      try {
        const ownerScope = await resolveOwnerScope(request);
        if (ownerScope !== null && ownerScope.length === 0) {
          return reply.code(403).send({ error: 'Access denied' });
        }

        const result = await OperatorScorecardService.compute(unitId);
        if (!result) return reply.code(404).send({ error: 'Unit not found' });

        if (ownerScope !== null && !ownerScope.includes(result.ownerId)) {
          return reply.code(403).send({ error: 'Access denied' });
        }

        return reply.send({
          success: true,
          data: {
            driver_id: result.driver_id,
            route_count: result.route_count,
            fuel_efficiency_score: result.fuel_efficiency_score,
            incident_rate_score: result.incident_rate_score,
            checkpoint_adherence_score: result.checkpoint_adherence_score,
            composite_score: result.composite_score,
          },
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({ error: 'Internal error computing operator scorecard' });
      }
    }
  );
  done();
}
