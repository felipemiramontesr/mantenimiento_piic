import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { getAlerts, getAlertsCount, type UserAlertContext } from '../services/alerts.service';

/**
 * FC 094 F3 — Piloto Route→Service→Repository. Zero SQL (I1): auth guard +
 * request-context extraction + delegation to `AlertsService`. Business logic
 * lives in `services/alerts.service.ts`/`alerts.calculators.ts`, all SQL in
 * `services/alerts.repository.ts` (I3).
 */
interface UserAlertJwt {
  id: number;
  permissions: string[];
  tenant_id?: number | null;
}
/** Rutas de alertas del usuario, acotadas a su rol y tenant. */
export default function alertsRoutes(
  fastify: FastifyInstance,
  _opts: FastifyPluginOptions,
  done: (err?: Error) => void
): void {
  fastify.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      reply.code(401).send({ success: false, code: 'UNAUTHORIZED', message: 'Session required' });
    }
  });

  fastify.get('/alerts/count', async (request, reply) => {
    try {
      const { id: userId, permissions, tenant_id: tenantId } = request.user as UserAlertJwt;
      const ctx: UserAlertContext = { userId, permissions, tenantId: tenantId ?? null };
      const count = await getAlertsCount(ctx);
      return reply.send({ success: true, count });
    } catch (error) {
      fastify.log.error({ err: (error as Error).message }, 'Alerts count fetch error');
      return reply.code(500).send({
        success: false,
        code: 'INTERNAL_ERROR',
        message: 'Error al obtener conteo de alertas',
      });
    }
  });

  fastify.get('/alerts', async (request, reply) => {
    try {
      const { id: userId, permissions, tenant_id: tenantId } = request.user as UserAlertJwt;
      const ctx: UserAlertContext = { userId, permissions, tenantId: tenantId ?? null };
      const data = await getAlerts(ctx);
      return reply.send({ success: true, count: data.length, data });
    } catch (error) {
      fastify.log.error({ err: (error as Error).message }, 'Alerts fetch error');
      return reply
        .code(500)
        .send({ success: false, code: 'INTERNAL_ERROR', message: 'Error al obtener alertas' });
    }
  });
  done();
}
