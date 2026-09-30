import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import requirePermission from '../middleware/requirePermission';
import FleetIntelligenceKpiService from '../services/fleetIntelligenceService';
import { resolveRequestOwnerScope as resolveOwnerScope } from '../services/ownerScopeResolver';
import requireSession from '../middleware/requireSession';

/** Rutas de inteligencia de flota. */
export default function fleetIntelligenceRoutes(
  fastify: FastifyInstance,
  _opts: FastifyPluginOptions,
  done: (err?: Error) => void
): void {
  fastify.addHook('onRequest', requireSession);

  fastify.get(
    '/fleet-units/:unitId/intelligence',
    { preHandler: [requirePermission('intelligence:anomaly:view')] },
    async (request, reply) => {
      const { unitId } = request.params as { unitId: string };
      try {
        const ownerScope = await resolveOwnerScope(request);
        if (ownerScope !== null && ownerScope.length === 0) {
          return reply.code(403).send({ error: 'Access denied' });
        }

        const result = await FleetIntelligenceKpiService.compute(unitId);
        if (!result) return reply.code(404).send({ error: 'Unit not found' });

        if (ownerScope !== null && !ownerScope.includes(result.ownerId)) {
          return reply.code(403).send({ error: 'Access denied' });
        }

        return reply.send({
          success: true,
          data: {
            oee: result.oee,
            tco_per_km: result.tco_per_km,
            km_per_liter: result.km_per_liter,
            pm_compliance: result.pm_compliance,
            backlog_aging_days: result.backlog_aging_days,
          },
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({ error: 'Internal error computing intelligence KPIs' });
      }
    }
  );
  done();
}
