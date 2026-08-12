import { FastifyInstance, FastifyRequest } from 'fastify';
import requirePermission from '../middleware/requirePermission';
import * as ReportsService from '../services/reports.service';
import type { ReportsUser } from '../services/reports.service';

/**
 * FC157 F1 — Route→Service→Repository. Zero SQL (I1): auth/permission
 * guards + HTTP status codes stay here; business logic (owner-scoping, PDF
 * render) lives in `services/reports.service.ts`, all SQL in
 * `services/reports.repository.ts` (I3).
 *
 * 🔱 Archon Routes: reports (FC 041 Fase E)
 * GET /v1/reports/maintenance/:uuid/pdf — PDF de una orden de mantenimiento.
 *
 * Seguridad (enmienda F.E con visto de Ω):
 * - Mismo permiso que el módulo fuente: maint:record:view:any.
 * - MISMA proyección anti-BOPLA del detalle existente (columnas explícitas,
 *   fleetMaintenance.ts GET /maintenance/:uuid) — CERO descifrados nuevos:
 *   ningún campo PII (§8.1) se consulta ni viaja al documento.
 * - Mismo owner-scoping fail-closed que el módulo fuente (fleet:scoped).
 */

function requestUser(request: FastifyRequest): ReportsUser {
  return request.user as ReportsUser;
}

export async function reportsRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      reply.code(401).send({ success: false, code: 'UNAUTHORIZED', message: 'Session required' });
    }
  });
  fastify.addHook('preHandler', requirePermission('maint:record:view:any'));

  fastify.get('/reports/maintenance/:uuid/pdf', async (request, reply) => {
    try {
      const { uuid } = request.params as { uuid: string };
      const pdf = await ReportsService.getMaintenanceOrderPdf(requestUser(request), uuid);
      if (pdf === null) {
        return reply.code(404).send({ success: false, message: 'Order not found' });
      }
      return reply
        .type('application/pdf')
        .header('Content-Disposition', `attachment; filename="orden_${uuid}.pdf"`)
        .send(pdf);
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ success: false, message: 'Error generating PDF report' });
    }
  });
}

export default reportsRoutes;
