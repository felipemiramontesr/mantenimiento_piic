import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import requirePermission from '../middleware/requirePermission';
import * as FleetMaintenanceService from '../services/fleetMaintenance.service';
import * as FleetMaintenanceTemplate from '../services/fleetMaintenanceTemplate.service';
import * as FleetMaintenanceWrites from '../services/fleetMaintenanceWrites.service';
import * as FleetMaintenanceLifecycle from '../services/fleetMaintenanceLifecycle.service';
import type { MaintenanceUser } from '../services/fleetMaintenance.service';

/**
 * FC156 F1 — Route→Service→Repository. Zero SQL (I1): auth/permission
 * guards + Zod validation + HTTP status codes stay here; business logic
 * lives in `services/fleetMaintenance.service.ts`, all SQL in
 * `services/fleetMaintenance.repository.ts` (I3). Handlers extracted to
 * named top-level functions (Gate 1 max-lines-per-function), same pattern
 * as `finance.ts`/`auth.ts`/`fleetRoutes.ts`.
 */

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

function requestUser(request: FastifyRequest): MaintenanceUser {
  return request.user as MaintenanceUser;
}

// ─── Handlers — reads ───────────────────────────────────────────────────────────

/** GET /v1/maintenance — Cursor-paginated history (includes ACTIVE movements). */
async function handleListHistory(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    const { cursor, limit } = request.query as { cursor?: string; limit?: string };
    const result = await FleetMaintenanceService.listMaintenanceHistory(requestUser(request), {
      cursor,
      limit,
    });
    reply.send({ success: true, data: result.data, nextCursor: result.nextCursor });
  } catch (error) {
    request.log.error(error);
    reply.code(500).send({ success: false, message: 'Error retrieving maintenance logs' });
  }
}

/** GET /v1/maintenance/template/:unitId — Generate checklist for a unit. */
async function handleGetTemplate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    const { unitId } = request.params as { unitId: string };
    const { serviceType, odometer } = request.query as { serviceType?: string; odometer?: string };
    const tasks = await FleetMaintenanceTemplate.getMaintenanceTemplate(
      requestUser(request),
      unitId,
      { serviceType, odometer }
    );
    if (tasks === null) {
      reply.code(404).send({ success: false, message: 'Unit not found' });
      return;
    }
    reply.send({ success: true, tasks });
  } catch (error) {
    request.log.error(error);
    reply.code(500).send({ success: false, message: 'Template generation failed' });
  }
}

/** GET /v1/maintenance/forecast — Per-unit next service forecast (computed, no DB write). */
async function handleGetForecast(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    const data = await FleetMaintenanceService.getMaintenanceForecast(requestUser(request));
    reply.send({ success: true, data });
  } catch (error) {
    request.log.error(error);
    reply.code(500).send({ success: false, message: 'Forecast generation failed' });
  }
}

/** GET /v1/maintenance/:uuid — Full detail of a single maintenance order with tasks. */
async function handleGetOrder(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    const { uuid } = request.params as { uuid: string };
    const data = await FleetMaintenanceService.getMaintenanceOrder(requestUser(request), uuid);
    if (data === null) {
      reply.code(404).send({ success: false, message: 'Order not found' });
      return;
    }
    reply.send({ success: true, data });
  } catch (error) {
    request.log.error(error);
    reply.code(500).send({ success: false, message: 'Error retrieving order detail' });
  }
}

/** GET /v1/maintenance/:uuid/node — Sovereign node: full maintenance order with unit context. */
async function handleGetOrderNode(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    const { uuid } = request.params as { uuid: string };
    const data = await FleetMaintenanceService.getMaintenanceOrderNode(requestUser(request), uuid);
    if (data === null) {
      reply.code(404).send({ success: false, message: 'Orden no encontrada' });
      return;
    }
    reply.send({ success: true, data });
  } catch (error) {
    request.log.error(error);
    reply.code(500).send({ success: false, message: 'Error al cargar nodo de mantenimiento' });
  }
}

// ─── Handlers — writes ──────────────────────────────────────────────────────────

function sendIntakeOrCompleteError(
  request: FastifyRequest,
  reply: FastifyReply,
  error: unknown
): void {
  request.log.error(error);
  if (error instanceof FleetMaintenanceWrites.CatalogMappingError) {
    reply.code(400).send({
      success: false,
      code: 'VALIDATION_ERROR',
      message: error.message,
      field: 'serviceType',
    });
    return;
  }
  reply.code(400).send({ success: false, message: (error as Error).message });
}

/**
 * POST /v1/maintenance — Hybrid intake (Option C)
 *
 * is_in_progress = false → COMPLETED immediately (quick log / in-situ)
 * is_in_progress = true  → ACTIVE movement + unit locked to Downtime
 */
