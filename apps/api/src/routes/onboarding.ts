import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import requirePermission from '../middleware/requirePermission';

/**
 * FC 082 F3c3 Cond.4 (Bravo) — el alta pública/onboarding real (roles 1-10,
 * INSERT directo a `owners` como si fuera tabla base, tipos `OwnerType` con
 * CENTER/PRIVATE ya purgados por mig.164) dependía de `roles`/`user_roles`,
 * que F3c3 elimina físicamente. Guard puro 501, sin rediseño (prohibido
 * explícito Cond.4/10 — el alta real es scope de G1+, fuera de FC082). El
 * bug de `owners` como tabla (087 §2, ya documentado) queda sin corregir
 * a propósito — el endpoint ya no es alcanzable para exhibirlo.
 */

type RouteGuard = {
  onRequest: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  preHandler: ((request: FastifyRequest, reply: FastifyReply) => Promise<void>)[];
};

const jwtGuard = (permission: string): RouteGuard => ({
  onRequest: async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    try {
      await request.jwtVerify();
    } catch {
      reply.code(401).send({ success: false, code: 'UNAUTHORIZED', message: 'Session required' });
    }
  },
  preHandler: [requirePermission(permission)],
});

function sendRetired(reply: FastifyReply): FastifyReply {
  return reply.code(501).send({
    success: false,
    code: 'NOT_IMPLEMENTED',
    message: 'Onboarding legacy retirado en FC082 F3c3 — pendiente de rediseño en G1+',
  });
}

export default async function onboardingRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post('/onboarding/universe', jwtGuard('*'), async (_request, reply) =>
    sendRetired(reply)
  );

  fastify.post(
    '/onboarding/client',
    jwtGuard('onboarding:client:create'),
    async (_request, reply) => sendRetired(reply)
  );

  fastify.get('/onboarding/universes', jwtGuard('*'), async (_request, reply) =>
    sendRetired(reply)
  );

  fastify.post(
    '/onboarding/member',
    jwtGuard('onboarding:member:create'),
    async (_request, reply) => sendRetired(reply)
  );
}
