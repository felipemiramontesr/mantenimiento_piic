import { FastifyInstance } from 'fastify';
import { RowDataPacket } from 'mysql2';
import db from '../services/db';
import FleetService from '../services/fleetService';
import { resolveCatalogId } from '../services/catalogMapper';

export type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type AlertType =
  | 'MAINTENANCE_OVERDUE'
  | 'INCIDENT_OPEN'
  | 'UNIT_CRITICAL'
  | 'COMPLIANCE_EXPIRY'
  | 'LEASE_PAYMENT_MISSING'
  | 'FINE_REGISTERED'
  | 'EXPENSE_ANOMALY';

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

/** Feature Contract Alerts_Role_Scoped_Panel — cada tipo exige el slug de su módulo de origen */
const ALERT_TYPE_PERMISSION: Record<AlertType, string> = {
  MAINTENANCE_OVERDUE: 'maint:view',
  INCIDENT_OPEN: 'route:view',
  UNIT_CRITICAL: 'fleet:view',
  COMPLIANCE_EXPIRY: 'fleet:view',
  LEASE_PAYMENT_MISSING: 'financial:view',
  FINE_REGISTERED: 'financial:view',
  EXPENSE_ANOMALY: 'financial:view',
};

/** Fase 4 — ventana de monitoreo de vencimientos legales (días) */
const COMPLIANCE_WINDOW_DAYS = 30;

export function computeComplianceSeverity(daysLeft: number): AlertSeverity {
  if (daysLeft < 0) return 'CRITICAL';
  if (daysLeft <= 3) return 'HIGH';
  if (daysLeft <= 15) return 'MEDIUM';
  return 'LOW';
}

type ExpiredParticiple = 'vencido' | 'vencida';

export function buildComplianceDescription(
  docLabel: string,
  daysLeft: number,
  participle: ExpiredParticiple = 'vencido'
): string {
  if (daysLeft < 0) return `${docLabel} ${participle} hace ${Math.abs(daysLeft)} días`;
  if (daysLeft === 0) return `${docLabel} vence hoy`;
  return `${docLabel} vence en ${daysLeft} días`;
}

/**
 * Contrato Alerts_Finance_Domain — umbrales de negocio aprobados por GrayMan (2026-06-11).
 * Los cortes de renta (10/20) son provisionales: se ajustarán cuando el PO defina el ciclo real de pagos.
 */
const LEASE_GRACE_DAY_LOW = 10;
const LEASE_GRACE_DAY_MEDIUM = 20;
const FINE_WINDOW_DAYS = 7;
const ANOMALY_WINDOW_MONTHS = 6;
const ANOMALY_MIN_HISTORY_PERIODS = 3;
const ANOMALY_RATIO_MEDIUM = 1.5;
const ANOMALY_RATIO_HIGH = 2;
const ANOMALY_RATIO_CRITICAL = 3;

export function computeLeaseMissingSeverity(dayOfMonth: number): AlertSeverity {
  if (dayOfMonth <= LEASE_GRACE_DAY_LOW) return 'LOW';
  if (dayOfMonth <= LEASE_GRACE_DAY_MEDIUM) return 'MEDIUM';
  return 'HIGH';
}

export function computeAnomalySeverity(ratio: number): AlertSeverity {
  if (ratio >= ANOMALY_RATIO_CRITICAL) return 'CRITICAL';
  if (ratio >= ANOMALY_RATIO_HIGH) return 'HIGH';
  return 'MEDIUM';
}

