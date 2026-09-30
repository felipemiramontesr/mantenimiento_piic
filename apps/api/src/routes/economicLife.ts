import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import requirePermission from '../middleware/requirePermission';
import EconomicLifeService from '../services/economicLifeService';
import { resolveRequestOwnerScope as resolveOwnerScope } from '../services/ownerScopeResolver';
import requireSession from '../middleware/requireSession';

/** Rutas de vida económica de las unidades. */
export default function economicLifeRoutes(
  fastify: FastifyInstance,
  _opts: FastifyPluginOptions,
  done: (err?: Error) => void
): void {
  fastify.addHook('onRequest', requireSession);

  fastify.get(
    '/fleet-units/:unitId/economic-life',
    { preHandler: [requirePermission('intelligence:economic-life:view')] },
    async (request, reply) => {
      const { unitId } = request.params as { unitId: string };
      try {
        const ownerScope = await resolveOwnerScope(request);
        if (ownerScope !== null && ownerScope.length === 0) {
          return reply.code(403).send({ error: 'Access denied' });
        }

        const result = await EconomicLifeService.compute(unitId);
        if (!result) return reply.code(404).send({ error: 'Unit not found' });

        if (ownerScope !== null && !ownerScope.includes(result.ownerId)) {
          return reply.code(403).send({ error: 'Access denied' });
        }

        return reply.send({
          success: true,
          data: {
            residual_value_mxn: result.residual_value_mxn,
            accumulated_tco: result.accumulated_tco,
            replacement_score: result.replacement_score,
            recommendation: result.recommendation,
          },
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({ error: 'Internal error computing economic life' });
      }
    }
  );
  done();
}
