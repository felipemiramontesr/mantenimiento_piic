import { FastifyInstance, FastifyRequest } from 'fastify';
import { RowDataPacket } from 'mysql2';
import PDFDocument from 'pdfkit';
import db from '../services/db';
import requirePermission from '../middleware/requirePermission';
import FleetService from '../services/fleetService';

/**
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

const resolveOwnerScope = async (request: FastifyRequest): Promise<number[] | null> => {
  const { id, permissions } = request.user as { id: number; permissions: string[] };
  if (permissions.includes('*') || !permissions.includes('fleet:scoped')) return null;
  return FleetService.getUserOwnerIds(id);
};

const LABELS: Record<string, string> = {
  unit_id: 'Unidad',
  service_date: 'Fecha de servicio',
  service_type: 'Tipo de servicio',
  service_mode: 'Modalidad',
  movement_status: 'Estatus',
  odometer_at_service: 'Odómetro inicial',
  odometer_at_close: 'Odómetro al cierre',
  cost: 'Costo',
  technician: 'Técnico',
};

function renderPdf(movement: RowDataPacket, details: RowDataPacket[]): Promise<Buffer> {
  const doc = new PDFDocument({ margin: 40 });
  const chunks: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
  });

  doc.fontSize(16).text('ARCHON — Orden de Mantenimiento', { align: 'center' });
  doc.moveDown();
  Object.entries(LABELS).forEach(([key, label]) => {
    const value = movement[key];
    doc.fontSize(10).text(`${label}: ${value ?? '—'}`);
  });
  doc.moveDown();
  doc.fontSize(12).text('Tareas del servicio');
  if (details.length === 0) {
    doc.fontSize(10).text('Sin tareas registradas.');
  }
  details.forEach((task) => {
    doc.fontSize(10).text(`• ${task.label ?? task.taskCode}: ${task.statusLabel ?? task.status}`);
  });
  doc.moveDown();
  doc
    .fontSize(8)
    .text('Documento generado por Archon. Datos sensibles enmascarados conforme a política §8.1.');
  doc.end();
  return done;
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
      // FC 082 F2b2 — read-cutover (Cond.3 Bravo): LEFT JOIN + COALESCE fail-soft.
      const [movements] = await db.execute<RowDataPacket[]>(
        `SELECT fm.id, fm.uuid, fm.unit_id, fm.status AS movement_status,
                fme.service_date,
                fm.start_reading AS odometer_at_service,
                fm.end_reading AS odometer_at_close,
                COALESCE(cc_st.code, fme.service_type) AS service_type, fme.service_mode,
                fme.cost, fme.technician, fm.created_at
         FROM fleet_movements fm
         JOIN fleet_maintenance_extensions fme ON fme.movement_id = fm.id
         LEFT JOIN common_catalogs cc_st ON cc_st.id = fme.service_type_id
         WHERE fm.uuid = ? AND fm.movement_type = 'MAINTENANCE'`,
        [uuid]
      );
      if (movements.length === 0)
        return reply.code(404).send({ success: false, message: 'Order not found' });
      const movement = movements[0];

      const ownerScope = await resolveOwnerScope(request);
      if (ownerScope !== null) {
        if (ownerScope.length === 0)
          return reply.code(404).send({ success: false, message: 'Order not found' });
        const [owned] = await db.execute<RowDataPacket[]>(
          `SELECT id FROM fleet_units WHERE id = ? AND ownerId IN (${ownerScope
            .map(() => '?')
            .join(',')})`,
          [movement.unit_id, ...ownerScope]
        );
        if (owned.length === 0)
          return reply.code(404).send({ success: false, message: 'Order not found' });
      }

      const [details] = await db.execute<RowDataPacket[]>(
        `SELECT fmd.task_code AS taskCode, fmd.status_code AS status,
                mt.label, mts.label AS statusLabel
         FROM fleet_maintenance_details fmd
         JOIN maintenance_tasks mt ON fmd.task_code = mt.code
         JOIN maintenance_task_statuses mts ON fmd.status_code = mts.code
         WHERE fmd.maintenance_id = ?
         ORDER BY mt.is_critical DESC, fmd.task_code`,
        [movement.id]
      );

      const pdf = await renderPdf(movement, details);
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
