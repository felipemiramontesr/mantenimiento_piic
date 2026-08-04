import {
  buildAnomalyDescription,
  buildComplianceDescription,
  buildFineDescription,
  buildLeaseMissingDescription,
  buildOverdueDescription,
  COMPLIANCE_DOCUMENTS,
  computeAnomalySeverity,
  computeComplianceSeverity,
  computeLeaseMissingSeverity,
  computeOverdueSeverity,
  resolveAlertScope,
  type Alert,
  type AlertSeverity,
  type AlertType,
} from './alerts.calculators';
import * as AlertsRepository from './alerts.repository';
import type { TenantScope } from './alerts.repository';
import { resolveCatalogId } from './catalogMapper';
import FleetService from './fleetService';

/**
 * FC 094 F3 — AlertsService: orchestration only, zero SQL, zero Fastify
 * (invariants I1/I2). Resolves the caller's tenant scope per Cond.R-F3-T1..T8
 * and delegates all queries to `alerts.repository.ts`. Each alert type has
 * its own small `countX`/`buildXAlerts` helper — keeps `getAlertsCount`/
 * `getAlerts` themselves at a flat, low-complexity fan-out (Cond.14 budget).
 */
export interface UserAlertContext {
  userId: number;
  permissions: string[];
  tenantId: number | null;
}

export const DENY = 'DENY' as const;
export type ScopeOrDeny = TenantScope | typeof DENY;

/** T2: `tenantId` is only ever `null` for Ω — any other actor without a
 * resolvable tenant is denied outright, never queried as "global".
 * Exported for direct unit testing (Regla 19 · R-BDD-GHERKIN, Cond.R-F3-T7). */
export function resolveTenantScope(ctx: UserAlertContext): ScopeOrDeny {
  if (ctx.permissions.includes('*')) return { tenantId: null };
  if (ctx.tenantId === null) return DENY;
  return { tenantId: ctx.tenantId };
}

/** T5: preserves the pre-existing multi-owner mechanism for `fleet:scoped`
 * carriers exactly (empty ownerIds ⇒ deny, no query — same as before this FC). */
export async function resolveMaintenanceScope(ctx: UserAlertContext): Promise<ScopeOrDeny> {
  if (ctx.permissions.includes('*')) return { tenantId: null };
  if (ctx.permissions.includes('fleet:scoped')) {
    const ownerIds = await FleetService.getUserOwnerIds(ctx.userId);
    if (ownerIds.length === 0) return DENY;
    return { tenantId: ctx.tenantId, ownerIds };
  }
  return resolveTenantScope(ctx);
}

