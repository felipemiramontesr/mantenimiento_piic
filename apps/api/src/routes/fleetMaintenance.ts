import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import crypto from 'crypto';
import db from '../services/db';

// ─── Enums ────────────────────────────────────────────────────────────────────

const SERVICE_TYPE_ENUM = [
  'BASIC_10K',
  'INTERMEDIATE_20K',
  'MAJOR_30K',
  'ADVANCED_50K',
  'MINOR_MINING',
] as const;

type ServiceType = (typeof SERVICE_TYPE_ENUM)[number];
type MovementStatus = 'OPEN' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

// ─── Schemas ──────────────────────────────────────────────────────────────────

const detailSchema = z.object({
  taskCode: z.string().min(1).max(50),
  status: z.string().min(1).max(50),
  notes: z.string().max(255).optional().nullable(),
});

/**
 * Hybrid intake schema — service type is computed server-side from odometry.
 * is_in_progress = false → immediate COMPLETED registration (in-situ)
 * is_in_progress = true  → opens ACTIVE movement + locks unit to Downtime
 */
const createMaintenanceSchema = z.object({
  unitId: z.string().min(2).max(50),
  serviceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  odometerAtService: z.number().min(0),
  cost: z.number().min(0).default(0),
  technician: z.string().min(2).max(100),
  details: z.array(detailSchema).default([]),
  is_in_progress: z.boolean().default(false),
});

/**
 * Completion schema — service type recomputed from final odometry.
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
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Cyclic service type engine — canonical rule for Archon fleet.
 * Applies mod-60,000 km residue with strict ±1,000 km tolerance windows.
 * Mine units (maintIntervalKm === 5000) fill non-agency midpoints with MINOR_MINING.
 * Agency units fall back to the nearest agency milestone.
 */
function computeServiceType(odometer: number, maintIntervalKm: number | string): ServiceType {
  if (!odometer || odometer <= 0) return 'BASIC_10K';
  const residuo = odometer % 60000;
  const isMineUnit = Number(maintIntervalKm) === 5000;

  if (residuo <= 1000 || residuo >= 59000) return 'ADVANCED_50K';
  if (residuo >= 49000 && residuo <= 51000) return 'ADVANCED_50K';
  if (residuo >= 29000 && residuo <= 41000) return 'MAJOR_30K';
  if (residuo >= 19000 && residuo <= 21000) return 'INTERMEDIATE_20K';
  if (residuo >= 9000 && residuo <= 11000) return 'BASIC_10K';

  if (isMineUnit) return 'MINOR_MINING';

  const milestones: { type: ServiceType; value: number }[] = [
    { type: 'BASIC_10K', value: 10000 },
    { type: 'INTERMEDIATE_20K', value: 20000 },
    { type: 'MAJOR_30K', value: 30000 },
    { type: 'MAJOR_30K', value: 40000 },
    { type: 'ADVANCED_50K', value: 50000 },
  ];
  let best: ServiceType = 'BASIC_10K';
  let minDist = Infinity;
  milestones.forEach((m) => {
    const dist = Math.abs(residuo - m.value);
    if (dist < minDist) {
      minDist = dist;
      best = m.type;
    }
  });
  return best;
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
  details: Array<{ taskCode: string; status: string }>
): Promise<void> {
  const [unitRows] = await connection.execute<RowDataPacket[]>(
    'SELECT odometer FROM fleet_units WHERE id = ?',
    [unitId]
  );
  const currentOdometer = Number((unitRows[0] as RowDataPacket).odometer || 0);

  // Number() casting prevents string concatenation bug (ASM-021 incident)
  const nextServiceReading = Number(odometerAtService) + Number(maintIntervalKm || 10000);
  const finalOdometer = Math.max(currentOdometer, Number(odometerAtService));

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
    ['status', 'Disponible'],
  ];
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

