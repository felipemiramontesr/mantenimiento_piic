import { FastifyReply, FastifyRequest, RouteShorthandOptions } from 'fastify';
import { requireOmega } from '../middleware/cosmonautMiddleware';
import { sendMailTest } from '../services/mailDiagnostic.service';

/**
 * FC188 F1 — `POST /v1/cosmology/mail/test`. Sin body: el destinatario es el correo registrado de la
 * propia cuenta de Ω (anti-relay). Un fallo de SMTP responde 200 con `status: 'failed'` — ese es el
 * diagnóstico. Zero-SQL: la lógica vive en `mailDiagnostic.service.ts`.
 */

/** Límite del diagnóstico: 3/hora POR USUARIO (no por IP). El plugin agrega su manejador al arreglo
 *  del hook de la ruta, así que corre en `preHandler` (después de `jwtVerify` + `requireOmega`)
 *  para poder leer `request.user`. */
const mailTestRateLimit = {
  max: 3,
  timeWindow: '1 hour',
  hook: 'preHandler' as const,
  keyGenerator: (request: FastifyRequest): string => String((request.user as { id: number }).id),
  errorResponseBuilder: (): object => ({
    statusCode: 429,
    success: false,
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Límite de 3 correos de prueba por hora alcanzado — intenta de nuevo más tarde',
  }),
};

/**
 * Opciones de la ruta: `onRequest` es el `jwtVerify` del guard de Ω (una sola fuente) y el
 * `preHandler` es PROPIO y NUEVO en cada registro — el limitador anexa su manejador (con su
 * almacén) a ese arreglo, y uno a nivel de módulo acumularía un limitador por cada `buildApp()`.
 */
export function buildMailTestRoute(
  onRequest: (request: FastifyRequest) => Promise<void>
): RouteShorthandOptions {
  return {
    onRequest,
    preHandler: [requireOmega()],
    config: { rateLimit: mailTestRateLimit },
  };
}

/** Envía la prueba al correo de la cuenta autenticada y mapea el resultado a HTTP. */
export async function handleMailTest(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<FastifyReply> {
  const result = await sendMailTest({
    userId: (request.user as { id: number }).id,
    mode: request.server.mailMode,
    transport: request.server.mailTransport,
    sentAt: new Date(),
  });
  if (!result.ok) {
    return reply
      .code(result.status)
      .send({ success: false, code: result.code, message: result.message });
  }
  return reply.send({
    success: true,
    mode: result.mode,
    status: result.status,
    reason: result.reason,
    messageId: result.messageId,
  });
}