async function handleCreateMaintenance(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const data = createMaintenanceSchema.parse(request.body);
    const requestingUser = request.user as { id: number };
    const result = await FleetMaintenanceWrites.createMaintenance(
      requestUser(request),
      requestingUser.id,
      data
    );
    reply.code(201).send({
      success: true,
      message: result.message,
      uuid: result.uuid,
      movement_status: result.movementStatus,
    });
  } catch (error) {
    sendIntakeOrCompleteError(request, reply, error);
  }
}

/**
 * PATCH /v1/maintenance/:uuid/complete — Close an ACTIVE maintenance order
 *
 * Receives final telemetry, closes the movement, releases unit to Disponible.
 */
async function handleCompleteMaintenance(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const { uuid } = request.params as { uuid: string };
    const data = completeMaintenanceSchema.parse(request.body);
    const result = await FleetMaintenanceLifecycle.completeMaintenance(
      requestUser(request),
      uuid,
      data
    );
    reply.send({
      success: true,
      message: result.message,
      uuid: result.uuid,
      movement_status: result.movementStatus,
    });
  } catch (error) {
    sendIntakeOrCompleteError(request, reply, error);
  }
}

function sendAcceptOrRejectError(reply: FastifyReply, error: unknown): void {
  if (error instanceof FleetMaintenanceLifecycle.FleetMaintenanceServiceError) {
    if (error.code === 'NOT_FOUND') {
      reply.code(404).send({ success: false, message: error.message });
      return;
    }
    reply.code(409).send({ success: false, message: error.message });
    return;
  }
  reply.code(500).send({ success: false, message: (error as Error).message });
}

/**
 * PATCH /v1/maintenance/:uuid/accept — Technician accepts an OPEN maintenance order.
 *
 * Transitions OPEN → ACTIVE, locks unit, creates UPA work order, notifies responsable.
 * Returns { workOrderId } so the frontend can navigate directly to the UPA panel.
 */
async function handleAcceptMaintenance(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const { uuid } = request.params as { uuid: string };
    const result = await FleetMaintenanceLifecycle.acceptMaintenance(uuid, (err: unknown) => {
      request.log.warn({ err }, 'accept notification non-fatal');
    });
    reply.send({
      success: true,
      message: 'Orden aceptada. Proceso UPA iniciado.',
      workOrderId: result.workOrderId,
    });
  } catch (error) {
    if (!(error instanceof FleetMaintenanceLifecycle.FleetMaintenanceServiceError)) {
      request.log.error(error);
    }
    sendAcceptOrRejectError(reply, error);
  }
}

/**
 * PATCH /v1/maintenance/:uuid/reject — Technician rejects an OPEN maintenance order.
 *
 * Order stays OPEN, technician is cleared so responsable can reassign.
 * Notifies responsable.
 */
async function handleRejectMaintenance(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const { uuid } = request.params as { uuid: string };
    await FleetMaintenanceLifecycle.rejectMaintenance(uuid, (err: unknown) => {
      request.log.warn({ err }, 'reject notification non-fatal');
    });
    reply.send({
      success: true,
      message: 'Orden rechazada. Técnico liberado para reasignación.',
    });
  } catch (error) {
    if (!(error instanceof FleetMaintenanceLifecycle.FleetMaintenanceServiceError)) {
      request.log.error(error);
    }
    sendAcceptOrRejectError(reply, error);
  }
}

// ─── Routes ───────────────────────────────────────────────────────────────────

/** Registers the 9 `/maintenance/*` endpoints — JWT + permission guards, zero SQL (I1). */
export async function fleetMaintenanceRoutes(fastify: FastifyInstance): Promise<void> {
  // Security Hook — A01:2021 Broken Access Control
  fastify.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      reply.code(401).send({ success: false, code: 'UNAUTHORIZED', message: 'Session required' });
    }
  });
  fastify.addHook('preHandler', requirePermission('maint:record:view:any'));

  fastify.get('/maintenance', handleListHistory);
  fastify.get('/maintenance/template/:unitId', handleGetTemplate);
  fastify.get('/maintenance/forecast', handleGetForecast);
  fastify.get('/maintenance/:uuid', handleGetOrder);
  fastify.get('/maintenance/:uuid/node', handleGetOrderNode);

  fastify.post(
    '/maintenance',
    { preHandler: [requirePermission('maint:record:create')] },
    handleCreateMaintenance
  );
  fastify.patch(
    '/maintenance/:uuid/complete',
    { preHandler: [requirePermission('maint:record:edit:any')] },
    handleCompleteMaintenance
  );
  fastify.patch(
    '/maintenance/:uuid/accept',
    { preHandler: [requirePermission('fleet:unit:edit:any')] },
    handleAcceptMaintenance
  );
  fastify.patch(
    '/maintenance/:uuid/reject',
    { preHandler: [requirePermission('fleet:unit:edit:any')] },
    handleRejectMaintenance
  );
}

export default fleetMaintenanceRoutes;