function buildCascadeServiceTypes(resolvedType: ServiceType, isMineUnit: boolean): string[] {
  const types: string[] = [];
  if (resolvedType === 'ADVANCED_50K') {
    types.push('ADVANCED_50K', 'MAJOR_30K', 'INTERMEDIATE_20K', 'BASIC_10K');
  } else if (resolvedType === 'MAJOR_30K') {
    types.push('MAJOR_30K', 'INTERMEDIATE_20K', 'BASIC_10K');
  } else if (resolvedType === 'INTERMEDIATE_20K') {
    types.push('INTERMEDIATE_20K', 'BASIC_10K');
  } else {
    types.push(resolvedType);
  }
  if (isMineUnit && !types.includes('MINOR_MINING')) types.push('MINOR_MINING');
  return types;
}

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

function applyMiningFuelFilter(tasks: TemplateTask[], fuelTypeId: number): void {
  if (fuelTypeId === 11) {
    const idx = tasks.findIndex((t) => t.code === 'WATER_SEPARATOR_MINING');
    if (idx !== -1) tasks.splice(idx, 1);
  } else if (fuelTypeId === 10) {
    const idx = tasks.findIndex((t) => t.code === 'CABIN_FILTER_MINING');
    if (idx !== -1) tasks.splice(idx, 1);
  }
}

