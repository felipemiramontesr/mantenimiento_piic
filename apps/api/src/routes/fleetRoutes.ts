import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { routeUpdateSchema } from '@mantenimiento/contracts';
import RouteService from '../services/routeService';
import { CatalogMappingError } from '../services/catalogMapper';
import requirePermission from '../middleware/requirePermission';
import NotificationService, {
  ArchonNotificationType,
  ArchonNotificationPriority,
} from '../services/notification.service';

/**
 * FC126 F1 — zero-SQL route (I1). Ownership-scope resolution and every DB
 * lookup now live in `RouteService`/`routeRoutes.repository.ts` (I2/I3) —
 * `resolveOwnerScope`/`checkRouteScope`/`checkIncidentScope` are no longer
 * defined here (Cond.R-126-S1: scope logic centralized, not duplicated
 * ad-hoc in the route).
 */
const resolveOwnerScope = async (request: FastifyRequest): Promise<number[] | null> =>
  RouteService.resolveOwnerScope(
    request.user as { id: number; permissions?: string[]; tenant_id?: number | null }
  );

const checkRouteScope = (uuid: string, ownerScope: number[] | null): Promise<boolean> =>
  RouteService.checkRouteScope(uuid, ownerScope);

const checkIncidentScope = (uuid: string, ownerScope: number[] | null): Promise<boolean> =>
  RouteService.checkIncidentScope(uuid, ownerScope);

/**
 * 🔱 Archon Fleet Routes — CTI Architecture (V2)
 * All journey queries target fleet_movements + fleet_route_extensions.
 * FC126 F1 — Gate 2 max-lines-per-function:50: each endpoint is a separately
 * declared named handler (below), registered into a thin `fleetRoutes`
 * plugin body — the standard Fastify pattern this budget requires once a
 * route file has more than a couple of endpoints.
 */

const startRouteSchema = z.object({
  unitId: z.string().min(2).max(50),
  driverId: z.number().int(),
  startReading: z.number().min(0),
  fuelLevelStart: z.number().min(0).max(100),
  destination: z.string().min(2).max(255),
  originId: z.number().int().optional(),
  destinationNeighborhoodId: z.number().int().optional(),
  description: z.string().optional(),
});

const finishRouteSchema = z.object({
  endReading: z.number().min(0),
  fuelLevelEnd: z.number().min(0).max(100),
  fuelLitersLoaded: z.number().min(0).optional(),
  fuelAmount: z.number().min(0).optional(),
  fuelTicketImage: z
    .string()
    .max(15 * 1024 * 1024, { message: 'Image size exceeds maximum limit' })
    .optional(),
  additivesCheck: z.boolean().optional(),
  tirePressureJson: z.string().optional(),
  checklistJson: z.string().optional(),
  description: z.string().optional(),
});

const reportIncidentSchema = z.object({
  category: z.enum(['MECANICA', 'SINIESTRO', 'LEGAL', 'OPERATIVA', 'OTRA']),
  description: z.string().min(5),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  evidenceImage: z.string().optional(),
});

const addCheckpointSchema = z.object({
  sequence: z.number().int().min(1).max(255),
  name: z.string().min(1).max(150),
  neighborhoodId: z.number().int().positive().optional(),
  eta: z.string().datetime().optional(),
});

const deleteRouteSchema = z.object({ reason: z.string().min(5) });

