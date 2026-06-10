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

const SEVERITY_RANK: Record<AlertSeverity, number> = { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 };

function maxSeverity(a: AlertSeverity, b: AlertSeverity): AlertSeverity {
  return SEVERITY_RANK[a] >= SEVERITY_RANK[b] ? a : b;
}

function formatDateEsMx(value: unknown): string {
  if (value == null) return 'N/D';
  const d = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

function daysOverdueFrom(lastServiceDate: unknown, maintIntervalDays: unknown): number {
  const base =
    lastServiceDate instanceof Date ? lastServiceDate : new Date(String(lastServiceDate));
  const due = new Date(base);
  due.setDate(due.getDate() + Number(maintIntervalDays));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.floor((today.getTime() - due.getTime()) / 86_400_000);
}

export function computeOverdueSeverity(
  odometer: number,
  nextServiceForecast: number | null,
  lastServiceDate: unknown,
  maintIntervalDays: unknown
): AlertSeverity {
  let result: AlertSeverity = 'LOW';

  if (nextServiceForecast != null && nextServiceForecast > 0) {
    const ratio = odometer / nextServiceForecast;
    if (ratio >= 1.5) result = maxSeverity(result, 'CRITICAL');
    else if (ratio >= 1.1) result = maxSeverity(result, 'HIGH');
    else if (ratio >= 1.0) result = maxSeverity(result, 'MEDIUM');
  }

  if (lastServiceDate != null && maintIntervalDays != null) {
    const days = daysOverdueFrom(lastServiceDate, maintIntervalDays);
    if (days > 60) result = maxSeverity(result, 'CRITICAL');
    else if (days > 30) result = maxSeverity(result, 'HIGH');
    else if (days > 14) result = maxSeverity(result, 'MEDIUM');
  }

  return result;
}

export function buildOverdueDescription(
  odometer: number,
  nextServiceForecast: number | null,
  lastServiceDate: unknown,
  maintIntervalDays: unknown
): string {
  if (nextServiceForecast != null) {
    if (odometer >= nextServiceForecast) {
      return `Odómetro ${odometer} km supera el pronóstico de ${nextServiceForecast} km`;
    }
    const remaining = nextServiceForecast - odometer;
    return `Odómetro ${odometer} km · Pronóstico: ${nextServiceForecast} km (faltan ${remaining} km)`;
  }

  const dateStr = formatDateEsMx(lastServiceDate);
  if (lastServiceDate != null && maintIntervalDays != null) {
    const days = daysOverdueFrom(lastServiceDate, maintIntervalDays);
    if (days > 0) {
      return `Último Mantenimiento: ${dateStr} · ${days} días vencido`;
    }
    const base =
      lastServiceDate instanceof Date ? lastServiceDate : new Date(String(lastServiceDate));
    const due = new Date(base);
    due.setDate(due.getDate() + Number(maintIntervalDays));
    return `Próximo Mantenimiento: ${formatDateEsMx(due)} · en ${Math.abs(days)} días`;
  }

  return `Último Mantenimiento: ${dateStr} · Intervalo: ${String(maintIntervalDays ?? 'N/D')} días`;
}

export default async function alertsRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      reply.code(401).send({ success: false, code: 'UNAUTHORIZED', message: 'Session required' });
    }
  });

  // GET /v1/alerts/count
  fastify.get('/alerts/count', async (_request, reply) => {
    try {
      const [overdueRows] = await db.execute<RowDataPacket[]>(
        `SELECT COUNT(*) as overdueCount
         FROM fleet_units
         WHERE status != 'Descontinuada'
           AND (
             (nextServiceReading_forecast IS NOT NULL
              AND odometer >= nextServiceReading_forecast * 0.9)
             OR (lastServiceDate IS NOT NULL
                 AND maintIntervalDays IS NOT NULL
                 AND DATE_ADD(lastServiceDate, INTERVAL maintIntervalDays DAY)
                     <= DATE_ADD(CURDATE(), INTERVAL 14 DAY))
           )`
      );
      const [incidentRows] = await db.execute<RowDataPacket[]>(
        `SELECT COUNT(*) as incidentCount FROM route_incidents WHERE status = 'OPEN'`
      );
      const [criticalRows] = await db.execute<RowDataPacket[]>(
        `SELECT COUNT(*) as criticalCount
         FROM fleet_movements
         WHERE movement_type = 'MAINTENANCE'
           AND status = 'ACTIVE'
           AND TIMESTAMPDIFF(HOUR, start_at, NOW()) > 48`
      );

      const total =
        Number(overdueRows[0].overdueCount) +
        Number(incidentRows[0].incidentCount) +
        Number(criticalRows[0].criticalCount);

      return reply.send({ success: true, count: total });
    } catch (error) {
      fastify.log.error({ err: (error as Error).message }, 'Alerts count fetch error');
      return reply
        .code(500)
        .send({
          success: false,
          code: 'INTERNAL_ERROR',
          message: 'Error al obtener conteo de alertas',
        });
    }
  });

  // GET /v1/alerts
  fastify.get('/alerts', async (_request, reply) => {
    try {
      const alerts: Alert[] = [];

      // 1. Maintenance — vencidas y por vencer (90% forecast km, o ≤14 días del vencimiento)
      const [overdueRows] = await db.execute<RowDataPacket[]>(
        `SELECT id, status, odometer, nextServiceReading_forecast,
                lastServiceDate, maintIntervalDays
         FROM fleet_units
         WHERE status != 'Descontinuada'
           AND (
             (nextServiceReading_forecast IS NOT NULL
              AND odometer >= nextServiceReading_forecast * 0.9)
             OR (lastServiceDate IS NOT NULL
                 AND maintIntervalDays IS NOT NULL
                 AND DATE_ADD(lastServiceDate, INTERVAL maintIntervalDays DAY)
                     <= DATE_ADD(CURDATE(), INTERVAL 14 DAY))
           )
         LIMIT 50`
      );

      overdueRows.forEach((row) => {
        const severity = computeOverdueSeverity(
          row.odometer,
          row.nextServiceReading_forecast,
          row.lastServiceDate,
          row.maintIntervalDays
        );
        alerts.push({
          id: `MAINT_OVERDUE_${row.id}`,
          type: 'MAINTENANCE_OVERDUE',
          severity,
          title:
            severity === 'LOW'
              ? `Mantenimiento próximo — ${row.id}`
              : `Mantenimiento vencido — ${row.id}`,
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
        `SELECT i.id, i.category, i.description, i.reported_at,
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
          severity: 'CRITICAL',
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
