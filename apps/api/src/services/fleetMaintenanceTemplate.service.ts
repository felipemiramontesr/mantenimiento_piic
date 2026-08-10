import { RowDataPacket } from 'mysql2';
import db from './db';
import * as FleetMaintenanceRepository from './fleetMaintenance.repository';
import { MAINTENANCE } from '../constants/maintenance';
import {
  resolveOwnerScope,
  computeServiceType,
  buildCascadeServiceTypes,
  MINOR_AGENCY_EQUIV,
  MINOR_FRESHNESS_THRESHOLD,
  type MaintenanceUser,
  type ServiceType,
  type TemplateTask,
} from './fleetMaintenance.service';

/**
 * FC156 F1 — FleetMaintenanceTemplateService: the `GET /maintenance/template/:unitId`
 * checklist engine (Libro V §17.1, verbatim) — split out of `fleetMaintenance.service.ts`
 * by Gate 1 `max-lines:400` (same domain, `Cond.R-156-M1`). Zero SQL, zero Fastify (I1/I2).
 */

async function fetchDeferredTasks(
  unitId: string,
  existingCodes: Set<string>
): Promise<TemplateTask[]> {
  const lastOrderId = await FleetMaintenanceRepository.findLastCompletedMaintenanceId(unitId, db);
  if (lastOrderId === null) return [];
  const deferredRows = await FleetMaintenanceRepository.findDeferredTaskDetails(lastOrderId, db);
  return deferredRows
    .filter((row) => !existingCodes.has(row.task_code as string))
    .map((row) => ({
      code: row.task_code as string,
      label: row.label as string,
      isCritical: Boolean(row.isCritical),
      isDeferredCarry: true,
    }));
}

function appendPredictiveAlerts(
  tasks: TemplateTask[],
  currentOdometer: number,
  lastChassisOdo: number,
  lastDistOdo: number
): void {
  if (currentOdometer - lastChassisOdo >= MAINTENANCE.PREDICTIVE_ALERTS.CHASSIS_INSPECTION_KM) {
    tasks.push({
      code: 'CHASSIS_SHOCKS_HEAVY',
      label: 'Inspección de chasis pesado y amortiguadores (Alerta Predictiva Delta)',
      isCritical: true,
      isDeferredCarry: false,
    });
  }
  if (currentOdometer - lastDistOdo >= MAINTENANCE.PREDICTIVE_ALERTS.DISTRIBUTION_KIT_KM) {
    tasks.push({
      code: 'DISTRIBUTION_KIT_WATER_PUMP',
      label: 'Reemplazo de kit de distribución y bomba de agua (Alerta Predictiva Delta)',
      isCritical: true,
      isDeferredCarry: false,
    });
  }
}

export interface MaintenanceTemplateParams {
  serviceType?: string;
  odometer?: string;
}

async function mergeMinorMiningTasks(
  tasks: TemplateTask[],
  unit: RowDataPacket,
  currentOdometer: number
): Promise<void> {
  const kmSinceLastMinor = Math.max(0, currentOdometer - Number(unit.lastServiceReading || 0));
  const isFresh = kmSinceLastMinor < Number(unit.maintIntervalKm) * MINOR_FRESHNESS_THRESHOLD;
  const agencyCodes = new Set(tasks.map((t) => t.code));

  const minorRows = await FleetMaintenanceRepository.findMinorMiningTasks(
    unit.fuelTypeId as number,
    db
  );
  minorRows.forEach((row) => {
    const code = row.code as string;
    const agencyEquiv = MINOR_AGENCY_EQUIV[code];
    const isCoveredByAgency = agencyEquiv !== undefined && agencyCodes.has(agencyEquiv);
    const isAlwaysInclude = agencyEquiv === undefined; // FUEL_FILTER_MINING, WATER_SEPARATOR_MINING

    if (isAlwaysInclude || (!isCoveredByAgency && !isFresh)) {
      tasks.push({
        code,
        label: row.label as string,
        isCritical: Boolean(row.isCritical),
        isDeferredCarry: false,
      });
    }
  });
}

function removeFuelTypeExclusiveTask(tasks: TemplateTask[], fuelTypeId: number): void {
  let remove: string | null = null;
  if (fuelTypeId === 10) remove = 'CABIN_FILTER_MINING';
  else if (fuelTypeId === 11) remove = 'WATER_SEPARATOR_MINING';
  if (remove) {
    const idx = tasks.findIndex((t) => t.code === remove);
    if (idx !== -1) tasks.splice(idx, 1);
  }
}

async function isTemplateUnitAccessible(
  unitId: string,
  ownerScope: number[] | null
): Promise<boolean> {
  if (ownerScope === null) return true;
  if (ownerScope.length === 0) return false;
  return FleetMaintenanceRepository.isUnitOwned(unitId, ownerScope, db);
}

/** Orchestrates `GET /maintenance/template/:unitId` — returns `null` if the unit isn't found/owned. */
export async function getMaintenanceTemplate(
  user: MaintenanceUser,
  unitId: string,
  params: MaintenanceTemplateParams
): Promise<TemplateTask[] | null> {
  const ownerScope = await resolveOwnerScope(user);
  if (!(await isTemplateUnitAccessible(unitId, ownerScope))) return null;

  const unit = await FleetMaintenanceRepository.findUnitMaintenanceProfile(unitId, db);
  if (unit === null) return null;

  const currentOdometer =
    params.odometer !== undefined ? Number(params.odometer) : Number(unit.odometer || 0);
  const isMineUnit =
    Number(unit.maintIntervalKm) === MAINTENANCE.MINE_UNIT_INTERVAL_KM ||
    Number(unit.maintIntervalDays) > 0;
  const resolvedType: ServiceType =
    (params.serviceType as ServiceType | undefined) ??
    computeServiceType(currentOdometer, unit.maintIntervalKm as number | string);

  const serviceTypes = buildCascadeServiceTypes(resolvedType);
  const rows = await FleetMaintenanceRepository.findMaintenancePlanTasks(
    serviceTypes,
    unit.brandId as number,
    unit.fuelTypeId as number,
    db
  );
  const tasks: TemplateTask[] = rows.map((r) => ({
    code: r.code as string,
    label: r.label as string,
    isCritical: Boolean(r.isCritical),
    isDeferredCarry: false,
  }));

  if (isMineUnit && resolvedType !== 'MINOR_MINING') {
    await mergeMinorMiningTasks(tasks, unit, currentOdometer);
  }
  if (isMineUnit) {
    removeFuelTypeExclusiveTask(tasks, Number(unit.fuelTypeId));
  }

  const lastChassisOdo = Number(unit.last_chassis_inspection_odometer || 0);
  const lastDistOdo = Number(unit.last_distribution_change_odometer || 0);
  if (isMineUnit) appendPredictiveAlerts(tasks, currentOdometer, lastChassisOdo, lastDistOdo);

  const existingCodes = new Set(tasks.map((t) => t.code));
  const deferred = await fetchDeferredTasks(unitId, existingCodes);
  deferred.forEach((t) => tasks.push(t));

  return tasks;
}
