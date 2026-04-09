import { FastifyInstance } from 'fastify';
import { z } from 'zod';

const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

export async function authRoutes(fastify: FastifyInstance) {
  fastify.post('/login', async (request, reply) => {
    const body = loginSchema.safeParse(request.body);

    if (!body.success) {
      return reply.code(400).send({ error: 'Invalid schema', details: body.error.format() });
    }

    const { username, password } = body.data;

    // Hardcoded Archon check for MVP (to be linked with DB in Phase 1)
    if (username === 'archon' && password === 'pinnacle2026') {
      const token = fastify.jwt.sign({ 
        id: 0, 
        username: 'archon', 
        role: 'Archon' 
      });

      return {
        status: 'success',
        token,
        user: { id: 0, username: 'archon', role: 'Archon' }
      };
    }

    // Log audit failure as requested
    fastify.log.warn(`Unauthorized access attempt for user: ${username}`);
    return reply.code(401).send({ error: 'Unauthorized credentials' });
  });
}
