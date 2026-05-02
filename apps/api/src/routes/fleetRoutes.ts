import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { RowDataPacket } from 'mysql2';
import db from '../services/db';
import RouteService from '../services/routeService';

/**
 * 🔱 Archon Fleet Routes
 * Management of journey lifecycles and unit impact transactions.
 */

const startRouteSchema = z.object({
  unitId: z.string().min(2).max(50),
  driverId: z.number().int(),
  startReading: z.number().min(0),
  destination: z.string().min(2).max(255),
  originId: z.number().int().optional(),
});

const finishRouteSchema = z.object({
  endReading: z.number().min(0),
  fuelLitersLoaded: z.number().min(0).optional(),
  fuelTicketImage: z.string().optional(), // Base64
});

async function fleetRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * START ROUTE
   * POST /v1/routes/start
   */
  fastify.post('/routes/start', async (request, reply) => {
    try {
      const data = startRouteSchema.parse(request.body);
      const routeUuid = await RouteService.startRoute(
        data.unitId,
        data.driverId,
        data.startReading,
        data.destination,
        data.originId
      );

      return reply.code(201).send({
        success: true,
        message: 'Route started successfully',
        routeUuid,
      });
    } catch (error) {
      fastify.log.error(error);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return reply.code(400).send({ success: false, message: (error as any).message });
    }
  });

  /**
   * FINISH ROUTE
   * PATCH /v1/routes/:uuid/finish
   */
  fastify.patch('/routes/:uuid/finish', async (request, reply) => {
    try {
      const { uuid } = request.params as { uuid: string };
      const data = finishRouteSchema.parse(request.body);

      await RouteService.finishRoute(
        uuid,
        data.endReading,
        data.fuelLitersLoaded,
        data.fuelTicketImage
      );

      return reply.send({
        success: true,
        message: 'Route completed successfully. Unit updated.',
      });
    } catch (error) {
      fastify.log.error(error);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return reply.code(400).send({ success: false, message: (error as any).message });
    }
  });

  /**
   * GET ACTIVE ROUTE BY UNIT
   * GET /v1/routes/unit/:unitId/active
   */
  fastify.get('/routes/unit/:unitId/active', async (request, reply) => {
    try {
      const { unitId } = request.params as { unitId: string };
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
  fastify.get('/routes', async (_request, reply) => {
    try {
      const [rows] = await db.execute<RowDataPacket[]>(
        'SELECT * FROM fleet_routes ORDER BY created_at DESC'
      );
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
  fastify.get('/unit-logs', async (_request, reply) => {
    try {
      const query = `
        SELECT 
          l.*,
          u.full_name as operatorName,
          f.marca,
          f.modelo
        FROM unit_activity_logs l
        LEFT JOIN users u ON l.created_by = u.id
        LEFT JOIN fleet_units f ON l.unit_id = f.id
        ORDER BY l.created_at DESC
      `;
      const [rows] = await db.execute<RowDataPacket[]>(query);
      return reply.send({
        success: true,
        data: rows,
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(400).send({ success: false, message: 'Error fetching activity logs' });
    }
  });
}

export default fleetRoutes;