function formatMoneyMx(amount: number): string {
  return `$${amount.toLocaleString('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function buildLeaseMissingDescription(amount: number, dayOfMonth: number): string {
  return `Renta de ${formatMoneyMx(amount)} sin registrar este mes (van ${dayOfMonth} días)`;
}

export function buildFineDescription(amount: number, vendor: string | null): string {
  return `Multa registrada: ${formatMoneyMx(amount)} — ${vendor || 'sin proveedor'}`;
}

export function buildAnomalyDescription(current: number, avg: number, ratio: number): string {
  return `Gasto del mes ${formatMoneyMx(current)} — ${ratio.toFixed(
    1
  )}× su promedio semestral (${formatMoneyMx(avg)})`;
}

export function meetsMaintenanceKmCriteria(unit: {
  odometer: number;
  nextServiceForecast: number | null;
  lastServiceReading: number | null;
  maintIntervalKm: number | null;
}): boolean {
  const { odometer, nextServiceForecast, lastServiceReading, maintIntervalKm } = unit;
  const hasForecast = nextServiceForecast !== null;
  const hasIntervalData = lastServiceReading !== null && maintIntervalKm !== null;
  if (!hasForecast && !hasIntervalData) return false;
  const threshold = hasForecast ? nextServiceForecast! : lastServiceReading! + maintIntervalKm!;
  return odometer >= threshold * 0.9;
}

/** Documentos de cumplimiento monitoreados — campo días calculado en SQL → etiqueta es-MX con género */
const COMPLIANCE_DOCUMENTS: Array<{
  daysField: string;
  idTag: string;
  label: string;
  participle: ExpiredParticiple;
}> = [
  { daysField: 'insuranceDays', idTag: 'INSURANCE', label: 'Seguro', participle: 'vencido' },
  {
    daysField: 'verificationDays',
    idTag: 'VERIFICATION',
    label: 'Verificación',
    participle: 'vencida',
  },
  { daysField: 'legalDays', idTag: 'LEGAL', label: 'Cumplimiento legal', participle: 'vencido' },
];

const ALL_ALERT_TYPES = Object.keys(ALERT_TYPE_PERMISSION) as AlertType[];

export function resolveAlertScope(permissions: string[]): Set<AlertType> {
  if (permissions.includes('*')) {
    return new Set<AlertType>(ALL_ALERT_TYPES);
  }
  // Owner-Scoped Fleet Access (F1-A): fleet:scoped carriers only see units of
  // their linked owners — fleet-wide alert types (fleet:view) are suppressed
  // for them; alert types from other domains remain governed by their slug.
  const isOwnerScoped = permissions.includes('fleet:scoped');
  const scope = new Set<AlertType>();
  ALL_ALERT_TYPES.forEach((type) => {
    const requiredSlug = ALERT_TYPE_PERMISSION[type];
    if (isOwnerScoped && requiredSlug === 'fleet:view') return;
    if (permissions.includes(requiredSlug)) scope.add(type);
  });
  return scope;
}

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
  fastify.get('/alerts/count', async (request, reply) => {
    try {
      const { id: userId, permissions } = request.user as { id: number; permissions: string[] };
      const scope = resolveAlertScope(permissions);

      let total = 0;

      if (scope.has('MAINTENANCE_OVERDUE')) {
        const isOwnerScoped = permissions.includes('fleet:scoped');
        const ownerIds = isOwnerScoped ? await FleetService.getUserOwnerIds(userId) : null;
        if (ownerIds === null || ownerIds.length > 0) {
          const ownerFilter =
            ownerIds !== null ? ` AND ownerId IN (${ownerIds.map(() => '?').join(',')})` : '';
          const [overdueRows] = await db.execute<RowDataPacket[]>(
            `SELECT COUNT(*) as overdueCount
             FROM fleet_units
             WHERE status != 'Descontinuada'
               AND (
                 ((nextServiceReading_forecast IS NOT NULL
                   OR (lastServiceReading IS NOT NULL AND maintIntervalKm IS NOT NULL))
                  AND odometer >= COALESCE(nextServiceReading_forecast, lastServiceReading + maintIntervalKm) * 0.9)
                 OR (lastServiceDate IS NOT NULL
                     AND maintIntervalDays IS NOT NULL
                     AND DATE_ADD(lastServiceDate, INTERVAL maintIntervalDays DAY)
                         <= DATE_ADD(CURDATE(), INTERVAL 14 DAY))
               )${ownerFilter}`,
            ownerIds ?? []
          );
          total += Number(overdueRows[0].overdueCount);
        }
      }

      if (scope.has('INCIDENT_OPEN')) {
        const [incidentRows] = await db.execute<RowDataPacket[]>(
          `SELECT COUNT(*) as incidentCount FROM route_incidents WHERE status = 'OPEN'`
        );
        total += Number(incidentRows[0].incidentCount);
      }

      if (scope.has('UNIT_CRITICAL')) {
        const [criticalRows] = await db.execute<RowDataPacket[]>(
          `SELECT COUNT(*) as criticalCount
           FROM fleet_movements
           WHERE movement_type = 'MAINTENANCE'
             AND status = 'ACTIVE'
             AND TIMESTAMPDIFF(HOUR, start_at, NOW()) > 48`
        );
        total += Number(criticalRows[0].criticalCount);
      }

      if (scope.has('COMPLIANCE_EXPIRY')) {
        const [complianceRows] = await db.execute<RowDataPacket[]>(
          `SELECT
             SUM(CASE WHEN insuranceExpiryDate IS NOT NULL
                       AND DATEDIFF(insuranceExpiryDate, CURDATE()) <= ${COMPLIANCE_WINDOW_DAYS}
                  THEN 1 ELSE 0 END)
           + SUM(CASE WHEN vencimientoVerificacion IS NOT NULL
                       AND DATEDIFF(vencimientoVerificacion, CURDATE()) <= ${COMPLIANCE_WINDOW_DAYS}
                  THEN 1 ELSE 0 END)
           + SUM(CASE WHEN legalComplianceDate IS NOT NULL
                       AND DATEDIFF(legalComplianceDate, CURDATE()) <= ${COMPLIANCE_WINDOW_DAYS}
                  THEN 1 ELSE 0 END) AS complianceCount
           FROM fleet_units
           WHERE status != 'Descontinuada'`
        );
        total += Number(complianceRows[0].complianceCount);
      }

      if (scope.has('LEASE_PAYMENT_MISSING')) {
        // FC 082 F2b2 — read-cutover (Cond.2 Bravo): resolver category_id UNA
        // VEZ por request, comparar por id (no por string ni subquery por fila).
        const leaseCategoryId = await resolveCatalogId('FINANCE_CATEGORY', 'LEASE');
        const [leaseRows] = await db.execute<RowDataPacket[]>(
          `SELECT COUNT(*) AS leaseMissingCount
           FROM fleet_units u
           WHERE u.status != 'Descontinuada'
             AND u.monthlyLeasePayment IS NOT NULL AND u.monthlyLeasePayment > 0
             AND NOT EXISTS (
               SELECT 1 FROM financial_transactions ft
               WHERE ft.unit_id = u.id AND ft.category_id = ?
                 AND ft.period = DATE_FORMAT(CURDATE(), '%Y-%m')
             )`,
          [leaseCategoryId]
        );
        total += Number(leaseRows[0].leaseMissingCount);
      }

      if (scope.has('FINE_REGISTERED')) {
        const fineCategoryId = await resolveCatalogId('FINANCE_CATEGORY', 'FINE');
        const [fineRows] = await db.execute<RowDataPacket[]>(
          `SELECT COUNT(*) AS fineCount
           FROM financial_transactions
           WHERE category_id = ?
             AND created_at >= DATE_SUB(NOW(), INTERVAL ${FINE_WINDOW_DAYS} DAY)`,
          [fineCategoryId]
        );
        total += Number(fineRows[0].fineCount);
      }

      if (scope.has('EXPENSE_ANOMALY')) {
        const [anomalyRows] = await db.execute<RowDataPacket[]>(
          `SELECT COUNT(*) AS anomalyCount FROM (
             SELECT unit_id
             FROM financial_transactions
             WHERE period >= DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL ${ANOMALY_WINDOW_MONTHS} MONTH), '%Y-%m')
             GROUP BY unit_id
             HAVING COUNT(DISTINCT CASE WHEN period <> DATE_FORMAT(CURDATE(), '%Y-%m') THEN period END) >= ${ANOMALY_MIN_HISTORY_PERIODS}
                AND SUM(CASE WHEN period <> DATE_FORMAT(CURDATE(), '%Y-%m') THEN amount ELSE 0 END) > 0
                AND SUM(CASE WHEN period = DATE_FORMAT(CURDATE(), '%Y-%m') THEN amount ELSE 0 END) >=
                    (SUM(CASE WHEN period <> DATE_FORMAT(CURDATE(), '%Y-%m') THEN amount ELSE 0 END)
                     / COUNT(DISTINCT CASE WHEN period <> DATE_FORMAT(CURDATE(), '%Y-%m') THEN period END)) * ${ANOMALY_RATIO_MEDIUM}
           ) anomalies`
        );
        total += Number(anomalyRows[0].anomalyCount);
      }

      return reply.send({ success: true, count: total });
    } catch (error) {
      fastify.log.error({ err: (error as Error).message }, 'Alerts count fetch error');
      return reply.code(500).send({
        success: false,
        code: 'INTERNAL_ERROR',
        message: 'Error al obtener conteo de alertas',
      });
    }
  });

  // GET /v1/alerts
  fastify.get('/alerts', async (request, reply) => {
    try {
      const { id: userId, permissions } = request.user as { id: number; permissions: string[] };
      const scope = resolveAlertScope(permissions);
      const alerts: Alert[] = [];

      // 1. Maintenance — vencidas y por vencer (90% forecast km, o ≤14 días del vencimiento)
      if (scope.has('MAINTENANCE_OVERDUE')) {
        const isOwnerScoped = permissions.includes('fleet:scoped');
        const ownerIds = isOwnerScoped ? await FleetService.getUserOwnerIds(userId) : null;
        const overdueRows: RowDataPacket[] =
          ownerIds !== null && ownerIds.length === 0
            ? []
            : await db
                .execute<RowDataPacket[]>(
                  `SELECT id, status, odometer,
                          COALESCE(nextServiceReading_forecast, lastServiceReading + maintIntervalKm) AS nextServiceReading_forecast,
                          lastServiceDate, maintIntervalDays
                   FROM fleet_units
                   WHERE status != 'Descontinuada'
                     AND (
                       ((nextServiceReading_forecast IS NOT NULL
                         OR (lastServiceReading IS NOT NULL AND maintIntervalKm IS NOT NULL))
                        AND odometer >= COALESCE(nextServiceReading_forecast, lastServiceReading + maintIntervalKm) * 0.9)
                       OR (lastServiceDate IS NOT NULL
                           AND maintIntervalDays IS NOT NULL
                           AND DATE_ADD(lastServiceDate, INTERVAL maintIntervalDays DAY)
                               <= DATE_ADD(CURDATE(), INTERVAL 14 DAY))
                     )${
                       ownerIds !== null
                         ? ` AND ownerId IN (${ownerIds.map(() => '?').join(',')})`
                         : ''
                     }
                   LIMIT 50`,
                  ownerIds ?? []
                )
                .then(([rows]) => rows);

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
      }

      // 2. Open incidents
      if (scope.has('INCIDENT_OPEN')) {
        const [incidentRows] = await db.execute<RowDataPacket[]>(
          `SELECT i.id, cc.code AS category, i.description, i.reported_at,
                  fm.unit_id
           FROM route_incidents i
           JOIN fleet_movements fm ON i.route_uuid = fm.uuid COLLATE utf8mb4_unicode_ci
           LEFT JOIN common_catalogs cc ON cc.id = i.category_id
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
      }

      // 3. Units with maintenance active > 48 h
      if (scope.has('UNIT_CRITICAL')) {
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
      }

      // 4. Compliance — vencimientos legales (seguro, verificación, cumplimiento legal)
      if (scope.has('COMPLIANCE_EXPIRY')) {
        const [complianceRows] = await db.execute<RowDataPacket[]>(
          `SELECT id,
                  DATEDIFF(insuranceExpiryDate, CURDATE()) AS insuranceDays,
                  DATEDIFF(vencimientoVerificacion, CURDATE()) AS verificationDays,
                  DATEDIFF(legalComplianceDate, CURDATE()) AS legalDays
           FROM fleet_units
           WHERE status != 'Descontinuada'
             AND (
               (insuranceExpiryDate IS NOT NULL
                AND DATEDIFF(insuranceExpiryDate, CURDATE()) <= ${COMPLIANCE_WINDOW_DAYS})
               OR (vencimientoVerificacion IS NOT NULL
                   AND DATEDIFF(vencimientoVerificacion, CURDATE()) <= ${COMPLIANCE_WINDOW_DAYS})
               OR (legalComplianceDate IS NOT NULL
                   AND DATEDIFF(legalComplianceDate, CURDATE()) <= ${COMPLIANCE_WINDOW_DAYS})
             )
           LIMIT 50`
        );

        complianceRows.forEach((row) => {
          COMPLIANCE_DOCUMENTS.forEach(({ daysField, idTag, label, participle }) => {
            const daysLeft = row[daysField] as number | null;
            if (daysLeft == null || daysLeft > COMPLIANCE_WINDOW_DAYS) return;
            const severity = computeComplianceSeverity(daysLeft);
            alerts.push({
              id: `COMPLIANCE_${idTag}_${row.id}`,
              type: 'COMPLIANCE_EXPIRY',
              severity,
              title:
                daysLeft < 0
                  ? `Documento vencido — ${row.id}`
                  : `Cumplimiento por vencer — ${row.id}`,
              description: buildComplianceDescription(label, daysLeft, participle),
              unitId: String(row.id),
              createdAt: new Date().toISOString(),
            });
          });
        });
      }

      // 5. Finanzas — renta del mes sin registrar (Contrato Alerts_Finance_Domain)
      if (scope.has('LEASE_PAYMENT_MISSING')) {
        // FC 082 F2b2 — read-cutover (Cond.2 Bravo): category_id resuelto una
        // vez, comparación por id.
        const leaseCategoryId = await resolveCatalogId('FINANCE_CATEGORY', 'LEASE');
        const [leaseRows] = await db.execute<RowDataPacket[]>(
          `SELECT u.id, u.monthlyLeasePayment, DAY(CURDATE()) AS dayOfMonth
           FROM fleet_units u
           WHERE u.status != 'Descontinuada'
             AND u.monthlyLeasePayment IS NOT NULL AND u.monthlyLeasePayment > 0
             AND NOT EXISTS (
               SELECT 1 FROM financial_transactions ft
               WHERE ft.unit_id = u.id AND ft.category_id = ?
                 AND ft.period = DATE_FORMAT(CURDATE(), '%Y-%m')
             )
           LIMIT 50`,
          [leaseCategoryId]
        );

        leaseRows.forEach((row) => {
          const dayOfMonth = Number(row.dayOfMonth);
          alerts.push({
            id: `LEASE_MISSING_${row.id}`,
            type: 'LEASE_PAYMENT_MISSING',
            severity: computeLeaseMissingSeverity(dayOfMonth),
            title: `Renta sin registrar — ${row.id}`,
            description: buildLeaseMissingDescription(Number(row.monthlyLeasePayment), dayOfMonth),
            unitId: String(row.id),
            createdAt: new Date().toISOString(),
          });
        });
      }

      // 6. Finanzas — multas registradas recientemente
      if (scope.has('FINE_REGISTERED')) {
        const fineCategoryId = await resolveCatalogId('FINANCE_CATEGORY', 'FINE');
        const [fineRows] = await db.execute<RowDataPacket[]>(
          `SELECT id, unit_id, amount, vendor, created_at
           FROM financial_transactions
           WHERE category_id = ?
             AND created_at >= DATE_SUB(NOW(), INTERVAL ${FINE_WINDOW_DAYS} DAY)
           ORDER BY created_at DESC
           LIMIT 50`,
          [fineCategoryId]
        );

        fineRows.forEach((row) => {
          alerts.push({
            id: `FINE_${row.id}`,
            type: 'FINE_REGISTERED',
            severity: 'HIGH',
            title: `Multa registrada — ${row.unit_id}`,
            description: buildFineDescription(Number(row.amount), row.vendor as string | null),
            unitId: String(row.unit_id),
            createdAt:
              row.created_at instanceof Date
                ? row.created_at.toISOString()
                : String(row.created_at),
          });
        });
      }

      // 7. Finanzas — gasto del mes anómalo vs promedio semestral
      if (scope.has('EXPENSE_ANOMALY')) {
        const [anomalyRows] = await db.execute<RowDataPacket[]>(
          `SELECT unit_id,
                  SUM(CASE WHEN period = DATE_FORMAT(CURDATE(), '%Y-%m') THEN amount ELSE 0 END) AS currentTotal,
                  SUM(CASE WHEN period <> DATE_FORMAT(CURDATE(), '%Y-%m') THEN amount ELSE 0 END) AS prevTotal,
                  COUNT(DISTINCT CASE WHEN period <> DATE_FORMAT(CURDATE(), '%Y-%m') THEN period END) AS prevPeriods
           FROM financial_transactions
           WHERE period >= DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL ${ANOMALY_WINDOW_MONTHS} MONTH), '%Y-%m')
           GROUP BY unit_id
           HAVING prevPeriods >= ${ANOMALY_MIN_HISTORY_PERIODS}
              AND prevTotal > 0
              AND currentTotal >= (prevTotal / prevPeriods) * ${ANOMALY_RATIO_MEDIUM}
           LIMIT 50`
        );

        anomalyRows.forEach((row) => {
          const prevPeriods = Number(row.prevPeriods);
          const prevTotal = Number(row.prevTotal);
          // Guard defensivo espejo del HAVING — testeable sin SQL real
          if (prevPeriods < ANOMALY_MIN_HISTORY_PERIODS || prevTotal <= 0) return;
          const currentTotal = Number(row.currentTotal);
          const avg = prevTotal / prevPeriods;
          const ratio = currentTotal / avg;
          if (ratio < ANOMALY_RATIO_MEDIUM) return;
          alerts.push({
            id: `EXPENSE_ANOMALY_${row.unit_id}`,
            type: 'EXPENSE_ANOMALY',
            severity: computeAnomalySeverity(ratio),
            title: `Gasto anómalo — ${row.unit_id}`,
            description: buildAnomalyDescription(currentTotal, avg, ratio),
            unitId: String(row.unit_id),
            createdAt: new Date().toISOString(),
          });
        });
      }

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
