import { FastifyInstance, FastifyRequest } from 'fastify';
import requirePermission from '../middleware/requirePermission';
import FleetService from '../services/fleetService';
import EconomicLifeService from '../services/economicLifeService';

const resolveOwnerScope = async (request: FastifyRequest): Promise<number[] | null> => {
  const { id, permissions } = request.user as { id: number; permissions?: string[] };
  if (!permissions || permissions.includes('*') || !permissions.includes('fleet:scoped'))
    return null;
  return FleetService.getUserOwnerIds(id);
};

export default async function economicLifeRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      reply.code(401).send({ error: 'Archon Protection: Session required' });
    }
  });

  fastify.get(
    '/fleet-units/:unitId/economic-life',
    { preHandler: [requirePermission('fleet:view')] },
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
}
