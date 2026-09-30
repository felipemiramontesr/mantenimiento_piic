import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { reportSecurityEvent } from '../services/securityEvents.service';
import sendGenericNotFound from '../utils/genericNotFound';

/**
 * FC201 F2 · HP1 — rutas carnada: direcciones que solo pide un escáner automático (ningún enlace ni
 * llamada legítima de Archon apunta aquí; lo candada `honeypot.test.ts`). Responden exactamente el
 * 404 genérico (Inv-1) y registran el toque en segundo plano, agregado por la entrada del catálogo
 * y no por la ruta pedida (Inv-2).
 *
 * Catálogo verificado en prod (B3, 2026-09-30): `/.git/*` y `/.env` los corta el borde de Hostinger
 * (403 HTML) antes de llegar a Fastify, así que no se registran aquí.
 */
export const BAIT_ROUTES: readonly string[] = [
  '/wp-login.php',
  '/wp-admin',
  '/wp-admin/*',
  '/phpmyadmin',
  '/phpmyadmin/*',
  '/v1/admin/backup',
  '/v1/debug/env',
  '/actuator/*',
];

/** Registra cada carnada del catálogo para todos los métodos HTTP. */
export default function honeypotRoutes(
  fastify: FastifyInstance,
  _opts: FastifyPluginOptions,
  done: (err?: Error) => void
): void {
  BAIT_ROUTES.forEach((pattern) => {
    // Sin rate limit: sus cabeceras x-ratelimit-* delatarían la carnada frente al 404 genérico
    // (Inv-1, medido en arranque real). La ráfaga la absorbe la coalescencia del servicio.
    fastify.all(pattern, { config: { rateLimit: false } }, (request, reply) => {
      reportSecurityEvent(
        {
          type: 'BAIT_ROUTE',
          ip: request.ip,
          targetPattern: pattern,
          sample: request.url.split('?')[0],
        },
        (err) => request.log.warn({ err }, 'security-event-record-failed')
      );
      return sendGenericNotFound(reply);
    });
  });
  done();
}