function appendPredictiveAlerts(
  tasks: TemplateTask[],
  currentOdometer: number,
  lastChassisOdo: number,
  lastDistOdo: number
): void {
  if (currentOdometer - lastChassisOdo >= 80000) {
    tasks.push({
      code: 'CHASSIS_SHOCKS_HEAVY',
      label: 'Inspección de chasis pesado y amortiguadores (Alerta Predictiva Delta)',
      isCritical: true,
      isDeferredCarry: false,
    });
  }
  if (currentOdometer - lastDistOdo >= 100000) {
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
  // GET /v1/maintenance — Cursor-paginated history (includes ACTIVE movements)
  fastify.get('/maintenance', async (request, reply) => {
    try {
      const { cursor, limit = '50' } = request.query as { cursor?: string; limit?: string };
      const parsedLimit = parseInt(limit, 10);
      let query = `
        SELECT
          fm.id, fm.uuid, fm.unit_id, fm.status AS movement_status,
          fme.service_date,
          fm.start_reading AS odometer_at_service,
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
  fastify.get('/maintenance/template/:unitId', async (request, reply) => {
    try {
      const { unitId } = request.params as { unitId: string };
      const { serviceType, odometer } = request.query as {
        serviceType?: string;
        odometer?: string;
      };
      const [units] = await db.execute<RowDataPacket[]>(
        `SELECT brandId, fuelTypeId, maintIntervalKm, odometer,
                last_chassis_inspection_odometer, last_distribution_change_odometer
         FROM fleet_units WHERE id = ?`,
        [unitId]
      );
      if (units.length === 0) {
        return reply.code(404).send({ success: false, message: 'Unit not found' });
      }
      const unit = units[0];
      const currentOdometer =
        odometer !== undefined ? Number(odometer) : Number(unit.odometer || 0);
      const isMineUnit = Number(unit.maintIntervalKm) === 5000;
      const resolvedType: ServiceType =
        (serviceType as ServiceType | undefined) ??
        computeServiceType(currentOdometer, unit.maintIntervalKm);

      // Cascada jerárquica: acumulación de paquetes por hito
      const serviceTypes = buildCascadeServiceTypes(resolvedType, isMineUnit);

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

      if (isMineUnit) applyMiningFuelFilter(tasks, Number(unit.fuelTypeId));

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
                fme.service_date, fm.start_reading AS odometer_at_service,
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

  /**
   * POST /v1/maintenance — Hybrid intake (Option C)
   *
   * is_in_progress = false → COMPLETED immediately (quick log / in-situ)
   * is_in_progress = true  → ACTIVE movement + unit locked to Downtime
   */
  fastify.post('/maintenance', async (request, reply) => {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      const data = createMaintenanceSchema.parse(request.body);
      const logUuid = crypto.randomUUID();

      const [units] = await connection.execute<RowDataPacket[]>(
        'SELECT id, odometer, maintIntervalKm, status FROM fleet_units WHERE id = ? FOR UPDATE',
        [data.unitId]
      );
      if (units.length === 0) throw new Error('Fleet unit not found');
      const unit = units[0];
      const serviceType = computeServiceType(data.odometerAtService, unit.maintIntervalKm);

      const movementStatus: MovementStatus = data.is_in_progress ? 'ACTIVE' : 'COMPLETED';

      // 1. Insert CTI base record
      const [movementResult] = await connection.execute<ResultSetHeader>(
        `INSERT INTO fleet_movements
          (uuid, unit_id, movement_type, status, start_reading, start_at${
            data.is_in_progress ? '' : ', end_at'
          })
         VALUES (?, ?, 'MAINTENANCE', ?, ?, ?${data.is_in_progress ? '' : ', NOW()'})`,
        [logUuid, data.unitId, movementStatus, data.odometerAtService, data.serviceDate]
      );
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
          'FULL_COMPLIANCE',
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
        // 4a. Lock unit → Downtime (blocks route dispatch)
        await connection.execute(
          `UPDATE fleet_units SET status = 'Downtime', updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
          [data.unitId]
        );
        await connection.commit();
        return reply.code(201).send({
          success: true,
          message: 'Maintenance order opened. Unit locked to Downtime.',
          uuid: logUuid,
          movement_status: 'ACTIVE',
        });
      }
      // 4b. Apply completion immediately (in-situ / historical log)
      await applyMaintenanceCompletionToUnit(
        connection,
        data.unitId,
        data.odometerAtService,
        data.serviceDate,
        unit.maintIntervalKm,
        data.details
      );
      await connection.commit();
      return reply.code(201).send({
        success: true,
        message: 'Maintenance registered successfully.',
        uuid: logUuid,
        movement_status: 'COMPLETED',
      });
    } catch (error) {
      await connection.rollback();
      fastify.log.error(error);
      return reply.code(400).send({ success: false, message: (error as Error).message });
    } finally {
      connection.release();
    }
  });

  /**
   * PATCH /v1/maintenance/:uuid/complete — Close an ACTIVE maintenance order
   *
   * Receives final telemetry, closes the movement, releases unit to Disponible.
   */
  fastify.patch('/maintenance/:uuid/complete', async (request, reply) => {
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
      if (movement.status !== 'ACTIVE')
        throw new Error(`Cannot complete: order is already ${movement.status}`);

      const unitId = movement.unit_id as string;

      // 2. Close movement
      await connection.execute(
        `UPDATE fleet_movements
         SET status = 'COMPLETED', end_at = NOW(), start_reading = ?
         WHERE uuid = ?`,
        [data.odometerAtService, uuid]
      );

      // 3. Fetch unit interval — drives cyclic service type + completion forecast
      const [unitRows] = await connection.execute<RowDataPacket[]>(
        'SELECT maintIntervalKm FROM fleet_units WHERE id = ?',
        [unitId]
      );
      const maintIntervalKm = (unitRows[0] as RowDataPacket)?.maintIntervalKm ?? 10000;

      const finalServiceDate = data.serviceDate ?? (movement.service_date as string);
      const finalServiceType = computeServiceType(data.odometerAtService, maintIntervalKm);
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
          'FULL_COMPLIANCE',
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

      // 5. Apply unit completion: odometer + forecast + status = Disponible
      await applyMaintenanceCompletionToUnit(
        connection,
        unitId,
        data.odometerAtService,
        finalServiceDate,
        maintIntervalKm,
        data.details
      );

      await connection.commit();
      return reply.send({
        success: true,
        message: 'Maintenance completed. Unit released to Disponible.',
        uuid,
        movement_status: 'COMPLETED',
      });
    } catch (error) {
      await connection.rollback();
      fastify.log.error(error);
      return reply.code(400).send({ success: false, message: (error as Error).message });
    } finally {
      connection.release();
    }
  });
}

export default fleetMaintenanceRoutes;
