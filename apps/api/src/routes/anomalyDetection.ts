import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import requirePermission from '../middleware/requirePermission';
import AnomalyDetectionService from '../services/anomalyDetectionService';
import { resolveRequestOwnerScope as resolveOwnerScope } from '../services/ownerScopeResolver';
import requireSession from '../middleware/requireSession';

/** Rutas de detección de anomalías de la flota. */
export default function anomalyDetectionRoutes(
  fastify: FastifyInstance,
  _opts: FastifyPluginOptions,
  done: (err?: Error) => void
): void {
  fastify.addHook('onRequest', requireSession);

  fastify.get(
    '/fleet-units/:unitId/anomalies',
    { preHandler: [requirePermission('intelligence:anomaly:view')] },
    async (request, reply) => {
      const { unitId } = request.params as { unitId: string };
      try {
        const ownerScope = await resolveOwnerScope(request);
        if (ownerScope !== null && ownerScope.length === 0) {
          return reply.code(403).send({ error: 'Access denied' });
        }

        const result = await AnomalyDetectionService.compute(unitId);
        if (!result) return reply.code(404).send({ error: 'Unit not found' });

        if (ownerScope !== null && !ownerScope.includes(result.ownerId)) {
          return reply.code(403).send({ error: 'Access denied' });
        }

        return reply.send({
          success: true,
          data: {
            fleet_size: result.fleet_size,
            algorithm: result.algorithm,
            unit_km_per_liter: result.unit_km_per_liter,
            baseline_km_per_liter: result.baseline_km_per_liter,
            deviation_pct: result.deviation_pct,
            z_score: result.z_score,
            is_anomaly: result.is_anomaly,
          },
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({ error: 'Internal error computing anomaly detection' });
      }
    }
  );
  done();
}
