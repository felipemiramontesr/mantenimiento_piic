import { FastifyInstance } from 'fastify';
import { RowDataPacket } from 'mysql2';
import db from '../services/db';

export type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type AlertType = 'MAINTENANCE_OVERDUE' | 'INCIDENT_OPEN' | 'UNIT_CRITICAL';

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  description: string;
  unitId: string;
  createdAt: string;
}

export function buildOverdueDescription(
  odometer: number,
  nextServiceForecast: number | null,
  lastServiceDate: unknown,
  maintIntervalDays: unknown
): string {
  if (nextServiceForecast != null && odometer >= nextServiceForecast) {
    return `Odómetro ${odometer} km supera el pronóstico de ${nextServiceForecast} km`;
  }
  return `Última revisión: ${String(lastServiceDate ?? 'N/D')} · Intervalo: ${String(
    maintIntervalDays ?? 'N/D'
  )} días`;
}

export default async function alertsRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      reply.code(401).send({ success: false, code: 'UNAUTHORIZED', message: 'Session required' });
    }
  });

  // GET /v1/alerts
  fastify.get('/alerts', async (_request, reply) => {
    try {
      const alerts: Alert[] = [];

      // 1. Maintenance overdue
      const [overdueRows] = await db.execute<RowDataPacket[]>(
        `SELECT id, status, odometer, nextServiceReading_forecast,
                lastServiceDate, maintIntervalDays
         FROM fleet_units
         WHERE status != 'Descontinuada'
           AND (
             odometer >= nextServiceReading_forecast
             OR (lastServiceDate IS NOT NULL
                 AND DATE_ADD(lastServiceDate, INTERVAL maintIntervalDays DAY) < CURDATE())
           )
         LIMIT 50`
      );

      overdueRows.forEach((row) => {
        alerts.push({
          id: `MAINT_OVERDUE_${row.id}`,
          type: 'MAINTENANCE_OVERDUE',
          severity: 'HIGH',
          title: `Mantenimiento vencido — ${row.id}`,
          description: buildOverdueDescription(
            row.odometer,
            row.nextServiceReading_forecast,
            row.lastServiceDate,
            row.maintIntervalDays
          ),
          unitId: String(row.id),
          createdAt: new Date().toISOString(),
        });
      });

      // 2. Open incidents
      const [incidentRows] = await db.execute<RowDataPacket[]>(
        `SELECT i.id, i.category, i.description, i.severity, i.reported_at,
                fm.unit_id
         FROM route_incidents i
         JOIN fleet_movements fm ON i.route_uuid = fm.uuid COLLATE utf8mb4_unicode_ci
         WHERE i.status = 'OPEN'
         ORDER BY i.reported_at DESC
         LIMIT 50`
      );

      incidentRows.forEach((row) => {
        alerts.push({
          id: `INCIDENT_${row.id}`,
          type: 'INCIDENT_OPEN',
          severity: (row.severity as AlertSeverity) ?? 'MEDIUM',
          title: `Incidente abierto — ${row.category} · ${row.unit_id}`,
          description: String(row.description).substring(0, 120),
          unitId: String(row.unit_id),
          createdAt:
            row.reported_at instanceof Date
              ? row.reported_at.toISOString()
              : String(row.reported_at),
        });
      });

      // 3. Units with maintenance active > 48 h
      const [criticalRows] = await db.execute<RowDataPacket[]>(
        `SELECT fm.uuid, fm.unit_id, fm.start_at,
                TIMESTAMPDIFF(HOUR, fm.start_at, NOW()) AS hours_active
         FROM fleet_movements fm
         WHERE fm.movement_type = 'MAINTENANCE'
           AND fm.status = 'ACTIVE'
           AND TIMESTAMPDIFF(HOUR, fm.start_at, NOW()) > 48
         LIMIT 20`
      );

      criticalRows.forEach((row) => {
        alerts.push({
          id: `UNIT_CRITICAL_${row.unit_id}`,
          type: 'UNIT_CRITICAL',
          severity: 'CRITICAL',
          title: `Unidad bloqueada — ${row.unit_id}`,
          description: `En mantenimiento activo hace ${row.hours_active}h sin cerrar`,
          unitId: String(row.unit_id),
          createdAt:
            row.start_at instanceof Date ? row.start_at.toISOString() : String(row.start_at),
        });
      });

      // Sort: CRITICAL → HIGH → MEDIUM → LOW, then by createdAt desc
      const severityOrder: Record<AlertSeverity, number> = {
        CRITICAL: 0,
        HIGH: 1,
        MEDIUM: 2,
        LOW: 3,
      };
      alerts.sort((a, b) => {
        const diff = severityOrder[a.severity] - severityOrder[b.severity];
        if (diff !== 0) return diff;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      return reply.send({ success: true, count: alerts.length, data: alerts });
    } catch (error) {
      fastify.log.error({ err: (error as Error).message }, 'Alerts fetch error');
      return reply
        .code(500)
        .send({ success: false, code: 'INTERNAL_ERROR', message: 'Error al obtener alertas' });
    }
  });
}
