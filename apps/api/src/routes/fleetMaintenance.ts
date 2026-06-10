import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import crypto from 'crypto';
import db from '../services/db';
import { UNIT_STATUS, MOVEMENT_STATUS } from '../constants/statuses';
import { MAINTENANCE } from '../constants/maintenance';
import requirePermission from '../middleware/requirePermission';
import NotificationService, {
  ArchonNotificationType,
  ArchonNotificationPriority,
} from '../services/notification.service';
import { createWorkOrder } from '../services/workOrderService';
import { purgeOutboxForOrder } from '../services/notificationsOutboxService';

// ─── Enums ────────────────────────────────────────────────────────────────────

const SERVICE_TYPE_ENUM = [
  'BASIC_10K',
  'INTERMEDIATE_20K',
  'MAJOR_30K',
  'ADVANCED_50K',
  'MINOR_MINING',
] as const;

type ServiceType = (typeof SERVICE_TYPE_ENUM)[number];

// ─── Schemas ──────────────────────────────────────────────────────────────────

const detailSchema = z.object({
  taskCode: z.string().min(1).max(50),
  status: z.string().min(1).max(50),
  notes: z.string().max(255).optional().nullable(),
});

/**
 * Hybrid intake schema — service type is computed server-side from odometry.
 * is_in_progress = false → immediate COMPLETED registration (in-situ)
 * is_in_progress = true  → opens ACTIVE movement + locks unit to En Mantenimiento
 */
const createMaintenanceSchema = z.object({
  unitId: z.string().min(2).max(50),
  serviceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  odometerAtService: z.number().min(0),
  cost: z.number().min(0).default(0),
  technician: z.string().min(2).max(100),
  details: z.array(detailSchema).default([]),
  is_in_progress: z.boolean().default(false),
  fuelLevelEnd: z.number().min(0).max(100).optional(),
  fuelLitersLoaded: z.number().min(0).optional(),
  fuelAmount: z.number().min(0).optional(),
  endOdometer: z.number().min(0).optional(),
});

/**
 * Completion schema — service type recomputed from final odometry.
 * endOdometer = post-service reading (test drives + return trip), defaults to odometerAtService.
 */
