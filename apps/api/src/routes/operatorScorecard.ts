import { FastifyInstance, FastifyRequest } from 'fastify';
import requirePermission from '../middleware/requirePermission';
import OperatorScorecardService from '../services/operatorScorecardService';
import { resolveOwnerScope as resolveScope } from '../services/ownerScopeResolver';

// FC144 (Cond.R-144-B2) — delegación al SSOT ownerScopeResolver.ts, cero copia local.
const resolveOwnerScope = (request: FastifyRequest): Promise<number[] | null> => {
  const {
    id,
    permissions,
    tenant_id: tenantId,
  } = request.user as {
    id: number;
    permissions?: string[];
    tenant_id?: number | null;
  };
  return resolveScope({ id, permissions, tenant_id: tenantId });
};

export default async function operatorScorecardRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      reply.code(401).send({ error: 'Archon Protection: Session required' });
    }
  });

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
}
