import { isIP } from 'node:net';
import { FastifyInstance, FastifyReply, FastifyRequest, RouteShorthandOptions } from 'fastify';
import { z } from 'zod';
import { denyIp, getSecurityConsole, revokeIpDenial } from '../services/securityDenylist.service';

/**
 * FC201 F3 — consola de eventos de seguridad de Ω en Cosmología: eventos de los últimos 15 días
 * (IP en claro solo en esa ventana, P3) y bloqueo perimetral manual con vencimiento y revocación
 * (P4). Todas las rutas son Ω-exclusivas (mismo `omegaGuard` que el resto de Cosmología).
 */

const denyIpSchema = z.object({
  ip: z
    .string()
    .trim()
    .refine((value) => isIP(value) !== 0, 'IP inválida'),
  hours: z.number().int().min(1).max(720),
  reason: z.string().trim().max(255).optional(),
});

const ipHashParamSchema = z.object({ ipHash: z.string().regex(/^[0-9a-f]{64}$/) });

/** GET — eventos agregados y bloqueos vigentes, con fechas en UTC para el reporte de abuso. */
async function handleListSecurityEvents(
  _request: FastifyRequest,
  reply: FastifyReply
): Promise<FastifyReply> {
  const { events, blocks } = await getSecurityConsole();
  return reply.send({
    success: true,
    data: {
      events: events.map((e) => ({
        eventType: e.event_type,
        ipHash: e.ip_hash,
        ipAddress: e.ip_address,
        targetPattern: e.target_pattern,
        hits: Number(e.hits),
        firstSeenUtc: e.first_seen_utc,
        lastSeenUtc: e.last_seen_utc,
      })),
      blocks: blocks.map((b) => ({
        ipHash: b.ip_hash,
        ipAddress: b.ip_address,
        reason: b.reason,
        expiresUtc: b.expires_utc,
      })),
    },
  });
}

/** POST — Ω bloquea una IP (1 h a 30 días). Re-bloquear renueva el vencimiento. */
async function handleDenyIp(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
  const parsed = denyIpSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.code(400).send({ success: false, code: 'VALIDATION_ERROR' });
  }
  const { ip, hours, reason } = parsed.data;
  const caller = request.user as { id: number };
  const ipHash = await denyIp({ ip, hours, reason: reason || null, createdBy: caller.id });
  return reply.code(201).send({ success: true, data: { ipHash } });
}

/** DELETE — Ω revoca un bloqueo vigente. */
async function handleRevokeDenial(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<FastifyReply> {
  const params = ipHashParamSchema.safeParse(request.params);
  if (!params.success) {
    return reply.code(400).send({ success: false, code: 'VALIDATION_ERROR' });
  }
  const revoked = await revokeIpDenial(params.data.ipHash);
  if (!revoked) return reply.code(404).send({ success: false, code: 'NOT_FOUND' });
  return reply.send({ success: true });
}

/** Registra las 3 rutas de eventos de seguridad bajo el guard Ω de Cosmología. */
export default function registerSecurityEventRoutes(
  fastify: FastifyInstance,
  omegaGuard: RouteShorthandOptions
): void {
  fastify.get('/security-events', omegaGuard, handleListSecurityEvents);
  fastify.post('/security-events/deny-ip', omegaGuard, handleDenyIp);
  fastify.delete('/security-events/deny-ip/:ipHash', omegaGuard, handleRevokeDenial);
}
