import { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { routeUpdateSchema } from '@mantenimiento/contracts';
import { RowDataPacket } from 'mysql2';
import db from '../services/db';
import RouteService from '../services/routeService';
import FleetService from '../services/fleetService';
import requirePermission from '../middleware/requirePermission';
import NotificationService, {
  ArchonNotificationType,
  ArchonNotificationPriority,
} from '../services/notification.service';

const resolveOwnerScope = async (request: FastifyRequest): Promise<number[] | null> => {
  const { id, permissions } = request.user as { id: number; permissions?: string[] };
  if (!permissions || permissions.includes('*') || !permissions.includes('fleet:scoped'))
    return null;
  return FleetService.getUserOwnerIds(id);
};

const checkRouteScope = async (uuid: string, ownerScope: number[] | null): Promise<boolean> => {
  if (ownerScope === null) return true;
  const [routes] = await db.execute<RowDataPacket[]>(
    'SELECT fu.ownerId FROM fleet_movements fm JOIN fleet_units fu ON fm.unit_id = fu.id WHERE fm.uuid = ? AND fm.movement_type = "ROUTE"',
    [uuid]
  );
  if (routes.length === 0) return false;
  return ownerScope.includes(routes[0].ownerId);
};

const checkIncidentScope = async (uuid: string, ownerScope: number[] | null): Promise<boolean> => {
  if (ownerScope === null) return true;
  const [incidents] = await db.execute<RowDataPacket[]>(
    `SELECT fu.ownerId
     FROM route_incidents ri
     JOIN fleet_movements fm ON ri.route_uuid = fm.uuid COLLATE utf8mb4_unicode_ci
     JOIN fleet_units fu ON fm.unit_id = fu.id
     WHERE ri.uuid = ?`,
    [uuid]
  );
  if (incidents.length === 0) return false;
  return ownerScope.includes(incidents[0].ownerId);
};

/**
 * 🔱 Archon Fleet Routes — CTI Architecture (V2)
 * All journey queries target fleet_movements + fleet_route_extensions.
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

  /**
   * START ROUTE
   * POST /v1/routes/start
   */
  fastify.post(
    '/routes/start',
    { preHandler: [requirePermission('route:record:create')] },
    async (request, reply) => {
      try {
        const data = startRouteSchema.parse(request.body);
        const ownerScope = await resolveOwnerScope(request);
        if (ownerScope !== null) {
          const [units] = await db.execute<RowDataPacket[]>(
            'SELECT ownerId FROM fleet_units WHERE id = ?',
            [data.unitId]
          );
          if (units.length === 0 || !ownerScope.includes(units[0].ownerId)) {
            return reply
              .code(403)
              .send({ success: false, code: 'FORBIDDEN', message: 'Unit outside scoped owners' });
          }
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

        return reply.code(201).send({
          success: true,
          message: 'Route started successfully',
          routeUuid,
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(400).send({ success: false, message: (error as Error).message });
      }
    }
  );

  /**
   * FINISH ROUTE
   * PATCH /v1/routes/:uuid/finish
   */
  fastify.patch(
    '/routes/:uuid/finish',
    { preHandler: [requirePermission('route:record:edit:any')] },
    async (request, reply) => {
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

        return reply.send({
          success: true,
          message: 'Route completed successfully. Unit updated.',
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(400).send({ success: false, message: (error as Error).message });
      }
    }
  );

  /**
   * GET ACTIVE ROUTE BY UNIT
   * GET /v1/routes/unit/:unitId/active
   */
  fastify.get('/routes/unit/:unitId/active', async (request, reply) => {
    try {
      const { unitId } = request.params as { unitId: string };
      const ownerScope = await resolveOwnerScope(request);
      if (ownerScope !== null) {
        const [units] = await db.execute<RowDataPacket[]>(
          'SELECT ownerId FROM fleet_units WHERE id = ?',
          [unitId]
        );
        if (units.length === 0 || !ownerScope.includes(units[0].ownerId)) {
          return reply
            .code(403)
            .send({ success: false, code: 'FORBIDDEN', message: 'Unit outside scoped owners' });
        }
      }
      const activeRoute = await RouteService.getActiveRoute(unitId);

      return reply.send({
        success: true,
        activeRoute,
      });
    } catch (error) {
      return reply.code(400).send({ success: false, message: 'Error fetching active route' });
    }
  });

  /**
   * LIST ALL ROUTES
   * GET /v1/routes
   */
  fastify.get('/routes', async (request, reply) => {
    try {
      const ownerScope = await resolveOwnerScope(request);
      let query = `SELECT
          fm.id, fm.uuid, fm.unit_id,
          fre.driver_id AS operator_id,
          fre.origin_id,
          fre.destination_neighborhood_id,
          fre.destination,
          fm.status,
          fm.start_reading AS start_km,
          fm.end_reading AS end_km,
          fm.start_at AS start_time,
          fm.end_at AS end_time,
          fm.fuel_level_start, fm.fuel_level_end,
          fm.fuel_liters_loaded, fm.fuel_amount, fm.fuel_ticket_image,
          fre.additives_check, fre.tire_pressure_json, fre.checklist_json,
          fm.description,
          fm.created_at,
          (
            SELECT COUNT(*) FROM route_incidents i WHERE i.route_uuid = fm.uuid COLLATE utf8mb4_unicode_ci
          ) + (
            SELECT COUNT(*) FROM administrative_audit_logs a
            WHERE a.entity_id = fm.uuid COLLATE utf8mb4_unicode_ci AND a.entity_type = 'route_log'
          ) AS incident_count
        FROM fleet_movements fm
        JOIN fleet_route_extensions fre ON fre.movement_id = fm.id
        JOIN fleet_units fu ON fm.unit_id = fu.id
        WHERE fm.movement_type = 'ROUTE'`;

      const params: (string | number)[] = [];
      if (ownerScope !== null) {
        if (ownerScope.length === 0) {
          return reply.send({ success: true, data: [] });
        }
        query += ` AND fu.ownerId IN (${ownerScope.map(() => '?').join(', ')})`;
        params.push(...ownerScope);
      }
      query += ` ORDER BY fm.created_at DESC`;

      const [rows] = await db.execute<RowDataPacket[]>(query, params);
      return reply.send({
        success: true,
        data: rows,
      });
    } catch (error) {
      return reply.code(400).send({ success: false, message: 'Error fetching routes' });
    }
  });

  /**
   * LIST ALL UNIT ACTIVITY LOGS (FORENSIC JOURNAL)
   * GET /v1/unit-logs
   */
  fastify.get('/unit-logs', async (request, reply) => {
    try {
      const ownerScope = await resolveOwnerScope(request);
      const query = `
        SELECT
          l.*,
          u.full_name as operatorName,
          c_brand.label as marca,
          c_model.label as modelo,
          c_loc.label as unit_sede,
          rext.destination as route_destination,
          c_origin.label as route_origin_label
        FROM (
          SELECT
            CONVERT(id USING utf8mb4) COLLATE utf8mb4_general_ci as id,
            unit_id COLLATE utf8mb4_general_ci as unit_id,
            event_type COLLATE utf8mb4_general_ci as event_type,
            reference_id COLLATE utf8mb4_general_ci as reference_id,
            reading_before, reading_after,
            status_before COLLATE utf8mb4_general_ci as status_before,
            status_after COLLATE utf8mb4_general_ci as status_after,
            description COLLATE utf8mb4_general_ci as description,
            created_by,
            created_at,
            NULL as fuel_before,
            NULL as fuel_after,
            NULL as fuel_level_before,
            NULL as fuel_level_after,
            NULL as fuel_amount_before,
            NULL as fuel_amount_after,
            NULL as snapshot_before,
            NULL as snapshot_after
          FROM unit_activity_logs

          UNION ALL

          SELECT
            CONVERT(a.uuid USING utf8mb4) COLLATE utf8mb4_general_ci as id,
            CONVERT(COALESCE(JSON_VALUE(a.snapshot_after, '$.unit_id'), r.unit_id) USING utf8mb4) COLLATE utf8mb4_general_ci as unit_id,
            'ADMIN_EDIT' COLLATE utf8mb4_general_ci as event_type,
            CONVERT(a.entity_id USING utf8mb4) COLLATE utf8mb4_general_ci as reference_id,
            CAST(
              CASE
                WHEN JSON_VALUE(a.snapshot_before, '$.end_reading') <> JSON_VALUE(a.snapshot_after, '$.end_reading')
                     OR (JSON_VALUE(a.snapshot_before, '$.end_reading') IS NULL AND JSON_VALUE(a.snapshot_after, '$.end_reading') IS NOT NULL)
                     OR (JSON_VALUE(a.snapshot_before, '$.end_reading') IS NOT NULL AND JSON_VALUE(a.snapshot_after, '$.end_reading') IS NULL)
                THEN JSON_VALUE(a.snapshot_before, '$.end_reading')
                WHEN JSON_VALUE(a.snapshot_before, '$.start_reading') <> JSON_VALUE(a.snapshot_after, '$.start_reading')
                     OR (JSON_VALUE(a.snapshot_before, '$.start_reading') IS NULL AND JSON_VALUE(a.snapshot_after, '$.start_reading') IS NOT NULL)
                     OR (JSON_VALUE(a.snapshot_before, '$.start_reading') IS NOT NULL AND JSON_VALUE(a.snapshot_after, '$.start_reading') IS NULL)
                THEN JSON_VALUE(a.snapshot_before, '$.start_reading')
                ELSE COALESCE(JSON_VALUE(a.snapshot_before, '$.end_reading'), JSON_VALUE(a.snapshot_before, '$.start_reading'))
              END AS DECIMAL(12,2)
            ) as reading_before,
            CAST(
              CASE
                WHEN JSON_VALUE(a.snapshot_before, '$.end_reading') <> JSON_VALUE(a.snapshot_after, '$.end_reading')
                     OR (JSON_VALUE(a.snapshot_before, '$.end_reading') IS NULL AND JSON_VALUE(a.snapshot_after, '$.end_reading') IS NOT NULL)
                     OR (JSON_VALUE(a.snapshot_before, '$.end_reading') IS NOT NULL AND JSON_VALUE(a.snapshot_after, '$.end_reading') IS NULL)
                THEN JSON_VALUE(a.snapshot_after, '$.end_reading')
                WHEN JSON_VALUE(a.snapshot_before, '$.start_reading') <> JSON_VALUE(a.snapshot_after, '$.start_reading')
                     OR (JSON_VALUE(a.snapshot_before, '$.start_reading') IS NULL AND JSON_VALUE(a.snapshot_after, '$.start_reading') IS NOT NULL)
                     OR (JSON_VALUE(a.snapshot_before, '$.start_reading') IS NOT NULL AND JSON_VALUE(a.snapshot_after, '$.start_reading') IS NULL)
                THEN JSON_VALUE(a.snapshot_after, '$.start_reading')
                ELSE COALESCE(JSON_VALUE(a.snapshot_after, '$.end_reading'), JSON_VALUE(a.snapshot_after, '$.start_reading'))
              END AS DECIMAL(12,2)
            ) as reading_after,
            CONVERT(JSON_VALUE(a.snapshot_before, '$.status') USING utf8mb4) COLLATE utf8mb4_general_ci as status_before,
            CONVERT(JSON_VALUE(a.snapshot_after, '$.status') USING utf8mb4) COLLATE utf8mb4_general_ci as status_after,
            CONVERT(a.reason USING utf8mb4) COLLATE utf8mb4_general_ci as description,
            a.user_id as created_by,
            a.created_at,
            CAST(JSON_VALUE(a.snapshot_before, '$.fuel_liters_loaded') AS DECIMAL(10,2)) as fuel_before,
            CAST(JSON_VALUE(a.snapshot_after, '$.fuel_liters_loaded') AS DECIMAL(10,2)) as fuel_after,
            CAST(
              CASE
                WHEN JSON_VALUE(a.snapshot_before, '$.fuel_level_end') <> JSON_VALUE(a.snapshot_after, '$.fuel_level_end')
                     OR (JSON_VALUE(a.snapshot_before, '$.fuel_level_end') IS NULL AND JSON_VALUE(a.snapshot_after, '$.fuel_level_end') IS NOT NULL)
                     OR (JSON_VALUE(a.snapshot_before, '$.fuel_level_end') IS NOT NULL AND JSON_VALUE(a.snapshot_after, '$.fuel_level_end') IS NULL)
                THEN JSON_VALUE(a.snapshot_before, '$.fuel_level_end')
                WHEN JSON_VALUE(a.snapshot_before, '$.fuel_level_start') <> JSON_VALUE(a.snapshot_after, '$.fuel_level_start')
                     OR (JSON_VALUE(a.snapshot_before, '$.fuel_level_start') IS NULL AND JSON_VALUE(a.snapshot_after, '$.fuel_level_start') IS NOT NULL)
                     OR (JSON_VALUE(a.snapshot_before, '$.fuel_level_start') IS NOT NULL AND JSON_VALUE(a.snapshot_after, '$.fuel_level_start') IS NULL)
                THEN JSON_VALUE(a.snapshot_before, '$.fuel_level_start')
                ELSE COALESCE(JSON_VALUE(a.snapshot_before, '$.fuel_level_end'), JSON_VALUE(a.snapshot_before, '$.fuel_level_start'))
              END AS DECIMAL(5,2)
            ) as fuel_level_before,
            CAST(
              CASE
                WHEN JSON_VALUE(a.snapshot_before, '$.fuel_level_end') <> JSON_VALUE(a.snapshot_after, '$.fuel_level_end')
                     OR (JSON_VALUE(a.snapshot_before, '$.fuel_level_end') IS NULL AND JSON_VALUE(a.snapshot_after, '$.fuel_level_end') IS NOT NULL)
                     OR (JSON_VALUE(a.snapshot_before, '$.fuel_level_end') IS NOT NULL AND JSON_VALUE(a.snapshot_after, '$.fuel_level_end') IS NULL)
                THEN JSON_VALUE(a.snapshot_after, '$.fuel_level_end')
                WHEN JSON_VALUE(a.snapshot_before, '$.fuel_level_start') <> JSON_VALUE(a.snapshot_after, '$.fuel_level_start')
                     OR (JSON_VALUE(a.snapshot_before, '$.fuel_level_start') IS NULL AND JSON_VALUE(a.snapshot_after, '$.fuel_level_start') IS NOT NULL)
                     OR (JSON_VALUE(a.snapshot_before, '$.fuel_level_start') IS NOT NULL AND JSON_VALUE(a.snapshot_after, '$.fuel_level_start') IS NULL)
                THEN JSON_VALUE(a.snapshot_after, '$.fuel_level_start')
                ELSE COALESCE(JSON_VALUE(a.snapshot_after, '$.fuel_level_end'), JSON_VALUE(a.snapshot_after, '$.fuel_level_start'))
              END AS DECIMAL(5,2)
            ) as fuel_level_after,
            CAST(JSON_VALUE(a.snapshot_before, '$.fuel_amount') AS DECIMAL(12,2)) as fuel_amount_before,
            CAST(JSON_VALUE(a.snapshot_after, '$.fuel_amount') AS DECIMAL(12,2)) as fuel_amount_after,
            a.snapshot_before,
            a.snapshot_after
          FROM administrative_audit_logs a
          LEFT JOIN fleet_movements r ON a.entity_id = r.uuid COLLATE utf8mb4_unicode_ci AND r.movement_type = 'ROUTE'
          WHERE a.entity_type = 'route_log'

          UNION ALL

          SELECT
            CONVERT(ri.uuid USING utf8mb4) COLLATE utf8mb4_general_ci as id,
            CONVERT(fm.unit_id USING utf8mb4) COLLATE utf8mb4_general_ci as unit_id,
            'ROUTE_INCIDENT' COLLATE utf8mb4_general_ci as event_type,
            CONVERT(ri.route_uuid USING utf8mb4) COLLATE utf8mb4_general_ci as reference_id,
            CAST(fm.start_reading AS DECIMAL(12,2)) as reading_before,
            NULL as reading_after,
            'En Ruta' COLLATE utf8mb4_general_ci as status_before,
            'En Ruta' COLLATE utf8mb4_general_ci as status_after,
            CONVERT(CONCAT(ri.category, ': ', SUBSTR(ri.description, 1, 100)) USING utf8mb4) COLLATE utf8mb4_general_ci as description,
            NULL as created_by,
            ri.reported_at as created_at,
            NULL as fuel_before,
            NULL as fuel_after,
            NULL as fuel_level_before,
            NULL as fuel_level_after,
            NULL as fuel_amount_before,
            NULL as fuel_amount_after,
            NULL as snapshot_before,
            NULL as snapshot_after
          FROM route_incidents ri
          JOIN fleet_movements fm ON fm.uuid = ri.route_uuid COLLATE utf8mb4_unicode_ci
          WHERE NOT EXISTS (
            SELECT 1 FROM unit_activity_logs ual
            WHERE ual.reference_id = ri.route_uuid COLLATE utf8mb4_unicode_ci
              AND ual.event_type = 'ROUTE_INCIDENT'
          )
        ) l
        LEFT JOIN users u ON l.created_by = u.id
        LEFT JOIN fleet_units f ON l.unit_id = f.id
        LEFT JOIN common_catalogs c_loc ON f.locationId = c_loc.id AND c_loc.category = 'LOCATION'
        LEFT JOIN common_catalogs c_brand ON f.brandId = c_brand.id AND c_brand.category = 'BRAND'
        LEFT JOIN common_catalogs c_model ON f.modelId = c_model.id AND c_model.category = 'MODEL'
        LEFT JOIN fleet_movements rm ON l.reference_id = rm.uuid AND rm.movement_type = 'ROUTE'
        LEFT JOIN fleet_route_extensions rext ON rext.movement_id = rm.id
        LEFT JOIN common_catalogs c_origin ON rext.origin_id = c_origin.id AND c_origin.category = 'ROUTE_ORIGIN'
      `;
      const params: (string | number)[] = [];
      let scopeClause = '';
      if (ownerScope !== null) {
        if (ownerScope.length === 0) {
          return reply.send({ success: true, data: [] });
        }
        scopeClause = `WHERE f.ownerId IN (${ownerScope.map(() => '?').join(', ')})`;
        params.push(...ownerScope);
      }
      const finalQuery = `${query} ${scopeClause} ORDER BY l.created_at DESC`;
      const [rows] = await db.execute<RowDataPacket[]>(finalQuery, params);
      return reply.send({
        success: true,
        data: rows,
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(400).send({ success: false, message: 'Error fetching activity logs' });
    }
  });

  /**
   * ADD CHECKPOINT
   * POST /v1/routes/:uuid/checkpoints
   */
  fastify.post(
    '/routes/:uuid/checkpoints',
    { preHandler: [requirePermission('route:waypoint:manage')] },
    async (request, reply) => {
      try {
        const { uuid } = request.params as { uuid: string };
        const ownerScope = await resolveOwnerScope(request);
        if (!(await checkRouteScope(uuid, ownerScope))) {
          return reply
            .code(403)
            .send({ success: false, code: 'FORBIDDEN', message: 'Route outside scoped owners' });
        }
        const schema = z.object({
          sequence: z.number().int().min(1).max(255),
          name: z.string().min(1).max(150),
          neighborhoodId: z.number().int().positive().optional(),
          eta: z.string().datetime().optional(),
        });
        const data = schema.parse(request.body);
        const id = await RouteService.addCheckpoint(uuid, {
          sequence: data.sequence,
          name: data.name,
          neighborhoodId: data.neighborhoodId,
          eta: data.eta,
        });
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
        fastify.log.error(error);
        return reply.code(400).send({ success: false, message: msg });
      }
    }
  );

  /**
   * LIST CHECKPOINTS FOR A ROUTE
   * GET /v1/routes/:uuid/checkpoints
   */
  fastify.get('/routes/:uuid/checkpoints', async (request, reply) => {
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
  });

  /**
   * ARRIVE AT CHECKPOINT
   * PATCH /v1/routes/:uuid/checkpoints/:id/arrive
   */
  fastify.patch(
    '/routes/:uuid/checkpoints/:id/arrive',
    { preHandler: [requirePermission('route:waypoint:manage')] },
    async (request, reply) => {
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
        fastify.log.error(error);
        return reply.code(400).send({ success: false, message: msg });
      }
    }
  );

  /**
   * REPORT INCIDENT
   * POST /v1/routes/:uuid/incidents
   */
  fastify.post(
    '/routes/:uuid/incidents',
    { preHandler: [requirePermission('route:record:edit:any')] },
    async (request, reply) => {
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

        // Notify transit supervisor (fire-and-forget)
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

        return reply.code(201).send({
          success: true,
          message: 'Incident reported successfully. Logged in forensic journal.',
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(400).send({ success: false, message: (error as Error).message });
      }
    }
  );

  /**
   * LIST INCIDENTS FOR A ROUTE
   * GET /v1/routes/:uuid/incidents
   */
  fastify.get('/routes/:uuid/incidents', async (request, reply) => {
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
    } catch (error) {
      return reply.code(400).send({ success: false, message: 'Error fetching incidents' });
    }
  });

  /**
   * LIST ALL INCIDENTS
   * GET /v1/incidents
   */
  fastify.get('/incidents', async (request, reply) => {
    try {
      const ownerScope = await resolveOwnerScope(request);
      if (ownerScope !== null && ownerScope.length === 0) {
        return reply.send({ success: true, data: [] });
      }
      const incidents = await RouteService.getAllIncidents(ownerScope ?? undefined);
      return reply.send({ success: true, data: incidents });
    } catch (error) {
      return reply.code(400).send({ success: false, message: 'Error fetching global incidents' });
    }
  });

  /**
   * UPDATE ROUTE (FORENSIC)
   * PUT /v1/routes/:uuid
   */
  fastify.put(
    '/routes/:uuid',
    { preHandler: [requirePermission('route:record:edit:any')] },
    async (request, reply) => {
      try {
        const { uuid } = request.params as { uuid: string };
        const ownerScope = await resolveOwnerScope(request);
        if (!(await checkRouteScope(uuid, ownerScope))) {
          return reply
            .code(403)
            .send({ success: false, code: 'FORBIDDEN', message: 'Route outside scoped owners' });
        }
        // FC 076 F4 — schema movido a packages/contracts (SSOT compartido
        // con apps/web); importado 1:1, cero cambio semántico (Cond.1 Bravo).
        const schema = routeUpdateSchema;
        const { data, reason } = schema.parse(request.body);
        const user = request.user as { id: number };

        await RouteService.updateRoute(uuid, data, reason, user.id);

        return reply.send({ success: true, message: 'Route updated forensically' });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(400).send({ success: false, message: (error as Error).message });
      }
    }
  );

  /**
   * DELETE ROUTE (FORENSIC)
   * DELETE /v1/routes/:uuid
   */
  fastify.delete(
    '/routes/:uuid',
    { preHandler: [requirePermission('route:record:delete:any')] },
    async (request, reply) => {
      try {
        const { uuid } = request.params as { uuid: string };
        const ownerScope = await resolveOwnerScope(request);
        if (!(await checkRouteScope(uuid, ownerScope))) {
          return reply
            .code(403)
            .send({ success: false, code: 'FORBIDDEN', message: 'Route outside scoped owners' });
        }
        const schema = z.object({
          reason: z.string().min(5),
        });
        const { reason } = schema.parse(request.body);
        const user = request.user as { id: number };

        await RouteService.deleteRoute(uuid, reason, user.id);

        return reply.send({ success: true, message: 'Route deleted forensically' });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(400).send({ success: false, message: (error as Error).message });
      }
    }
  );

  // GET /v1/routes/:uuid/node — Sovereign node: full route with unit + driver + incidents
  fastify.get('/routes/:uuid/node', async (request, reply) => {
    try {
      const { uuid } = request.params as { uuid: string };
      const ownerScope = await resolveOwnerScope(request);
      if (!(await checkRouteScope(uuid, ownerScope))) {
        return reply
          .code(403)
          .send({ success: false, code: 'FORBIDDEN', message: 'Route outside scoped owners' });
      }
      const [routeRows] = await db.execute<RowDataPacket[]>(
        `SELECT fm.id, fm.uuid, fm.unit_id, fm.status,
                fm.start_reading, fm.end_reading, fm.start_at, fm.end_at,
                fm.fuel_level_start, fm.fuel_level_end,
                fm.fuel_liters_loaded, fm.fuel_amount, fm.fuel_ticket_image,
                fm.description, fm.created_at,
                fre.driver_id, fre.origin_id, fre.destination,
                fre.destination_neighborhood_id,
                fre.additives_check, fre.tire_pressure_json, fre.checklist_json,
                u.full_name AS driver_name, r.name AS driver_role,
                c_brand.label AS unit_marca, c_model.label AS unit_modelo, fu.year AS unit_year
         FROM fleet_movements fm
         JOIN fleet_route_extensions fre ON fre.movement_id = fm.id
         LEFT JOIN users u ON fre.driver_id = u.id
         LEFT JOIN roles r ON u.role_id = r.id
         LEFT JOIN fleet_units fu ON fm.unit_id = fu.id
         LEFT JOIN common_catalogs c_brand ON fu.brandId = c_brand.id AND c_brand.category = 'BRAND'
         LEFT JOIN common_catalogs c_model ON fu.modelId = c_model.id AND c_model.category = 'MODEL'
         WHERE fm.uuid = ? AND fm.movement_type = 'ROUTE'`,
        [uuid]
      );
      if (routeRows.length === 0)
        return reply.code(404).send({ success: false, message: 'Ruta no encontrada' });

      const [incidentRows] = await db.execute<RowDataPacket[]>(
        `SELECT id, uuid, category, description, severity, status, reported_at
         FROM route_incidents WHERE route_uuid = ? ORDER BY reported_at DESC`,
        [uuid]
      );

      return reply.send({
        success: true,
        data: { route: routeRows[0], incidents: incidentRows },
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ success: false, message: 'Error al cargar nodo de ruta' });
    }
  });

  // GET /v1/incidents/:uuid/node — Sovereign node: incident with route + unit context
  fastify.get('/incidents/:uuid/node', async (request, reply) => {
    try {
      const { uuid } = request.params as { uuid: string };
      const ownerScope = await resolveOwnerScope(request);
      if (!(await checkIncidentScope(uuid, ownerScope))) {
        return reply
          .code(403)
          .send({ success: false, code: 'FORBIDDEN', message: 'Incident outside scoped owners' });
      }
      const [rows] = await db.execute<RowDataPacket[]>(
        `SELECT ri.id, ri.uuid, ri.route_uuid, ri.category, ri.description,
                ri.severity, ri.evidence_image, ri.status, ri.reported_at,
                fm.unit_id, fm.start_at AS route_start, fm.end_at AS route_end,
                fre.destination, fre.driver_id,
                u.full_name AS driver_name,
                c_brand.label AS unit_marca, c_model.label AS unit_modelo, fu.year AS unit_year
         FROM route_incidents ri
         JOIN fleet_movements fm ON ri.route_uuid = fm.uuid COLLATE utf8mb4_unicode_ci
         JOIN fleet_route_extensions fre ON fre.movement_id = fm.id
         LEFT JOIN users u ON fre.driver_id = u.id
         LEFT JOIN fleet_units fu ON fm.unit_id = fu.id
         LEFT JOIN common_catalogs c_brand ON fu.brandId = c_brand.id AND c_brand.category = 'BRAND'
         LEFT JOIN common_catalogs c_model ON fu.modelId = c_model.id AND c_model.category = 'MODEL'
         WHERE ri.uuid = ?`,
        [uuid]
      );
      if (rows.length === 0)
        return reply.code(404).send({ success: false, message: 'Incidente no encontrado' });

      return reply.send({ success: true, data: rows[0] });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ success: false, message: 'Error al cargar nodo de incidente' });
    }
  });
}

export default fleetRoutes;
