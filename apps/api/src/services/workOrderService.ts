import { RowDataPacket, ResultSetHeader } from 'mysql2';
import db from './db';
import {
  Brand,
  FuelType,
  FleetType,
  TaskStage,
  PackageLevel,
  WorkOrder,
  HistoricalTask,
  DeferredType,
  calculateUpaOrder,
  checkStage5Timeout,
} from './upaEngine';

// ============================================================================
// TYPES
// ============================================================================

export interface CreateWorkOrderResult {
  workOrderId: number;
  uuid: string;
  taskCount: number;
}

export interface PreviewWorkOrderResult {
  vehicleId: string;
  odometer: number;
  tasks: Array<{
    id: string;
    stage: TaskStage;
    description: string;
    packageLevel: PackageLevel | null;
  }>;
}

export interface UpdateTaskStatusInput {
  status: 'pending' | 'completed' | 'DEFERRED_FINANCIAL' | 'N_A_STRUCTURAL';
  evidenceUrls?: string[];
  evidenceNotes?: string;
}

export interface WorkOrderTaskDetail {
  taskId: string;
  stage: TaskStage;
  packageLevel: PackageLevel | null;
  description: string;
  status: 'pending' | 'completed' | 'DEFERRED_FINANCIAL' | 'N_A_STRUCTURAL';
  evidenceUrls: string[] | null;
  evidenceNotes: string | null;
  completedAt: Date | null;
}

export interface WorkOrderDetail {
  id: number;
  uuid: string;
  vehicleId: string;
  fleetType: FleetType;
  status: 'IN_PROGRESS' | 'AWAITING_AUTH' | 'CLOSED';
  pendingSince: Date | null;
  openedAt: Date;
  closedAt: Date | null;
  tasks: WorkOrderTaskDetail[];
}

// ============================================================================
// CATALOG MAPPERS
// ============================================================================

function mapBrandLabel(label: string | null | undefined): Brand {
  if (!label) return 'generic';
  const normalized = label.toLowerCase().replace(/[\s-]+/g, '_');
  if (normalized.includes('toyota')) return 'toyota';
  if (normalized.includes('kia')) return 'kia';
  if (normalized.includes('nissan')) return 'nissan';
  if (normalized.includes('mitsubishi')) return 'mitsubishi';
  if (normalized.includes('dodge') || normalized.includes('ram')) return 'dodge_ram';
  return 'generic';
}

const MINE_INTERVAL_KM = 5000;

function mapFuelCode(code: string | null | undefined): FuelType {
  return code === 'F_DIESEL' ? 'diesel' : 'gasoline';
}

function deriveFleetType(maintIntervalKm: number | null | undefined): FleetType {
  return maintIntervalKm === MINE_INTERVAL_KM ? 'mining' : 'urban';
}

// ============================================================================
// QUERY HELPERS
// ============================================================================

interface VehicleRow extends RowDataPacket {
  id: string;
  odometer: number;
  brandLabel: string | null;
  fuelTypeCode: string | null;
  maintIntervalKm: number | null;
  lastServiceReading: number | null;
}

interface WorkOrderRow extends RowDataPacket {
  id: number;
  task_id: string;
  executed: number;
  deferred_type: string | null;
  closed_at: Date;
  pending_since: Date | null;
}

async function fetchVehicleProfile(vehicleId: string): Promise<{
  id: string;
  odometer: number;
  brand: Brand;
  fuelType: FuelType;
  fleetType: FleetType;
  lastServiceReading: number | null;
} | null> {
  const [rows] = await db.execute<VehicleRow[]>(
    `SELECT
       f.id,
       COALESCE(f.odometer, 0) AS odometer,
       f.lastServiceReading,
       f.maintIntervalKm,
       c_brand.label AS brandLabel,
       c_ft.code     AS fuelTypeCode
     FROM fleet_units f
     LEFT JOIN common_catalogs c_brand
       ON c_brand.id = f.brandId AND c_brand.category = 'BRAND'
     LEFT JOIN common_catalogs c_ft
       ON c_ft.id = f.fuelTypeId AND c_ft.category = 'FUEL'
     WHERE f.id = ?`,
    [vehicleId]
  );

  if (rows.length === 0) return null;
  const row = rows[0];
  return {
    id: row.id,
    odometer: row.odometer,
    brand: mapBrandLabel(row.brandLabel),
    fuelType: mapFuelCode(row.fuelTypeCode),
    fleetType: deriveFleetType(row.maintIntervalKm),
    lastServiceReading: row.lastServiceReading,
  };
}