function sortAlerts(alerts: Alert[]): Alert[] {
  const severityOrder: Record<AlertSeverity, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  return [...alerts].sort((a, b) => {
    const diff = severityOrder[a.severity] - severityOrder[b.severity];
    if (diff !== 0) return diff;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

// ─── Counts (one small helper per AlertType — each owns its own DENY check) ─

async function countMaintenanceOverdue(ctx: UserAlertContext): Promise<number> {
  const s = await resolveMaintenanceScope(ctx);
  return s === DENY ? 0 : AlertsRepository.countOverdueMaintenance(s);
}

async function countIncidents(ctx: UserAlertContext): Promise<number> {
  const s = resolveTenantScope(ctx);
  return s === DENY ? 0 : AlertsRepository.countOpenIncidents(s);
}

async function countCritical(ctx: UserAlertContext): Promise<number> {
  const s = resolveTenantScope(ctx);
  return s === DENY ? 0 : AlertsRepository.countCriticalUnits(s);
}

async function countCompliance(ctx: UserAlertContext): Promise<number> {
  const s = resolveTenantScope(ctx);
  return s === DENY ? 0 : AlertsRepository.countComplianceExpiry(s);
}

async function countLease(ctx: UserAlertContext): Promise<number> {
  const s = resolveTenantScope(ctx);
  if (s === DENY) return 0;
  const leaseCategoryId = await resolveCatalogId('FINANCE_CATEGORY', 'LEASE');
  return AlertsRepository.countLeaseMissing(s, leaseCategoryId);
}

async function countFines(ctx: UserAlertContext): Promise<number> {
  const s = resolveTenantScope(ctx);
  if (s === DENY) return 0;
  const fineCategoryId = await resolveCatalogId('FINANCE_CATEGORY', 'FINE');
  return AlertsRepository.countFinesRegistered(s, fineCategoryId);
}

async function countAnomalies(ctx: UserAlertContext): Promise<number> {
  const s = resolveTenantScope(ctx);
  return s === DENY ? 0 : AlertsRepository.countExpenseAnomalies(s);
}

const COUNTERS: Record<AlertType, (ctx: UserAlertContext) => Promise<number>> = {
  MAINTENANCE_OVERDUE: countMaintenanceOverdue,
  INCIDENT_OPEN: countIncidents,
  UNIT_CRITICAL: countCritical,
  COMPLIANCE_EXPIRY: countCompliance,
  LEASE_PAYMENT_MISSING: countLease,
  FINE_REGISTERED: countFines,
  EXPENSE_ANOMALY: countAnomalies,
};

/** Total alert count across every `AlertType` the caller's permissions/tenant scope grant. */
export async function getAlertsCount(ctx: UserAlertContext): Promise<number> {
  const scope = resolveAlertScope(ctx.permissions);
  const applicable = (Object.keys(COUNTERS) as AlertType[]).filter((type) => scope.has(type));
  // Secuencial a propósito (no Promise.all): los mocks de `db.execute` en los
  // tests son una cola FIFO posicional — correr en paralelo reordena las
  // llamadas reales y rompe esa suposición sin aportar nada (7 queries cortas).
  let total = 0;
  await applicable.reduce(async (prev, type) => {
    await prev;
    total += await COUNTERS[type](ctx);
  }, Promise.resolve());
  return total;
}

// ─── Lists (one small helper per AlertType — mirrors the counters above) ────

async function buildMaintenanceAlerts(ctx: UserAlertContext): Promise<Alert[]> {
  const s = await resolveMaintenanceScope(ctx);
  if (s === DENY) return [];
  const rows = await AlertsRepository.listOverdueMaintenance(s);
  return rows.map((row) => {
    const severity = computeOverdueSeverity(
      row.odometer,
      row.nextServiceReading_forecast,
      row.lastServiceDate,
      row.maintIntervalDays
    );
    return {
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
    };
  });
}

async function buildIncidentAlerts(ctx: UserAlertContext): Promise<Alert[]> {
  const s = resolveTenantScope(ctx);
  if (s === DENY) return [];
  const rows = await AlertsRepository.listOpenIncidents(s);
  return rows.map((row) => ({
    id: `INCIDENT_${row.id}`,
    type: 'INCIDENT_OPEN',
    severity: 'CRITICAL',
    title: `Incidente abierto — ${row.category} · ${row.unit_id}`,
    description: String(row.description).substring(0, 120),
    unitId: String(row.unit_id),
    createdAt:
      row.reported_at instanceof Date ? row.reported_at.toISOString() : String(row.reported_at),
  }));
}

async function buildCriticalAlerts(ctx: UserAlertContext): Promise<Alert[]> {
  const s = resolveTenantScope(ctx);
  if (s === DENY) return [];
  const rows = await AlertsRepository.listCriticalUnits(s);
  return rows.map((row) => ({
    id: `UNIT_CRITICAL_${row.unit_id}`,
    type: 'UNIT_CRITICAL',
    severity: 'CRITICAL',
    title: `Unidad bloqueada — ${row.unit_id}`,
    description: `En mantenimiento activo hace ${row.hours_active}h sin cerrar`,
    unitId: String(row.unit_id),
    createdAt: row.start_at instanceof Date ? row.start_at.toISOString() : String(row.start_at),
  }));
}

function complianceRowAlerts(row: AlertsRepository.ComplianceRow): Alert[] {
  const alerts: Alert[] = [];
  COMPLIANCE_DOCUMENTS.forEach(({ daysField, idTag, label, participle }) => {
    const daysLeft = (row as unknown as Record<string, number | null>)[daysField];
    if (daysLeft == null || daysLeft > 30) return;
    alerts.push({
      id: `COMPLIANCE_${idTag}_${row.id}`,
      type: 'COMPLIANCE_EXPIRY',
      severity: computeComplianceSeverity(daysLeft),
      title: daysLeft < 0 ? `Documento vencido — ${row.id}` : `Cumplimiento por vencer — ${row.id}`,
      description: buildComplianceDescription(label, daysLeft, participle),
      unitId: String(row.id),
      createdAt: new Date().toISOString(),
    });
  });
  return alerts;
}

async function buildComplianceAlerts(ctx: UserAlertContext): Promise<Alert[]> {
  const s = resolveTenantScope(ctx);
  if (s === DENY) return [];
  const rows = await AlertsRepository.listComplianceExpiry(s);
  return rows.flatMap(complianceRowAlerts);
}

async function buildLeaseAlerts(ctx: UserAlertContext): Promise<Alert[]> {
  const s = resolveTenantScope(ctx);
  if (s === DENY) return [];
  const leaseCategoryId = await resolveCatalogId('FINANCE_CATEGORY', 'LEASE');
  const rows = await AlertsRepository.listLeaseMissing(s, leaseCategoryId);
  return rows.map((row) => {
    const dayOfMonth = Number(row.dayOfMonth);
    return {
      id: `LEASE_MISSING_${row.id}`,
      type: 'LEASE_PAYMENT_MISSING',
      severity: computeLeaseMissingSeverity(dayOfMonth),
      title: `Renta sin registrar — ${row.id}`,
      description: buildLeaseMissingDescription(Number(row.monthlyLeasePayment), dayOfMonth),
      unitId: String(row.id),
      createdAt: new Date().toISOString(),
    };
  });
}

async function buildFineAlerts(ctx: UserAlertContext): Promise<Alert[]> {
  const s = resolveTenantScope(ctx);
  if (s === DENY) return [];
  const fineCategoryId = await resolveCatalogId('FINANCE_CATEGORY', 'FINE');
  const rows = await AlertsRepository.listFinesRegistered(s, fineCategoryId);
  return rows.map((row) => ({
    id: `FINE_${row.id}`,
    type: 'FINE_REGISTERED',
    severity: 'HIGH',
    title: `Multa registrada — ${row.unit_id}`,
    description: buildFineDescription(Number(row.amount), row.vendor),
    unitId: String(row.unit_id),
    createdAt:
      row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
  }));
}

/** Guard defensivo espejo del HAVING de `listExpenseAnomalies` — testeable sin SQL real. */
function anomalyAlertFromRow(row: AlertsRepository.AnomalyRow): Alert | null {
  const prevPeriods = Number(row.prevPeriods);
  const prevTotal = Number(row.prevTotal);
  if (prevPeriods < 3 || prevTotal <= 0) return null;
  const currentTotal = Number(row.currentTotal);
  const avg = prevTotal / prevPeriods;
  const ratio = currentTotal / avg;
  if (ratio < 1.5) return null;
  return {
    id: `EXPENSE_ANOMALY_${row.unit_id}`,
    type: 'EXPENSE_ANOMALY',
    severity: computeAnomalySeverity(ratio),
    title: `Gasto anómalo — ${row.unit_id}`,
    description: buildAnomalyDescription(currentTotal, avg, ratio),
    unitId: String(row.unit_id),
    createdAt: new Date().toISOString(),
  };
}

async function buildAnomalyAlerts(ctx: UserAlertContext): Promise<Alert[]> {
  const s = resolveTenantScope(ctx);
  if (s === DENY) return [];
  const rows = await AlertsRepository.listExpenseAnomalies(s);
  return rows.map(anomalyAlertFromRow).filter((a): a is Alert => a !== null);
}

const BUILDERS: Record<AlertType, (ctx: UserAlertContext) => Promise<Alert[]>> = {
  MAINTENANCE_OVERDUE: buildMaintenanceAlerts,
  INCIDENT_OPEN: buildIncidentAlerts,
  UNIT_CRITICAL: buildCriticalAlerts,
  COMPLIANCE_EXPIRY: buildComplianceAlerts,
  LEASE_PAYMENT_MISSING: buildLeaseAlerts,
  FINE_REGISTERED: buildFineAlerts,
  EXPENSE_ANOMALY: buildAnomalyAlerts,
};

/** Full, sorted alert list (CRITICAL→LOW, then newest-first) across every `AlertType` the caller can see. */
export async function getAlerts(ctx: UserAlertContext): Promise<Alert[]> {
  const scope = resolveAlertScope(ctx.permissions);
  const applicable = (Object.keys(BUILDERS) as AlertType[]).filter((type) => scope.has(type));
  // Secuencial a propósito — mismo motivo que getAlertsCount (mocks FIFO).
  const groups: Alert[][] = [];
  await applicable.reduce(async (prev, type) => {
    await prev;
    groups.push(await BUILDERS[type](ctx));
  }, Promise.resolve());
  return sortAlerts(groups.flat());
}