/** POST /v1/routes/start */
async function handleStartRoute(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<FastifyReply> {
  try {
    const data = startRouteSchema.parse(request.body);
    const ownerScope = await resolveOwnerScope(request);
    if (!(await RouteService.checkUnitScope(data.unitId, ownerScope))) {
      return reply
        .code(403)
        .send({ success: false, code: 'FORBIDDEN', message: 'Unit outside scoped owners' });
    }
    const routeUuid = await RouteService.startRoute(
      data.unitId,
      data.driverId,
      data.startReading,
      data.fuelLevelStart,
      data.destination,
      data.originId,
      data.description,
      data.destinationNeighborhoodId
    );
    return reply
      .code(201)
      .send({ success: true, message: 'Route started successfully', routeUuid });
  } catch (error) {
    request.log.error(error);
    return reply.code(400).send({ success: false, message: (error as Error).message });
  }
}

/** PATCH /v1/routes/:uuid/finish */
async function handleFinishRoute(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<FastifyReply> {
  try {
    const { uuid } = request.params as { uuid: string };
    const ownerScope = await resolveOwnerScope(request);
    if (!(await checkRouteScope(uuid, ownerScope))) {
      return reply
        .code(403)
        .send({ success: false, code: 'FORBIDDEN', message: 'Route outside scoped owners' });
    }
    const data = finishRouteSchema.parse(request.body);
    await RouteService.finishRoute(uuid, {
      endReading: data.endReading,
      fuelLevelEnd: data.fuelLevelEnd,
      fuelImage: data.fuelTicketImage,
      fuelLiters: data.fuelLitersLoaded,
      fuelAmount: data.fuelAmount,
      additivesCheck: data.additivesCheck,
      tirePressureJson: data.tirePressureJson,
      checklistJson: data.checklistJson,
      description: data.description,
    });
    return reply.send({ success: true, message: 'Route completed successfully. Unit updated.' });
  } catch (error) {
    request.log.error(error);
    return reply.code(400).send({ success: false, message: (error as Error).message });
  }
}

/** GET /v1/routes/unit/:unitId/active */
async function handleGetActiveRouteByUnit(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<FastifyReply> {
  try {
    const { unitId } = request.params as { unitId: string };
    const ownerScope = await resolveOwnerScope(request);
    if (!(await RouteService.checkUnitScope(unitId, ownerScope))) {
      return reply
        .code(403)
        .send({ success: false, code: 'FORBIDDEN', message: 'Unit outside scoped owners' });
    }
    const activeRoute = await RouteService.getActiveRoute(unitId);
    return reply.send({ success: true, activeRoute });
  } catch {
    return reply.code(400).send({ success: false, message: 'Error fetching active route' });
  }
}

/** GET /v1/routes */
async function handleListRoutes(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<FastifyReply> {
  try {
    const ownerScope = await resolveOwnerScope(request);
    const rows = await RouteService.listRoutes(ownerScope);
    return reply.send({ success: true, data: rows });
  } catch {
    return reply.code(400).send({ success: false, message: 'Error fetching routes' });
  }
}

/** GET /v1/unit-logs */
async function handleListUnitLogs(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<FastifyReply> {
  try {
    const ownerScope = await resolveOwnerScope(request);
    const rows = await RouteService.listUnitActivityLogs(ownerScope);
    return reply.send({ success: true, data: rows });
  } catch (error) {
    request.log.error(error);
    return reply.code(400).send({ success: false, message: 'Error fetching activity logs' });
  }
}

/** POST /v1/routes/:uuid/checkpoints */
async function handleAddCheckpoint(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<FastifyReply> {
  try {
    const { uuid } = request.params as { uuid: string };
    const ownerScope = await resolveOwnerScope(request);
    if (!(await checkRouteScope(uuid, ownerScope))) {
      return reply
        .code(403)
        .send({ success: false, code: 'FORBIDDEN', message: 'Route outside scoped owners' });
    }
    const data = addCheckpointSchema.parse(request.body);
    const id = await RouteService.addCheckpoint(uuid, data);
    return reply.code(201).send({ success: true, data: { id } });
  } catch (error) {
    const msg = (error as Error).message;
    if (msg === 'Route not found')
      return reply.code(404).send({ success: false, code: 'NOT_FOUND', message: msg });
    if (msg.includes('Duplicate entry'))
      return reply.code(409).send({
        success: false,
        code: 'CONFLICT',
        message: 'Sequence already exists for this route',
      });
    request.log.error(error);
    return reply.code(400).send({ success: false, message: msg });
  }
}

/** GET /v1/routes/:uuid/checkpoints */
async function handleListCheckpoints(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<FastifyReply> {
  try {
    const { uuid } = request.params as { uuid: string };
    const ownerScope = await resolveOwnerScope(request);
    if (!(await checkRouteScope(uuid, ownerScope))) {
      return reply
        .code(403)
        .send({ success: false, code: 'FORBIDDEN', message: 'Route outside scoped owners' });
    }
    const checkpoints = await RouteService.getCheckpoints(uuid);
    return reply.send({ success: true, data: checkpoints });
  } catch (error) {
    const msg = (error as Error).message;
    if (msg === 'Route not found')
      return reply.code(404).send({ success: false, code: 'NOT_FOUND', message: msg });
    return reply.code(400).send({ success: false, message: msg });
  }
}

/** PATCH /v1/routes/:uuid/checkpoints/:id/arrive */
async function handleArriveAtCheckpoint(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<FastifyReply> {
  try {
    const { uuid, id } = request.params as { uuid: string; id: string };
    const ownerScope = await resolveOwnerScope(request);
    if (!(await checkRouteScope(uuid, ownerScope))) {
      return reply
        .code(403)
        .send({ success: false, code: 'FORBIDDEN', message: 'Route outside scoped owners' });
    }
    await RouteService.arriveAtCheckpoint(uuid, Number(id));
    return reply.send({ success: true, message: 'Checkpoint marked as visited' });
  } catch (error) {
    const msg = (error as Error).message;
    if (msg === 'Route not found')
      return reply.code(404).send({ success: false, code: 'NOT_FOUND', message: msg });
    if (msg.includes('not found or already visited'))
      return reply.code(404).send({ success: false, code: 'NOT_FOUND', message: msg });
    request.log.error(error);
    return reply.code(400).send({ success: false, message: msg });
  }
}

/** Fire-and-forget transit-supervisor notification for a newly reported incident. */
function dispatchIncidentNotification(
  uuid: string,
  data: z.infer<typeof reportIncidentSchema>
): void {
  NotificationService.dispatch({
    permission: 'route:write',
    type: ArchonNotificationType.SYSTEM,
    priority:
      data.severity === 'CRITICAL'
        ? ArchonNotificationPriority.CRITICAL
        : ArchonNotificationPriority.HIGH,
    title: 'Incidencia reportada',
    message: `Incidencia ${data.severity} reportada en ruta ${uuid}: ${data.category}.`,
    metadata: { uuid, category: data.category, severity: data.severity },
  }).catch(() => {
    // Notification failure is non-fatal per zero-noise policy
  });
}

/** POST /v1/routes/:uuid/incidents */
async function handleReportIncident(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<FastifyReply> {
  try {
    const { uuid } = request.params as { uuid: string };
    const ownerScope = await resolveOwnerScope(request);
    if (!(await checkRouteScope(uuid, ownerScope))) {
      return reply
        .code(403)
        .send({ success: false, code: 'FORBIDDEN', message: 'Route outside scoped owners' });
    }
    const data = reportIncidentSchema.parse(request.body);
    await RouteService.reportIncident(
      uuid,
      data.category,
      data.description,
      data.severity,
      data.evidenceImage
    );
    dispatchIncidentNotification(uuid, data);
    return reply.code(201).send({
      success: true,
      message: 'Incident reported successfully. Logged in forensic journal.',
    });
  } catch (error) {
    request.log.error(error);
    // FC 082 F2b2 Cond.C: shape unificado con finance.ts para CatalogMappingError.
    if (error instanceof CatalogMappingError) {
      return reply.code(400).send({
        success: false,
        code: 'VALIDATION_ERROR',
        message: error.message,
        field: 'category',
      });
    }
    return reply.code(400).send({ success: false, message: (error as Error).message });
  }
}

/** GET /v1/routes/:uuid/incidents */
async function handleListRouteIncidents(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<FastifyReply> {
  try {
    const { uuid } = request.params as { uuid: string };
    const ownerScope = await resolveOwnerScope(request);
    if (!(await checkRouteScope(uuid, ownerScope))) {
      return reply
        .code(403)
        .send({ success: false, code: 'FORBIDDEN', message: 'Route outside scoped owners' });
    }
    const incidents = await RouteService.getIncidents(uuid);
    return reply.send({ success: true, data: incidents });
  } catch {
    return reply.code(400).send({ success: false, message: 'Error fetching incidents' });
  }
}

/** GET /v1/incidents */
async function handleListAllIncidents(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<FastifyReply> {
  try {
    const ownerScope = await resolveOwnerScope(request);
    if (ownerScope !== null && ownerScope.length === 0) {
      return reply.send({ success: true, data: [] });
    }
    const incidents = await RouteService.getAllIncidents(ownerScope ?? undefined);
    return reply.send({ success: true, data: incidents });
  } catch {
    return reply.code(400).send({ success: false, message: 'Error fetching global incidents' });
  }
}

/** PUT /v1/routes/:uuid */
async function handleUpdateRoute(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<FastifyReply> {
  try {
    const { uuid } = request.params as { uuid: string };
    const ownerScope = await resolveOwnerScope(request);
    if (!(await checkRouteScope(uuid, ownerScope))) {
      return reply
        .code(403)
        .send({ success: false, code: 'FORBIDDEN', message: 'Route outside scoped owners' });
    }
    // FC 076 F4 — schema movido a packages/contracts (SSOT compartido con
    // apps/web); importado 1:1, cero cambio semántico (Cond.1 Bravo).
    const { data, reason } = routeUpdateSchema.parse(request.body);
    const user = request.user as { id: number };
    await RouteService.updateRoute(uuid, data, reason, user.id);
    return reply.send({ success: true, message: 'Route updated forensically' });
  } catch (error) {
    request.log.error(error);
    return reply.code(400).send({ success: false, message: (error as Error).message });
  }
}

/** DELETE /v1/routes/:uuid */
async function handleDeleteRoute(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<FastifyReply> {
  try {
    const { uuid } = request.params as { uuid: string };
    const ownerScope = await resolveOwnerScope(request);
    if (!(await checkRouteScope(uuid, ownerScope))) {
      return reply
        .code(403)
        .send({ success: false, code: 'FORBIDDEN', message: 'Route outside scoped owners' });
    }
    const { reason } = deleteRouteSchema.parse(request.body);
    const user = request.user as { id: number };
    await RouteService.deleteRoute(uuid, reason, user.id);
    return reply.send({ success: true, message: 'Route deleted forensically' });
  } catch (error) {
    request.log.error(error);
    return reply.code(400).send({ success: false, message: (error as Error).message });
  }
}

/** GET /v1/routes/:uuid/node — Sovereign node: full route with unit + driver + incidents */
async function handleGetRouteNode(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<FastifyReply> {
  try {
    const { uuid } = request.params as { uuid: string };
    const ownerScope = await resolveOwnerScope(request);
    if (!(await checkRouteScope(uuid, ownerScope))) {
      return reply
        .code(403)
        .send({ success: false, code: 'FORBIDDEN', message: 'Route outside scoped owners' });
    }
    const node = await RouteService.getRouteNode(uuid);
    if (!node) return reply.code(404).send({ success: false, message: 'Ruta no encontrada' });
    return reply.send({ success: true, data: node });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ success: false, message: 'Error al cargar nodo de ruta' });
  }
}

/** GET /v1/incidents/:uuid/node — Sovereign node: incident with route + unit context */
async function handleGetIncidentNode(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<FastifyReply> {
  try {
    const { uuid } = request.params as { uuid: string };
    const ownerScope = await resolveOwnerScope(request);
    if (!(await checkIncidentScope(uuid, ownerScope))) {
      return reply
        .code(403)
        .send({ success: false, code: 'FORBIDDEN', message: 'Incident outside scoped owners' });
    }
    const incidentNode = await RouteService.getIncidentNode(uuid);
    if (!incidentNode)
      return reply.code(404).send({ success: false, message: 'Incidente no encontrado' });
    return reply.send({ success: true, data: incidentNode });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ success: false, message: 'Error al cargar nodo de incidente' });
  }
}

/** `{ preHandler: [requirePermission(p)] }` — shared shape for the route-level permission checks below. */
const withPerm = (permission: string): { preHandler: ReturnType<typeof requirePermission>[] } => ({
  preHandler: [requirePermission(permission)],
});

/** Registers the fleet-routes plugin: auth/permission hooks + the 15 route/incident/checkpoint endpoints. */
async function fleetRoutes(fastify: FastifyInstance): Promise<void> {
  // Security Hook — A01:2021 Broken Access Control
  fastify.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      reply.code(401).send({ success: false, code: 'UNAUTHORIZED', message: 'Session required' });
    }
  });
  fastify.addHook('preHandler', requirePermission('route:record:view:any'));

  fastify.post('/routes/start', withPerm('route:record:create'), handleStartRoute);
  fastify.patch('/routes/:uuid/finish', withPerm('route:record:edit:any'), handleFinishRoute);
  fastify.get('/routes/unit/:unitId/active', handleGetActiveRouteByUnit);
  fastify.get('/routes', handleListRoutes);
  fastify.get('/unit-logs', handleListUnitLogs);
  fastify.post('/routes/:uuid/checkpoints', withPerm('route:waypoint:manage'), handleAddCheckpoint);
  fastify.get('/routes/:uuid/checkpoints', handleListCheckpoints);
  fastify.patch(
    '/routes/:uuid/checkpoints/:id/arrive',
    withPerm('route:waypoint:manage'),
    handleArriveAtCheckpoint
  );
  fastify.post('/routes/:uuid/incidents', withPerm('route:record:edit:any'), handleReportIncident);
  fastify.get('/routes/:uuid/incidents', handleListRouteIncidents);
  fastify.get('/incidents', handleListAllIncidents);
  fastify.put('/routes/:uuid', withPerm('route:record:edit:any'), handleUpdateRoute);
  fastify.delete('/routes/:uuid', withPerm('route:record:delete:any'), handleDeleteRoute);
  fastify.get('/routes/:uuid/node', handleGetRouteNode);
  fastify.get('/incidents/:uuid/node', handleGetIncidentNode);
}

export default fleetRoutes;
