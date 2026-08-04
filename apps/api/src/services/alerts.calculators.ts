/**
 * FC 094 F3 — pure severity/description calculators for the alerts domain,
 * split out of `alerts.service.ts` to stay under the 400-LOC Gate 1 budget
 * (Cond.14). Zero SQL, zero Fastify — moved verbatim from the pre-migration
 * `routes/alerts.ts` (behavior preserved exactly, only the module changed).
 */
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
export const ALERT_TYPE_PERMISSION: Record<AlertType, string> = {
  MAINTENANCE_OVERDUE: 'maint:view',
  INCIDENT_OPEN: 'route:view',
  UNIT_CRITICAL: 'fleet:view',
  COMPLIANCE_EXPIRY: 'fleet:view',
  LEASE_PAYMENT_MISSING: 'financial:view',
  FINE_REGISTERED: 'financial:view',
  EXPENSE_ANOMALY: 'financial:view',
};

/** Fase 4 — ventana de monitoreo de vencimientos legales (días) */
export const COMPLIANCE_WINDOW_DAYS = 30;

/** Severity for a compliance document by days remaining before it expires. */
export function computeComplianceSeverity(daysLeft: number): AlertSeverity {
  if (daysLeft < 0) return 'CRITICAL';
  if (daysLeft <= 3) return 'HIGH';
  if (daysLeft <= 15) return 'MEDIUM';
  return 'LOW';
}

type ExpiredParticiple = 'vencido' | 'vencida';

/** es-MX description for a COMPLIANCE_EXPIRY alert (expired / due today / due in N days). */
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
const ANOMALY_RATIO_HIGH = 2;
const ANOMALY_RATIO_CRITICAL = 3;

/** Severity for a missing lease payment by how far into the month it is. */
export function computeLeaseMissingSeverity(dayOfMonth: number): AlertSeverity {
  if (dayOfMonth <= LEASE_GRACE_DAY_LOW) return 'LOW';
  if (dayOfMonth <= LEASE_GRACE_DAY_MEDIUM) return 'MEDIUM';
  return 'HIGH';
}

/** Severity for an EXPENSE_ANOMALY alert by current-vs-average ratio. */
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

/** es-MX description for a LEASE_PAYMENT_MISSING alert. */
export function buildLeaseMissingDescription(amount: number, dayOfMonth: number): string {
  return `Renta de ${formatMoneyMx(amount)} sin registrar este mes (van ${dayOfMonth} días)`;
}

/** es-MX description for a FINE_REGISTERED alert. */
export function buildFineDescription(amount: number, vendor: string | null): string {
  return `Multa registrada: ${formatMoneyMx(amount)} — ${vendor || 'sin proveedor'}`;
}

/** es-MX description for an EXPENSE_ANOMALY alert. */
export function buildAnomalyDescription(current: number, avg: number, ratio: number): string {
  return `Gasto del mes ${formatMoneyMx(current)} — ${ratio.toFixed(
    1
  )}× su promedio semestral (${formatMoneyMx(avg)})`;
}

/** `true` when a unit's odometer is within 90% of its next-service threshold. */
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
export const COMPLIANCE_DOCUMENTS: Array<{
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

/** Which `AlertType`s a caller's permissions grant visibility into. */
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

/** Severity for MAINTENANCE_OVERDUE, worst-of forecast-km ratio and days-overdue. */
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

/** es-MX description for a MAINTENANCE_OVERDUE alert. */
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