async function fetchLastClosedWorkOrder(vehicleId: string): Promise<WorkOrder | null> {
  const [rows] = await db.execute<WorkOrderRow[]>(
    `SELECT
       wo.id,
       wo.closed_at,
       wo.pending_since,
       t.task_id,
       (t.status = 'completed') AS executed,
       CASE WHEN t.status IN ('DEFERRED_FINANCIAL','N_A_STRUCTURAL') THEN t.status ELSE NULL END AS deferred_type
     FROM upa_work_orders wo
     JOIN upa_work_order_tasks t ON t.work_order_id = wo.id
     WHERE wo.vehicle_id = ? AND wo.status = 'CLOSED'
     ORDER BY wo.closed_at DESC
     LIMIT 200`,
    [vehicleId]
  );

  if (rows.length === 0) return null;

  const first = rows[0];
  const tasks: HistoricalTask[] = rows.map((r) => ({
    taskId: r.task_id,
    executed: r.executed === 1,
    deferredType: (r.deferred_type as DeferredType | null) ?? undefined,
  }));

  return {
    id: String(first.id),
    closedAt: first.closed_at,
    pendingSince: first.pending_since ?? undefined,
    tasks,
  };
}

// ============================================================================
// PUBLIC SERVICE FUNCTIONS
// ============================================================================

export async function createWorkOrder(vehicleId: string): Promise<CreateWorkOrderResult> {
  const vehicle = await fetchVehicleProfile(vehicleId);
  if (!vehicle) {
    throw new Error(`VEHICLE_NOT_FOUND: vehicleId '${vehicleId}' does not exist`);
  }

  const lastClosedWorkOrder = await fetchLastClosedWorkOrder(vehicleId);

  const output = calculateUpaOrder({
    vehicleProfile: {
      brand: vehicle.brand,
      fuelType: vehicle.fuelType,
      fleetType: vehicle.fleetType,
      odometer: vehicle.odometer,
    },
    lastClosedWorkOrder,
    lastServiceOdometer: vehicle.lastServiceReading ?? undefined,
  });

  if (output.validationErrors.length > 0) {
    throw new Error(`VALIDATION_ERROR: ${output.validationErrors.join(', ')}`);
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [woResult] = await connection.execute<ResultSetHeader>(
      `INSERT INTO upa_work_orders (uuid, vehicle_id, fleet_type, status, opened_at)
       VALUES (UUID(), ?, ?, 'IN_PROGRESS', NOW())`,
      [vehicleId, vehicle.fleetType]
    );

    const workOrderId = woResult.insertId;

    if (output.tasks.length > 0) {
      const placeholders = output.tasks.map(() => '(?, ?, ?, ?, ?, ?)').join(', ');
      const values = output.tasks.flatMap((t) => [
        workOrderId,
        t.id,
        t.stage,
        t.packageLevel ?? null,
        t.description,
        'pending',
      ]);
      await connection.execute(
        `INSERT INTO upa_work_order_tasks (work_order_id, task_id, stage, package_level, description, status)
         VALUES ${placeholders}`,
        values
      );
    }

    const [[uuidRow]] = await connection.execute<RowDataPacket[]>(
      'SELECT uuid FROM upa_work_orders WHERE id = ?',
      [workOrderId]
    );

    await connection.commit();
    connection.release();
    return {
      workOrderId,
      uuid: (uuidRow as RowDataPacket).uuid as string,
      taskCount: output.tasks.length,
    };
  } catch (error) {
    await connection.rollback();
    connection.release();
    throw error;
  }
}

export async function previewWorkOrder(vehicleId: string): Promise<PreviewWorkOrderResult> {
  const vehicle = await fetchVehicleProfile(vehicleId);
  if (!vehicle) {
    throw new Error(`VEHICLE_NOT_FOUND: vehicleId '${vehicleId}' does not exist`);
  }

  const lastClosedWorkOrder = await fetchLastClosedWorkOrder(vehicleId);

  const output = calculateUpaOrder({
    vehicleProfile: {
      brand: vehicle.brand,
      fuelType: vehicle.fuelType,
      fleetType: vehicle.fleetType,
      odometer: vehicle.odometer,
    },
    lastClosedWorkOrder,
    lastServiceOdometer: vehicle.lastServiceReading ?? undefined,
  });

  return {
    vehicleId: vehicle.id,
    odometer: vehicle.odometer,
    tasks: output.tasks.map((t) => ({
      id: t.id,
      stage: t.stage,
      description: t.description,
      packageLevel: t.packageLevel ?? null,
    })),
  };
}

export async function updateTaskStatus(
  workOrderId: number,
  taskId: string,
  update: UpdateTaskStatusInput
): Promise<void> {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [existing] = await connection.execute<RowDataPacket[]>(
      'SELECT id FROM upa_work_order_tasks WHERE work_order_id = ? AND task_id = ?',
      [workOrderId, taskId]
    );
    if ((existing as RowDataPacket[]).length === 0) {
      throw new Error(`TASK_NOT_FOUND: taskId '${taskId}' not found in work order ${workOrderId}`);
    }

    const completedAt = update.status === 'completed' ? 'NOW()' : 'NULL';
    await connection.execute(
      `UPDATE upa_work_order_tasks
       SET status = ?,
           evidence_urls = ?,
           evidence_notes = ?,
           completed_at = ${completedAt}
       WHERE work_order_id = ? AND task_id = ?`,
      [
        update.status,
        update.evidenceUrls ? JSON.stringify(update.evidenceUrls) : null,
        update.evidenceNotes ?? null,
        workOrderId,
        taskId,
      ]
    );

    if (update.status === 'DEFERRED_FINANCIAL' || update.status === 'N_A_STRUCTURAL') {
      await connection.execute(
        `UPDATE upa_work_orders
         SET status = 'AWAITING_AUTH', pending_since = COALESCE(pending_since, NOW())
         WHERE id = ? AND status = 'IN_PROGRESS'`,
        [workOrderId]
      );
    }

    await connection.commit();
    connection.release();
  } catch (error) {
    await connection.rollback();
    connection.release();
    throw error;
  }
}

