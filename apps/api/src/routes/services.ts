import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import ServiceOrderService from '../services/serviceOrderService';

// ============================================================================
// ZOD SCHEMAS: MAINTENANCE ORDER CONTRACT
// ============================================================================
const createServiceOrderSchema = z.object({
  unitId: z.string().min(2).max(10),
  serviceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)'),
  odometerAtService: z.number().min(0),
  serviceTypeId: z.number().int(),
  providerId: z.number().int(),
  laborCost: z.number().min(0).default(0),
  partsCost: z.number().min(0).default(0),
  description: z.string().optional().nullable(),
  statusId: z.number().int().optional().default(1201), // Default: Borrador
  technicianName: z.string().max(100).optional().nullable(),
});

// ============================================================================
// SERVICE ROUTES (v.52.1.0)
// ============================================================================
export default async function serviceRoutes(fastify: FastifyInstance): Promise<void> {
  // Security Hook: Sovereign Session Verification
  fastify.addHook('onRequest', async (request, reply): Promise<void> => {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.code(401).send({ error: 'Archon Protection: Session required' });
    }
  });

  /**
   * POST /v1/services
   * Registers a new Service Order and triggers Fleet Intelligence Update
   */
  fastify.post('/', async (request, reply) => {
    const parse = createServiceOrderSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.code(400).send({ error: 'Validation failed', details: parse.error.format() });
    }

    try {
      const result = await ServiceOrderService.createOrder(
        parse.data as Parameters<typeof ServiceOrderService.createOrder>[0]
      );
      return reply.code(201).send({ success: true, ...result });
    } catch (error: unknown) {
      fastify.log.error(error as Error);
      return reply.code(500).send({ error: 'Failed to register service order' });
    }
  });

  /**
   * GET /v1/services/unit/:unitId
   * Retrieves full maintenance history for a specific unit
   */
  fastify.get('/unit/:unitId', async (request, reply) => {
    const { unitId } = request.params as { unitId: string };
    try {
      const history = await ServiceOrderService.getUnitHistory(unitId);
      return reply.send({ success: true, count: history.length, data: history });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Error retrieving unit service history' });
    }
  });

  /**
   * GET /v1/services/financial-summary
   * Returns global maintenance investment metrics
   */
  fastify.get('/financial-summary', async (_request, reply) => {
    try {
      const summary = await ServiceOrderService.getFinancialSummary();
      return reply.send({ success: true, ...summary });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to retrieve financial summary' });
    }
  });
}