const completeMaintenanceSchema = z.object({
  odometerAtService: z.number().min(0),
  cost: z.number().min(0),
  serviceDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  technician: z.string().min(2).max(100).optional(),
  details: z.array(detailSchema).default([]),
  fuelLevelEnd: z.number().min(0).max(100).optional(),
  fuelLitersLoaded: z.number().min(0).optional(),
  fuelAmount: z.number().min(0).optional(),
  endOdometer: z.number().min(0).optional(),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Cyclic service type engine — canonical rule for Archon fleet.
 * Applies mod-60,000 km residue with strict ±1,000 km tolerance windows.
 * Mine units (maintIntervalKm === 5000) fill non-agency midpoints with MINOR_MINING.
 * Agency units fall back to the nearest agency milestone.
 */
export function computeServiceType(
  odometer: number,
  maintIntervalKm: number | string
): ServiceType {
  if (!odometer || odometer <= 0) return 'BASIC_10K';
  const remainder = odometer % MAINTENANCE.CYCLE_KM;
  const isMineUnit = Number(maintIntervalKm) === MAINTENANCE.MINE_UNIT_INTERVAL_KM;

  if (
    remainder <= MAINTENANCE.TOLERANCE_KM ||
    remainder >= MAINTENANCE.CYCLE_KM - MAINTENANCE.TOLERANCE_KM
  )
    return 'ADVANCED_50K';
  if (
    remainder >= MAINTENANCE.WINDOWS.ADVANCED_50K.low &&
    remainder <= MAINTENANCE.WINDOWS.ADVANCED_50K.high
  )
    return 'ADVANCED_50K';
  if (
    remainder >= MAINTENANCE.WINDOWS.MAJOR_30K.low &&
    remainder <= MAINTENANCE.WINDOWS.MAJOR_30K.high
  )
    return 'MAJOR_30K';
  if (
    remainder >= MAINTENANCE.WINDOWS.INTERMEDIATE_20K.low &&
    remainder <= MAINTENANCE.WINDOWS.INTERMEDIATE_20K.high
  )
    return 'INTERMEDIATE_20K';
  if (
    remainder >= MAINTENANCE.WINDOWS.BASIC_10K.low &&
    remainder <= MAINTENANCE.WINDOWS.BASIC_10K.high
  )
    return 'BASIC_10K';

  if (isMineUnit) return 'MINOR_MINING';

  const milestones: { type: ServiceType; value: number }[] = [...MAINTENANCE.MILESTONES];
  let best: ServiceType = 'BASIC_10K';
  let minDist = Infinity;
  milestones.forEach((m) => {
    const dist = Math.abs(remainder - m.value);
    if (dist < minDist) {
      minDist = dist;
      best = m.type;
    }
  });
  return best;
}

export function resolveServiceMode(serviceType: ServiceType): 'IN_SITU' | 'WORKSHOP' {
  return serviceType === 'MINOR_MINING' ? 'IN_SITU' : 'WORKSHOP';
}

/**
 * Finalizes a MAINTENANCE movement: updates fleet_units odometer, forecast, and status.
 * Shared by both the direct COMPLETED path and the PATCH complete path.
 */
async function applyMaintenanceCompletionToUnit(
  connection: Awaited<ReturnType<typeof db.getConnection>>,
  unitId: string,
  odometerAtService: number,
  serviceDate: string,
  maintIntervalKm: number | string,
  details: Array<{ taskCode: string; status: string }>,
  endOdometer?: number,
  fuelLevelEnd?: number
): Promise<void> {
  const [unitRows] = await connection.execute<RowDataPacket[]>(
    'SELECT odometer FROM fleet_units WHERE id = ?',
    [unitId]
  );
  const currentOdometer = Number((unitRows[0] as RowDataPacket).odometer || 0);

  // Number() casting prevents string concatenation bug (ASM-021 incident)
  const nextServiceReading =
    Number(odometerAtService) + Number(maintIntervalKm || MAINTENANCE.AGENCY_DEFAULT_INTERVAL_KM);
  // endOdometer reflects post-service km (test drives + return trip); falls back to odometerAtService
  const finalOdometer = Math.max(currentOdometer, Number(endOdometer ?? odometerAtService));

  let updateChassisOdo = false;
  let updateDistributionOdo = false;
  details.forEach((d) => {
    if (d.taskCode === 'CHASSIS_SHOCKS_HEAVY' && (d.status === 'PASS' || d.status === 'REPLACED'))
      updateChassisOdo = true;
    if (
      d.taskCode === 'DISTRIBUTION_KIT_WATER_PUMP' &&
      (d.status === 'PASS' || d.status === 'REPLACED')
    )
      updateDistributionOdo = true;
  });

  const updates: [string, string | number][] = [
    ['odometer', finalOdometer],
    ['lastServiceReading', odometerAtService],
    ['lastServiceDate', serviceDate],
    ['nextServiceReading_forecast', nextServiceReading],
    ['status', UNIT_STATUS.AVAILABLE],
  ];
  if (fuelLevelEnd !== undefined) updates.push(['lastFuelLevel', fuelLevelEnd]);
  if (updateChassisOdo) updates.push(['last_chassis_inspection_odometer', odometerAtService]);
  if (updateDistributionOdo) updates.push(['last_distribution_change_odometer', odometerAtService]);

  const setClause = `${updates
    .map(([col]) => `${col} = ?`)
    .join(', ')}, updatedAt = CURRENT_TIMESTAMP`;
  await connection.execute(`UPDATE fleet_units SET ${setClause} WHERE id = ?`, [
    ...updates.map(([, val]) => val),
    unitId,
  ]);
}

// ─── Template Helpers ─────────────────────────────────────────────────────────

type TemplateTask = {
  code: string;
  label: string;
  isCritical: boolean;
  isDeferredCarry: boolean;
};

export function buildCascadeServiceTypes(resolvedType: ServiceType): string[] {
  if (resolvedType === 'ADVANCED_50K')
    return ['ADVANCED_50K', 'MAJOR_30K', 'INTERMEDIATE_20K', 'BASIC_10K'];
  if (resolvedType === 'MAJOR_30K') return ['MAJOR_30K', 'INTERMEDIATE_20K', 'BASIC_10K'];
  if (resolvedType === 'INTERMEDIATE_20K') return ['INTERMEDIATE_20K', 'BASIC_10K'];
  return [resolvedType];
}

/**
 * Minor task → agency task that already covers the same operation.
 * Tasks with no entry here have no agency equivalent and are always included.
 */
export const MINOR_AGENCY_EQUIV: Record<string, string> = {
  OIL_CHANGE_MINING: 'OIL_CHANGE',
  OIL_FILTER_MINING: 'OIL_FILTER',
  AIR_FILTER_MINING: 'AIR_FILTER_CHANGE',
  CABIN_FILTER_MINING: 'CABIN_FILTER_CHANGE',
};

export const MINOR_FRESHNESS_THRESHOLD = 0.2;

async function fetchDeferredTasks(
  unitId: string,
  existingCodes: Set<string>
): Promise<TemplateTask[]> {
  const [lastOrderRows] = await db.execute<RowDataPacket[]>(
    `SELECT id FROM fleet_movements
     WHERE unit_id = ? AND movement_type = 'MAINTENANCE' AND status = 'COMPLETED'
     ORDER BY end_at DESC, id DESC LIMIT 1`,
    [unitId]
  );
  if (lastOrderRows.length === 0) return [];
  const lastOrderId = lastOrderRows[0].id as number;
  const [deferredRows] = await db.execute<RowDataPacket[]>(
    `SELECT fmd.task_code, mt.label, mt.is_critical AS isCritical
     FROM fleet_maintenance_details fmd
     JOIN maintenance_tasks mt ON fmd.task_code = mt.code
     WHERE fmd.maintenance_id = ? AND fmd.status_code = 'DEFERRED'`,
    [lastOrderId]
  );
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

// ─── Routes ───────────────────────────────────────────────────────────────────

export async function fleetMaintenanceRoutes(fastify: FastifyInstance): Promise<void> {
  // Security Hook — A01:2021 Broken Access Control
  fastify.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      reply.code(401).send({ success: false, code: 'UNAUTHORIZED', message: 'Session required' });
    }
  });
  fastify.addHook('preHandler', requirePermission('maint:view'));

  // GET /v1/maintenance — Cursor-paginated history (includes ACTIVE movements)
  fastify.get('/maintenance', async (request, reply) => {
    try {
      const { cursor, limit = '50' } = request.query as { cursor?: string; limit?: string };
      const parsedLimit = parseInt(limit, 10);
      let query = `
        SELECT
          fm.id, fm.uuid, fm.unit_id, fm.status AS movement_status,
          fm.upa_work_order_id,
          fme.service_date,
          fm.start_reading AS odometer_at_service,
          fm.end_reading AS odometer_at_close,
          fm.fuel_level_start, fm.fuel_level_end, fm.fuel_liters_loaded, fm.fuel_amount,
          fme.service_type, fme.service_mode, fme.system_recommended_type,
          fme.cost, fme.technician, fm.created_at, fm.start_at, fm.end_at
        FROM fleet_movements fm
        JOIN fleet_maintenance_extensions fme ON fme.movement_id = fm.id
        JOIN fleet_units u ON fm.unit_id = u.id
        WHERE fm.movement_type = 'MAINTENANCE'
      `;
      const params: (string | number)[] = [];
      if (cursor) {
        const [cursorDate, cursorId] = Buffer.from(cursor, 'base64').toString('ascii').split('|');
        query += ` AND ((fm.created_at < ?) OR (fm.created_at = ? AND fm.id < ?)) `;
        params.push(cursorDate, cursorDate, parseInt(cursorId, 10));
      }
      query += ` ORDER BY fm.created_at DESC, fm.id DESC LIMIT ? `;
      params.push(parsedLimit + 1);
      const [rows] = await db.execute<RowDataPacket[]>(query, params);
      let nextCursor = null;
      if (rows.length > parsedLimit) {
        const lastItem = rows[parsedLimit - 1];
        nextCursor = Buffer.from(
          `${(lastItem.created_at as Date).toISOString()}|${lastItem.id}`
        ).toString('base64');
        rows.pop();
      }
      return reply.send({ success: true, data: rows, nextCursor });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ success: false, message: 'Error retrieving maintenance logs' });
    }
  });

  // GET /v1/maintenance/template/:unitId — Generate checklist for a unit
  // eslint-disable-next-line sonarjs/cognitive-complexity
  fastify.get('/maintenance/template/:unitId', async (request, reply) => {
    try {
      const { unitId } = request.params as { unitId: string };
      const { serviceType, odometer } = request.query as {
        serviceType?: string;
        odometer?: string;
      };
      const [units] = await db.execute<RowDataPacket[]>(
        `SELECT brandId, fuelTypeId, maintIntervalKm, maintIntervalDays, odometer,
                lastServiceReading, last_chassis_inspection_odometer, last_distribution_change_odometer
         FROM fleet_units WHERE id = ?`,
        [unitId]
      );
      if (units.length === 0) {
        return reply.code(404).send({ success: false, message: 'Unit not found' });
      }
      const unit = units[0];
      const currentOdometer =
        odometer !== undefined ? Number(odometer) : Number(unit.odometer || 0);
      const isMineUnit =
        Number(unit.maintIntervalKm) === MAINTENANCE.MINE_UNIT_INTERVAL_KM ||
        Number(unit.maintIntervalDays) > 0;
      const resolvedType: ServiceType =
        (serviceType as ServiceType | undefined) ??
        computeServiceType(currentOdometer, unit.maintIntervalKm);

      const serviceTypes = buildCascadeServiceTypes(resolvedType);

      const placeholders = serviceTypes.map(() => '?').join(', ');
      const query = `
        SELECT DISTINCT t.code, t.label, t.is_critical AS isCritical
        FROM (
          SELECT task_code FROM maintenance_plan_tasks WHERE service_type IN (${placeholders})
          UNION
          SELECT task_code FROM maintenance_brand_rules
          WHERE service_type IN (${placeholders})
            AND (
              brand_id = ?
              OR
              (brand_id IS NULL AND fuel_type_id = ?)
            )
        ) combined
        JOIN maintenance_tasks t ON combined.task_code = t.code
      `;
      const [rows] = await db.execute<RowDataPacket[]>(query, [
        ...serviceTypes,
        ...serviceTypes,
        unit.brandId,
        unit.fuelTypeId,
      ]);
      const tasks: TemplateTask[] = rows.map((r) => ({
        code: r.code,
        label: r.label,
        isCritical: Boolean(r.isCritical),
        isDeferredCarry: false,
      }));

      // Minor service merge for mine units at agency milestones
      if (isMineUnit && resolvedType !== 'MINOR_MINING') {
        const kmSinceLastMinor = Math.max(
          0,
          currentOdometer - Number(unit.lastServiceReading || 0)
        );
        const isFresh = kmSinceLastMinor < Number(unit.maintIntervalKm) * MINOR_FRESHNESS_THRESHOLD;
        const agencyCodes = new Set(tasks.map((t) => t.code));

        const [minorRows] = await db.execute<RowDataPacket[]>(
          `SELECT DISTINCT t.code, t.label, t.is_critical AS isCritical
           FROM (
             SELECT task_code FROM maintenance_plan_tasks WHERE service_type = 'MINOR_MINING'
             UNION
             SELECT task_code FROM maintenance_brand_rules
             WHERE service_type = 'MINOR_MINING' AND brand_id IS NULL AND fuel_type_id = ?
           ) combined
           JOIN maintenance_tasks t ON combined.task_code = t.code`,
          [unit.fuelTypeId]
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

      // Fuel-type exclusivity: remove the incorrect filter variant for mine units
      if (isMineUnit) {
        const fuelTypeId = Number(unit.fuelTypeId);
        let remove: string | null = null;
        if (fuelTypeId === 10) remove = 'CABIN_FILTER_MINING';
        else if (fuelTypeId === 11) remove = 'WATER_SEPARATOR_MINING';
        if (remove) {
          const idx = tasks.findIndex((t) => t.code === remove);
          if (idx !== -1) tasks.splice(idx, 1);
        }
      }

      const lastChassisOdo = Number(unit.last_chassis_inspection_odometer || 0);
      const lastDistOdo = Number(unit.last_distribution_change_odometer || 0);
      if (isMineUnit) appendPredictiveAlerts(tasks, currentOdometer, lastChassisOdo, lastDistOdo);

      // Inyección DEFERRED: tareas diferidas de la última orden cerrada
      const existingCodes = new Set(tasks.map((t) => t.code));
      const deferred = await fetchDeferredTasks(unitId, existingCodes);
      deferred.forEach((t) => tasks.push(t));

      return reply.send({ success: true, tasks });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ success: false, message: 'Template generation failed' });
    }
  });

  // GET /v1/maintenance/forecast — Per-unit next service forecast (computed, no DB write)
  fastify.get('/maintenance/forecast', async (_request, reply) => {
    try {
      const [units] = await db.execute<RowDataPacket[]>(`
        SELECT
          fu.id                                                        AS unitId,
          c_brand.label                                                AS marca,
          c_model.label                                                AS modelo,
          c_dept.label                                                 AS departamento,
          CAST(fu.odometer AS DECIMAL(12,2))                          AS currentOdometer,
          CAST(COALESCE(fu.dailyUsageAvg, 0) AS DECIMAL(10,2))       AS dailyUsageAvg,
          CAST(fu.maintIntervalKm AS DECIMAL(12,2))                   AS maintIntervalKm,
          fu.maintIntervalDays,
          CAST(COALESCE(fu.lastServiceReading, 0) AS DECIMAL(12,2))  AS lastServiceReading,
          COALESCE(DATE(fu.lastServiceDate), DATE(fu.createdAt))      AS lastServiceDate
        FROM fleet_units fu
        LEFT JOIN common_catalogs c_brand
          ON fu.brandId = c_brand.id AND c_brand.category = 'BRAND'
        LEFT JOIN common_catalogs c_model
          ON fu.modelId = c_model.id AND c_model.category = 'MODEL'
        LEFT JOIN common_catalogs c_dept
          ON fu.departmentId = c_dept.id AND c_dept.category = 'DEPARTMENT'
        WHERE fu.is_active = 1
        ORDER BY fu.id
      `);

      type ForecastRow = {
        unitId: string;
        marca: string;
        modelo: string;
        departamento: string;
        currentOdometer: number;
        dailyUsageAvg: number;
        nextKmReading: number;
        kmRemaining: number;
        nextServiceDate: string;
        daysUntilService: number;
        triggerType: 'KM' | 'DATE';
        projectedOdometer: number;
        projectedServiceType: ServiceType;
        urgency: 'CRITICAL' | 'WARNING' | 'OK';
      };

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const rows: ForecastRow[] = units.map((unit) => {
        const currentOdometer = Number(unit.currentOdometer);
        const dailyUsageAvg = Number(unit.dailyUsageAvg);
        const maintIntervalKm = Number(unit.maintIntervalKm);
        const maintIntervalDays = Number(unit.maintIntervalDays);
        const lastServiceReading = Number(unit.lastServiceReading);

        const lastSvcDate = new Date(unit.lastServiceDate as string);
        lastSvcDate.setHours(0, 0, 0, 0);

        const nextKmReading = lastServiceReading + maintIntervalKm;
        const kmRemaining = Math.max(0, nextKmReading - currentOdometer);
        const daysForKm = dailyUsageAvg > 0 ? kmRemaining / dailyUsageAvg : Infinity;

        const nextSvcDate = new Date(lastSvcDate);
        nextSvcDate.setDate(nextSvcDate.getDate() + maintIntervalDays);
        const daysForDate = Math.max(
          0,
          Math.round((nextSvcDate.getTime() - today.getTime()) / 86400000)
        );

        const kmFinite = Number.isFinite(daysForKm);
        const winnerDays = kmFinite ? Math.min(daysForKm, daysForDate) : daysForDate;
        const triggerType: 'KM' | 'DATE' = kmFinite && daysForKm <= daysForDate ? 'KM' : 'DATE';
        const projectedOdometer = Math.round(currentOdometer + winnerDays * dailyUsageAvg);
        const projectedServiceType = computeServiceType(projectedOdometer, maintIntervalKm);

        let urgency: 'CRITICAL' | 'WARNING' | 'OK';
        if (winnerDays <= 7) {
          urgency = 'CRITICAL';
        } else if (winnerDays <= 30) {
          urgency = 'WARNING';
        } else {
          urgency = 'OK';
        }

        return {
          unitId: unit.unitId as string,
          marca: (unit.marca as string) || '—',
          modelo: (unit.modelo as string) || '—',
          departamento: (unit.departamento as string) || '—',
          currentOdometer,
          dailyUsageAvg,
          nextKmReading,
          kmRemaining: Math.round(kmRemaining),
          nextServiceDate: nextSvcDate.toISOString().split('T')[0],
          daysUntilService: Math.round(winnerDays),
          triggerType,
          projectedOdometer,
          projectedServiceType,
          urgency,
        };
      });

      const urgencyOrder: Record<string, number> = { CRITICAL: 0, WARNING: 1, OK: 2 };
      rows.sort((a, b) => {
        const uDiff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
        return uDiff !== 0 ? uDiff : a.daysUntilService - b.daysUntilService;
      });

      return reply.send({ success: true, data: rows });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ success: false, message: 'Forecast generation failed' });
    }
  });

  // GET /v1/maintenance/:uuid — Full detail of a single maintenance order with tasks
  fastify.get('/maintenance/:uuid', async (request, reply) => {
    try {
      const { uuid } = request.params as { uuid: string };
      const [movements] = await db.execute<RowDataPacket[]>(
        `SELECT fm.id, fm.uuid, fm.unit_id, fm.status AS movement_status,
                fme.service_date,
                fm.start_reading AS odometer_at_service,
                fm.end_reading AS odometer_at_close,
                fm.fuel_level_start, fm.fuel_level_end, fm.fuel_liters_loaded, fm.fuel_amount,
                fme.service_type, fme.service_mode, fme.system_recommended_type,
                fme.cost, fme.technician, fm.created_at
         FROM fleet_movements fm
         JOIN fleet_maintenance_extensions fme ON fme.movement_id = fm.id
         WHERE fm.uuid = ? AND fm.movement_type = 'MAINTENANCE'`,
        [uuid]
      );
      if (movements.length === 0)
        return reply.code(404).send({ success: false, message: 'Order not found' });
      const movement = movements[0];
      const [details] = await db.execute<RowDataPacket[]>(
        `SELECT fmd.task_code AS taskCode, fmd.status_code AS status, fmd.notes,
                mt.label, mt.is_critical AS isCritical,
                mts.label AS statusLabel
         FROM fleet_maintenance_details fmd
         JOIN maintenance_tasks mt ON fmd.task_code = mt.code
         JOIN maintenance_task_statuses mts ON fmd.status_code = mts.code
         WHERE fmd.maintenance_id = ?
         ORDER BY mt.is_critical DESC, fmd.task_code`,
        [movement.id]
      );
      return reply.send({ success: true, data: { ...movement, details } });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ success: false, message: 'Error retrieving order detail' });
    }
  });

  // GET /v1/maintenance/:uuid/node — Sovereign node: full maintenance order with unit context
  fastify.get('/maintenance/:uuid/node', async (request, reply) => {
    try {
      const { uuid } = request.params as { uuid: string };
      const [movements] = await db.execute<RowDataPacket[]>(
        `SELECT fm.id, fm.uuid, fm.unit_id, fm.status AS movement_status,
                fme.service_date, fm.start_reading AS odometer_at_service,
                fm.end_reading AS odometer_at_close,
                fm.fuel_level_start, fm.fuel_level_end,
                fm.fuel_liters_loaded, fm.fuel_amount,
                fme.service_type, fme.service_mode, fme.system_recommended_type,
                fme.cost, fme.technician, fm.created_at, fm.start_at, fm.end_at
         FROM fleet_movements fm
         JOIN fleet_maintenance_extensions fme ON fme.movement_id = fm.id
         WHERE fm.uuid = ? AND fm.movement_type = 'MAINTENANCE'`,
        [uuid]
      );
      if (movements.length === 0)
        return reply.code(404).send({ success: false, message: 'Orden no encontrada' });
      const movement = movements[0];

      const [details, unitRows] = await Promise.all([
        db.execute<RowDataPacket[]>(
          `SELECT fmd.task_code AS taskCode, fmd.status_code AS status, fmd.notes,
                  mt.label, mt.is_critical AS isCritical,
                  mts.label AS statusLabel
           FROM fleet_maintenance_details fmd
           JOIN maintenance_tasks mt ON fmd.task_code = mt.code
           JOIN maintenance_task_statuses mts ON fmd.status_code = mts.code
           WHERE fmd.maintenance_id = ?
           ORDER BY mt.is_critical DESC, fmd.task_code`,
          [movement.id]
        ),
        db.execute<RowDataPacket[]>(
          `SELECT fu.id, fu.status,
                  c_brand.label AS marca, c_model.label AS modelo, fu.year,
                  fu.odometer, fu.maintIntervalKm, fu.lastFuelLevel
           FROM fleet_units fu
           LEFT JOIN common_catalogs c_brand ON fu.brandId = c_brand.id AND c_brand.category = 'BRAND'
           LEFT JOIN common_catalogs c_model ON fu.modelId = c_model.id AND c_model.category = 'MODEL'
           WHERE fu.id = ?`,
          [movement.unit_id]
        ),
      ]);

      return reply.send({
        success: true,
        data: {
          order: { ...movement, details: details[0] },
          unit: unitRows[0][0] ?? null,
        },
      });
    } catch (error) {
      fastify.log.error(error);
      return reply
        .code(500)
        .send({ success: false, message: 'Error al cargar nodo de mantenimiento' });
    }
  });

  /**
   * POST /v1/maintenance — Hybrid intake (Option C)
   *
   * is_in_progress = false → COMPLETED immediately (quick log / in-situ)
   * is_in_progress = true  → ACTIVE movement + unit locked to Downtime
   */
  fastify.post(
    '/maintenance',
    { preHandler: [requirePermission('maint:write')] },
    async (request, reply) => {
      const connection = await db.getConnection();
      try {
        await connection.beginTransaction();
        const data = createMaintenanceSchema.parse(request.body);
        const logUuid = crypto.randomUUID();

        const [units] = await connection.execute<RowDataPacket[]>(
          'SELECT id, odometer, maintIntervalKm, status, lastFuelLevel FROM fleet_units WHERE id = ? FOR UPDATE',
          [data.unitId]
        );
        if (units.length === 0) throw new Error('Fleet unit not found');
        const unit = units[0];
        const serviceType = computeServiceType(data.odometerAtService, unit.maintIntervalKm);
        const serviceMode = resolveServiceMode(serviceType);

        // Auto-inherit current fuel level from unit — no frontend input required
        const fuelStart = unit.lastFuelLevel != null ? Number(unit.lastFuelLevel) : null;

        // 1. Insert CTI base record
        let movementResult: ResultSetHeader;
        if (data.is_in_progress) {
          // Creates as OPEN — waits for technician acceptance before going ACTIVE
          const requestingUser = request.user as { id: number };
          [movementResult] = await connection.execute<ResultSetHeader>(
            `INSERT INTO fleet_movements
            (uuid, unit_id, movement_type, status, start_reading, start_at, fuel_level_start, created_by_user_id)
           VALUES (?, ?, 'MAINTENANCE', 'OPEN', ?, ?, ?, ?)`,
            [
              logUuid,
              data.unitId,
              data.odometerAtService,
              data.serviceDate,
              fuelStart,
              requestingUser.id,
            ]
          );
        } else {
          const endOdo = data.endOdometer ?? data.odometerAtService;
          [movementResult] = await connection.execute<ResultSetHeader>(
            `INSERT INTO fleet_movements
            (uuid, unit_id, movement_type, status, start_reading, end_reading,
             start_at, end_at, fuel_level_start, fuel_level_end, fuel_liters_loaded, fuel_amount)
           VALUES (?, ?, 'MAINTENANCE', 'COMPLETED', ?, ?, ?, NOW(), ?, ?, ?, ?)`,
            [
              logUuid,
              data.unitId,
              data.odometerAtService,
              endOdo,
              data.serviceDate,
              fuelStart,
              data.fuelLevelEnd ?? null,
              data.fuelLitersLoaded ?? null,
              data.fuelAmount ?? null,
            ]
          );
        }
        const movementId = movementResult.insertId;

        // 2. Insert CTI maintenance extension
        await connection.execute(
          `INSERT INTO fleet_maintenance_extensions
          (movement_id, service_date, service_type, service_mode, system_recommended_type, cost, technician)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            movementId,
            data.serviceDate,
            serviceType,
            serviceMode,
            serviceType,
            data.cost,
            data.technician,
          ]
        );

        // 3. Insert task details if provided
        if (data.details.length > 0) {
          await Promise.all(
            data.details.map((detail) =>
              connection.execute(
                `INSERT INTO fleet_maintenance_details (maintenance_id, task_code, status_code, notes) VALUES (?, ?, ?, ?)`,
                [movementId, detail.taskCode, detail.status, detail.notes || null]
              )
            )
          );
        }

        if (data.is_in_progress) {
          // 4a. Commit OPEN order — unit stays available until technician accepts
          await connection.commit();

          // Notify assigned technician asynchronously (non-blocking)
          db.execute<RowDataPacket[]>(
            `SELECT id FROM users WHERE fullName = ? OR username = ? LIMIT 1`,
            [data.technician, data.technician]
          )
            .then(([techRows]) => {
              if (techRows.length > 0) {
                const techUserId = techRows[0].id as number;
                return NotificationService.dispatch({
                  userId: techUserId,
                  type: ArchonNotificationType.MAINTENANCE_ALERT,
                  priority: ArchonNotificationPriority.HIGH,
                  title: 'Nueva Orden de Servicio Asignada',
                  message: `Se te ha asignado una orden de mantenimiento para la unidad ${data.unitId}. Acepta o rechaza desde el módulo de Mantenimiento.`,
                  metadata: { uuid: logUuid, unitId: data.unitId, actionRequired: true },
                });
              }
              return Promise.resolve();
            })
            .catch(() => {
              // Notification failure is non-fatal per zero-noise policy
            });

          // Notify maintenance supervisor of new OPEN order (fire-and-forget)
          NotificationService.dispatch({
            permission: 'maint:write',
            type: ArchonNotificationType.MAINTENANCE_ALERT,
            priority: ArchonNotificationPriority.MEDIUM,
            title: 'Nueva orden de mantenimiento creada',
            message: `Nueva orden OPEN creada para unidad #${data.unitId}. Pendiente de aceptación por técnico.`,
            metadata: { uuid: logUuid, unitId: data.unitId },
          }).catch(() => {
            // Notification failure is non-fatal per zero-noise policy
          });

          return reply.code(201).send({
            success: true,
            message: 'Maintenance order created. Awaiting technician acceptance.',
            uuid: logUuid,
            movement_status: MOVEMENT_STATUS.OPEN,
          });
        }
        // 4b. Apply completion immediately (in-situ / historical log)
        await applyMaintenanceCompletionToUnit(
          connection,
          data.unitId,
          data.odometerAtService,
          data.serviceDate,
          unit.maintIntervalKm,
          data.details,
          data.endOdometer,
          data.fuelLevelEnd
        );
        await connection.commit();
        return reply.code(201).send({
          success: true,
          message: 'Maintenance registered successfully.',
          uuid: logUuid,
          movement_status: MOVEMENT_STATUS.COMPLETED,
        });
      } catch (error) {
        await connection.rollback();
        fastify.log.error(error);
        return reply.code(400).send({ success: false, message: (error as Error).message });
      } finally {
        connection.release();
      }
    }
  );

  /**
   * PATCH /v1/maintenance/:uuid/complete — Close an ACTIVE maintenance order
   *
   * Receives final telemetry, closes the movement, releases unit to Disponible.
   */
  fastify.patch(
    '/maintenance/:uuid/complete',
    { preHandler: [requirePermission('maint:write')] },
    async (request, reply) => {
      const connection = await db.getConnection();
      try {
        await connection.beginTransaction();
        const { uuid } = request.params as { uuid: string };
        const data = completeMaintenanceSchema.parse(request.body);

        // 1. Verify movement exists and is ACTIVE MAINTENANCE
        const [movements] = await connection.execute<RowDataPacket[]>(
          `SELECT fm.id, fm.unit_id, fm.status, fme.service_date, fme.service_type,
                fme.service_mode, fme.technician, fme.cost
         FROM fleet_movements fm
         JOIN fleet_maintenance_extensions fme ON fme.movement_id = fm.id
         WHERE fm.uuid = ? AND fm.movement_type = 'MAINTENANCE' FOR UPDATE`,
          [uuid]
        );
        if (movements.length === 0) throw new Error('Maintenance order not found');
        const movement = movements[0];
        if (movement.status !== MOVEMENT_STATUS.ACTIVE)
          throw new Error(`Cannot complete: order is already ${movement.status}`);

        const unitId = movement.unit_id as string;

        // 2. Close movement — end_reading captures post-service km (test drives + return)
        const endOdo = data.endOdometer ?? data.odometerAtService;
        await connection.execute(
          `UPDATE fleet_movements
         SET status = 'COMPLETED', end_at = NOW(), start_reading = ?,
             end_reading = ?, fuel_level_end = ?, fuel_liters_loaded = ?, fuel_amount = ?
         WHERE uuid = ?`,
          [
            data.odometerAtService,
            endOdo,
            data.fuelLevelEnd ?? null,
            data.fuelLitersLoaded ?? null,
            data.fuelAmount ?? null,
            uuid,
          ]
        );

        // 3. Fetch unit interval — drives cyclic service type + completion forecast
        const [unitRows] = await connection.execute<RowDataPacket[]>(
          'SELECT maintIntervalKm FROM fleet_units WHERE id = ?',
          [unitId]
        );
        const maintIntervalKm =
          (unitRows[0] as RowDataPacket)?.maintIntervalKm ?? MAINTENANCE.AGENCY_DEFAULT_INTERVAL_KM;

        const finalServiceDate = data.serviceDate ?? (movement.service_date as string);
        const finalServiceType = computeServiceType(data.odometerAtService, maintIntervalKm);
        const finalServiceMode = resolveServiceMode(finalServiceType);
        const finalTechnician = data.technician ?? movement.technician;
        const finalCost = data.cost;

        await connection.execute(
          `UPDATE fleet_maintenance_extensions
         SET service_date = ?, service_type = ?, service_mode = ?,
             system_recommended_type = ?, cost = ?, technician = ?
         WHERE movement_id = ?`,
          [
            finalServiceDate,
            finalServiceType,
            finalServiceMode,
            finalServiceType,
            finalCost,
            finalTechnician,
            movement.id,
          ]
        );

        // 4. Insert final task details
        if (data.details.length > 0) {
          await Promise.all(
            data.details.map((detail) =>
              connection.execute(
                `INSERT INTO fleet_maintenance_details (maintenance_id, task_code, status_code, notes)
               VALUES (?, ?, ?, ?)
               ON DUPLICATE KEY UPDATE status_code = VALUES(status_code), notes = VALUES(notes)`,
                [movement.id, detail.taskCode, detail.status, detail.notes || null]
              )
            )
          );
        }

        // 5. Apply unit completion: odometer + forecast + fuel + status = Disponible
        await applyMaintenanceCompletionToUnit(
          connection,
          unitId,
          data.odometerAtService,
          finalServiceDate,
          maintIntervalKm,
          data.details,
          data.endOdometer,
          data.fuelLevelEnd
        );

        await connection.commit();

        // Clear outbox so this order can't be re-alerted as "too long open/active"
        purgeOutboxForOrder(uuid).catch(() => {
          // Outbox purge failure is non-fatal per zero-noise policy
        });

        // Notify supervisors: unit back to Disponible (fire-and-forget)
        NotificationService.dispatch({
          permission: 'maint:write',
          type: ArchonNotificationType.MAINTENANCE_ALERT,
          priority: ArchonNotificationPriority.HIGH,
          title: 'Unidad lista para operación',
          message: `Orden ${uuid} completada. Unidad #${unitId} liberada a Disponible.`,
          metadata: { uuid, unitId },
        }).catch(() => {
          // Notification failure is non-fatal per zero-noise policy
        });
        NotificationService.dispatch({
          permission: 'fleet:write',
          type: ArchonNotificationType.MAINTENANCE_ALERT,
          priority: ArchonNotificationPriority.HIGH,
          title: 'Unidad lista para operación',
          message: `Orden ${uuid} completada. Unidad #${unitId} liberada a Disponible.`,
          metadata: { uuid, unitId },
        }).catch(() => {
          // Notification failure is non-fatal per zero-noise policy
        });

        return reply.send({
          success: true,
          message: 'Maintenance completed. Unit released to Disponible.',
          uuid,
          movement_status: MOVEMENT_STATUS.COMPLETED,
        });
      } catch (error) {
        await connection.rollback();
        fastify.log.error(error);
        return reply.code(400).send({ success: false, message: (error as Error).message });
      } finally {
        connection.release();
      }
    }
  );
  /**
   * PATCH /v1/maintenance/:uuid/accept — Technician accepts an OPEN maintenance order.
   *
   * Transitions OPEN → ACTIVE, locks unit, creates UPA work order, notifies responsable.
   * Returns { workOrderId } so the frontend can navigate directly to the UPA panel.
   */
  fastify.patch(
    '/maintenance/:uuid/accept',
    { preHandler: [requirePermission('fleet:write')] },
    async (request, reply) => {
      const connection = await db.getConnection();
      try {
        await connection.beginTransaction();
        const { uuid } = request.params as { uuid: string };

        const [movements] = await connection.execute<RowDataPacket[]>(
          `SELECT fm.id, fm.unit_id, fm.status, fm.created_by_user_id,
                  fme.service_type, fme.technician
           FROM fleet_movements fm
           JOIN fleet_maintenance_extensions fme ON fme.movement_id = fm.id
           WHERE fm.uuid = ? AND fm.movement_type = 'MAINTENANCE' FOR UPDATE`,
          [uuid]
        );
        if (movements.length === 0) {
          await connection.rollback();
          return reply.code(404).send({ success: false, message: 'Orden no encontrada' });
        }
        const movement = movements[0];
        if (movement.status !== MOVEMENT_STATUS.OPEN) {
          await connection.rollback();
          return reply.code(409).send({
            success: false,
            message: `La orden ya está en estado ${movement.status as string}`,
          });
        }

        const unitId = movement.unit_id as string;

        // OPEN → ACTIVE + lock unit
        await connection.execute(
          `UPDATE fleet_movements
           SET status = 'ACTIVE', start_at = NOW()
           WHERE uuid = ?`,
          [uuid]
        );
        await connection.execute(
          `UPDATE fleet_units SET status = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
          [UNIT_STATUS.MAINTENANCE, unitId]
        );

        // Create UPA work order — fleet type auto-derived from maintIntervalKm
        const workOrderResult = await createWorkOrder(unitId);

        // Link work order to maintenance movement
        await connection.execute(
          `UPDATE fleet_movements SET upa_work_order_id = ? WHERE uuid = ?`,
          [workOrderResult.workOrderId, uuid]
        );

        // Bridge: propagate encargado's UPA decisions to upa_work_order_tasks
        const [detailRows] = await connection.execute<RowDataPacket[]>(
          `SELECT task_code, status_code
           FROM fleet_maintenance_details
           WHERE maintenance_id = ? AND status_code IN ('N_A', 'DEFERRED')`,
          [movement.id]
        );
        const naTaskIds = detailRows
          .filter((r) => r.status_code === 'N_A')
          .map((r) => r.task_code as string);
        const deferredTaskIds = detailRows
          .filter((r) => r.status_code === 'DEFERRED')
          .map((r) => r.task_code as string);

        if (naTaskIds.length > 0) {
          const naPlaceholders = naTaskIds.map(() => '?').join(',');
          await connection.execute(
            `UPDATE upa_work_order_tasks SET status = 'N_A_STRUCTURAL'
             WHERE work_order_id = ? AND task_id IN (${naPlaceholders})`,
            [workOrderResult.workOrderId, ...naTaskIds]
          );
        }
        if (deferredTaskIds.length > 0) {
          const deferredPlaceholders = deferredTaskIds.map(() => '?').join(',');
          await connection.execute(
            `UPDATE upa_work_order_tasks SET status = 'DEFERRED_FINANCIAL'
             WHERE work_order_id = ? AND task_id IN (${deferredPlaceholders})`,
            [workOrderResult.workOrderId, ...deferredTaskIds]
          );
        }

        await connection.commit();

        // Notify responsable asynchronously
        const createdByUserId = movement.created_by_user_id as number | null;
        if (createdByUserId) {
          NotificationService.dispatch({
            userId: createdByUserId,
            type: ArchonNotificationType.MAINTENANCE_ALERT,
            priority: ArchonNotificationPriority.MEDIUM,
            title: 'Orden Aceptada por el Técnico',
            message: `El técnico ${
              movement.technician as string
            } aceptó la orden para la unidad ${unitId}. Proceso UPA iniciado.`,
            metadata: { uuid, unitId, workOrderId: workOrderResult.workOrderId },
          }).catch((err: unknown) => {
            fastify.log.warn({ err }, 'accept notification non-fatal');
          });
        }

        return reply.send({
          success: true,
          message: 'Orden aceptada. Proceso UPA iniciado.',
          workOrderId: workOrderResult.workOrderId,
        });
      } catch (error) {
        await connection.rollback();
        fastify.log.error(error);
        return reply.code(500).send({ success: false, message: (error as Error).message });
      } finally {
        connection.release();
      }
    }
  );

  /**
   * PATCH /v1/maintenance/:uuid/reject — Technician rejects an OPEN maintenance order.
   *
   * Order stays OPEN, technician is cleared so responsable can reassign.
   * Notifies responsable.
   */
  fastify.patch(
    '/maintenance/:uuid/reject',
    { preHandler: [requirePermission('fleet:write')] },
    async (request, reply) => {
      const connection = await db.getConnection();
      try {
        await connection.beginTransaction();
        const { uuid } = request.params as { uuid: string };

        const [movements] = await connection.execute<RowDataPacket[]>(
          `SELECT fm.id, fm.unit_id, fm.status, fm.created_by_user_id,
                  fme.technician
           FROM fleet_movements fm
           JOIN fleet_maintenance_extensions fme ON fme.movement_id = fm.id
           WHERE fm.uuid = ? AND fm.movement_type = 'MAINTENANCE' FOR UPDATE`,
          [uuid]
        );
        if (movements.length === 0) {
          await connection.rollback();
          return reply.code(404).send({ success: false, message: 'Orden no encontrada' });
        }
        const movement = movements[0];
        if (movement.status !== MOVEMENT_STATUS.OPEN) {
          await connection.rollback();
          return reply.code(409).send({
            success: false,
            message: `No se puede rechazar: la orden está en estado ${movement.status as string}`,
          });
        }

        const rejectedByTech = movement.technician as string;
        const unitId = movement.unit_id as string;

        // Clear technician so responsable can reassign
        await connection.execute(
          `UPDATE fleet_maintenance_extensions SET technician = NULL WHERE movement_id = ?`,
          [movement.id]
        );

        await connection.commit();

        // Clear outbox so CRON can re-alert if order stays OPEN after rejection
        purgeOutboxForOrder(uuid).catch(() => {
          // Outbox purge failure is non-fatal per zero-noise policy
        });

        // Notify responsable asynchronously
        const createdByUserId = movement.created_by_user_id as number | null;
        if (createdByUserId) {
          NotificationService.dispatch({
            userId: createdByUserId,
            type: ArchonNotificationType.MAINTENANCE_ALERT,
            priority: ArchonNotificationPriority.HIGH,
            title: 'Orden Rechazada — Reasignación Requerida',
            message: `El técnico ${rejectedByTech} rechazó la orden para la unidad ${unitId}. Por favor reasigna un técnico disponible.`,
            metadata: { uuid, unitId },
          }).catch((err: unknown) => {
            fastify.log.warn({ err }, 'reject notification non-fatal');
          });
        }

        return reply.send({
          success: true,
          message: 'Orden rechazada. Técnico liberado para reasignación.',
        });
      } catch (error) {
        await connection.rollback();
        fastify.log.error(error);
        return reply.code(500).send({ success: false, message: (error as Error).message });
      } finally {
        connection.release();
      }
    }
  );
}

export default fleetMaintenanceRoutes;
