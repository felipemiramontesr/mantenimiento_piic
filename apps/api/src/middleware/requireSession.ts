import { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Hook `onRequest` que exige una sesión JWT válida y, si no la hay, responde 401. FC202 F2: antes era
 * una copia literal en diez plugins de rutas; ahora es la única definición.
 */
export default async function requireSession(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    await request.jwtVerify();
  } catch {
    reply.code(401).send({ error: 'Archon Protection: Session required' });
  }
}
