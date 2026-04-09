import { FastifyInstance } from 'fastify';

export async function telemetryRoutes(fastify: FastifyInstance) {
  // Security middleware for telemetry (Archon only)
  fastify.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify();
      const decoded = request.user as { id: number };
      if (decoded.id !== 0) {
        return reply.code(403).send({ error: 'Forbidden: Archon clearance required' });
      }
    } catch (err) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
  });

  fastify.get('/telemetry', async () => {
    return {
      system: {
        cpu: '24%',
        memory: '4.2GB / 8GB',
        uptime: '15d 4h 22m',
        db_health: 'Optimum',
      },
      fleet: {
        active_units: 42,
        maintenance_pending: 3,
        alerts: 0,
      },
      timestamp: new Date().toISOString()
    };
  });
}
