import { FastifyReply } from 'fastify';

/**
 * FC201 — el único 404 de la API. Lo usan el `setNotFoundHandler` (F1, sin huella de Fastify) y las
 * rutas carnada (F2): al compartir la misma función, una carnada es indistinguible de una ruta
 * inexistente por construcción (Inv-1 · TRUTH_EQUALITY).
 */
export default function sendGenericNotFound(reply: FastifyReply): FastifyReply {
  return reply.code(404).send({ error: 'Not Found' });
}