export async function closeWorkOrder(workOrderId: number): Promise<void> {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [wo] = await connection.execute<RowDataPacket[]>(
      'SELECT id, status FROM upa_work_orders WHERE id = ?',
      [workOrderId]
    );
    if ((wo as RowDataPacket[]).length === 0) {
      throw new Error(`WORK_ORDER_NOT_FOUND: workOrderId ${workOrderId} does not exist`);
    }
    const currentStatus = ((wo as RowDataPacket[])[0] as RowDataPacket).status as string;
    if (currentStatus === 'CLOSED') {
      throw new Error(`ALREADY_CLOSED: workOrderId ${workOrderId} is already closed`);
    }

    await connection.execute(
      `UPDATE upa_work_orders SET status = 'CLOSED', closed_at = NOW() WHERE id = ?`,
      [workOrderId]
    );

    // Any remaining pending tasks on close become DEFERRED_FINANCIAL (financial deferral)
    await connection.execute(
      `UPDATE upa_work_order_tasks
       SET status = 'DEFERRED_FINANCIAL'
       WHERE work_order_id = ? AND status = 'pending'`,
      [workOrderId]
    );

    await connection.commit();
    connection.release();
  } catch (error) {
    await connection.rollback();
    connection.release();
    throw error;
  }
}

export async function checkAndTimeoutStage5Orders(): Promise<void> {
  const [orders] = await db.execute<RowDataPacket[]>(
    `SELECT id, pending_since FROM upa_work_orders
     WHERE status = 'AWAITING_AUTH' AND pending_since IS NOT NULL`,
    []
  );

  if ((orders as RowDataPacket[]).length === 0) return;

  const now = new Date();
  const timedOut = (orders as RowDataPacket[]).filter((r) =>
    checkStage5Timeout(new Date((r as RowDataPacket).pending_since as Date), now)
  );

  if (timedOut.length === 0) return;

  const ids = timedOut.map((r) => (r as RowDataPacket).id as number);
  const placeholders = ids.map(() => '?').join(', ');
  await db.execute(
    `UPDATE upa_work_orders SET status = 'CLOSED', closed_at = NOW()
     WHERE id IN (${placeholders})`,
    ids
  );
}

export async function getWorkOrder(workOrderId: number): Promise<WorkOrderDetail | null> {
  const [rows] = await db.execute<RowDataPacket[]>(
    `SELECT
       wo.id, wo.uuid, wo.vehicle_id, wo.fleet_type, wo.status,
       wo.pending_since, wo.opened_at, wo.closed_at,
       t.task_id, t.stage, t.package_level, t.description,
       t.status AS task_status, t.evidence_urls,
       t.evidence_notes, t.completed_at
     FROM upa_work_orders wo
     LEFT JOIN upa_work_order_tasks t ON t.work_order_id = wo.id
     WHERE wo.id = ?
     ORDER BY t.id ASC`,
    [workOrderId]
  );

  if ((rows as RowDataPacket[]).length === 0) return null;

  const first = (rows as RowDataPacket[])[0] as RowDataPacket;
  const tasks: WorkOrderTaskDetail[] = (rows as RowDataPacket[])
    .filter((r) => (r as RowDataPacket).task_id != null)
    .map((r) => ({
      taskId: r.task_id as string,
      stage: r.stage as TaskStage,
      packageLevel: (r.package_level as PackageLevel | null) ?? null,
      description: r.description as string,
      status: r.task_status as 'pending' | 'completed' | 'DEFERRED_FINANCIAL' | 'N_A_STRUCTURAL',
      evidenceUrls: r.evidence_urls ? (JSON.parse(r.evidence_urls as string) as string[]) : null,
      evidenceNotes: (r.evidence_notes as string | null) ?? null,
      completedAt: (r.completed_at as Date | null) ?? null,
    }));

  return {
    id: first.id as number,
    uuid: first.uuid as string,
    vehicleId: first.vehicle_id as string,
    fleetType: first.fleet_type as FleetType,
    status: first.status as 'IN_PROGRESS' | 'AWAITING_AUTH' | 'CLOSED',
    pendingSince: (first.pending_since as Date | null) ?? null,
    openedAt: first.opened_at as Date,
    closedAt: (first.closed_at as Date | null) ?? null,
    tasks,
  };
}
