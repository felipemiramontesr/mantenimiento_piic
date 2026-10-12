import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { HANDLE_PATTERN } from '../services/arcsialHandle';
import type { ArcsialError } from '../services/arcsialProfiles.service';

/**
 * FC209 F2 / FC210 F2 — piezas HTTP compartidas por las rutas de Arcsial: el esquema del handle
 * (minúsculas, `[a-z0-9_]{3,30}`, sin `@`: un correo jamás llega al servicio) y la traducción del
 * resultado de un servicio a la respuesta.
 */

export const handleSchema = z.string().trim().toLowerCase().regex(HANDLE_PATTERN);

/** Id del usuario de la sesión (garantizado por `requireSession`). */
export function callerId(request: FastifyRequest): number {
  return (request.user as { id: number }).id;
}

/** 400 uniforme para una entrada inválida; `code` permite el código propio de una puerta. */
export function badRequest(reply: FastifyReply, code = 'VALIDATION_ERROR'): FastifyReply {
  return reply.code(400).send({ success: false, code });
}

/** Un rechazo del servicio con su código, o el éxito con el estado indicado. */
export function sendResult<T extends object>(
  reply: FastifyReply,
  result: ({ ok: true } & T) | ArcsialError,
  okStatus = 200
): FastifyReply {
  if (!result.ok) {
    return reply
      .code(result.status)
      .send({ success: false, code: result.code, message: result.message });
  }
  // `success` sustituye al `ok` interno del servicio, que no viaja en la respuesta.
  const data = Object.fromEntries(Object.entries(result).filter(([key]) => key !== 'ok'));
  return reply.code(okStatus).send({ success: true, ...data });
}
