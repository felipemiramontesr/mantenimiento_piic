import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import requirePermission from '../middleware/requirePermission';
import {
  createWorkOrder,
  previewWorkOrder,
  updateTaskStatus,
  closeWorkOrder,
  getWorkOrder,
} from '../services/workOrderService';

const initSchema = z.object({
  vehicleId: z.string().min(1).max(36),
  fleetType: z.enum(['urban', 'mining']),
});

const updateTaskSchema = z.object({
  status: z.enum(['pending', 'completed', 'DEFERRED_FINANCIAL', 'N_A_STRUCTURAL']),
  evidenceUrls: z.array(z.string().url()).optional(),
  evidenceNotes: z.string().max(1000).optional(),
});

export async function workOrderRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      reply.code(401).send({ success: false, code: 'UNAUTHORIZED', message: 'Sesión requerida' });
    }
  });

  // GET /v1/work-orders/preview/:vehicleId
  fastify.get(
    '/work-orders/preview/:vehicleId',
    { preHandler: [requirePermission('fleet:view')] },
    async (request, reply) => {
      const { vehicleId } = request.params as { vehicleId: string };
      const { fleetType } = request.query as { fleetType?: string };
      const resolvedFleetType = fleetType === 'mining' ? 'mining' : 'urban';

      try {
        const result = await previewWorkOrder(vehicleId, resolvedFleetType);
        return reply.code(200).send({ success: true, data: result });
      } catch (error) {
        const msg = (error as Error).message;
        if (msg.startsWith('VEHICLE_NOT_FOUND')) {
          return reply.code(404).send({ success: false, code: 'NOT_FOUND', message: msg });
        }
        fastify.log.error({ err: msg }, 'work-orders/preview error');
        return reply.code(500).send({
          success: false,
          code: 'INTERNAL_ERROR',
          message: 'Error al generar vista previa UPA',
        });
      }
    }
  );

  // GET /v1/work-orders/:id
  fastify.get(
    '/work-orders/:id',
    { preHandler: [requirePermission('fleet:view')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const workOrderId = parseInt(id, 10);
      if (Number.isNaN(workOrderId) || workOrderId <= 0) {
        return reply.code(400).send({
          success: false,
          code: 'VALIDATION_ERROR',
          message: 'id de orden inválido',
        });
      }

      try {
        const result = await getWorkOrder(workOrderId);
        if (!result) {
          return reply.code(404).send({
            success: false,
            code: 'NOT_FOUND',
            message: `Work order ${workOrderId} not found`,
          });
        }
        return reply.code(200).send({ success: true, data: result });
      } catch (error) {
        fastify.log.error({ err: (error as Error).message }, 'work-orders/:id GET error');
        return reply.code(500).send({
          success: false,
          code: 'INTERNAL_ERROR',
          message: 'Error al obtener orden de trabajo',
        });
      }
    }
  );

  // POST /v1/work-orders/init
  fastify.post(
    '/work-orders/init',
    { preHandler: [requirePermission('fleet:write')] },
    async (request, reply) => {
      const parsed = initSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          success: false,
          code: 'VALIDATION_ERROR',
          message: parsed.error.issues[0].message,
        });
      }

      try {
        const result = await createWorkOrder(parsed.data.vehicleId, parsed.data.fleetType);
        return reply.code(201).send({ success: true, data: result });
      } catch (error) {
        const msg = (error as Error).message;
        if (msg.startsWith('VEHICLE_NOT_FOUND')) {
          return reply.code(404).send({ success: false, code: 'NOT_FOUND', message: msg });
        }
        if (msg.startsWith('VALIDATION_ERROR')) {
          return reply.code(422).send({ success: false, code: 'VALIDATION_ERROR', message: msg });
        }
        fastify.log.error({ err: msg }, 'work-orders/init error');
        return reply.code(500).send({
          success: false,
          code: 'INTERNAL_ERROR',
          message: 'Error al crear orden de trabajo',
        });
      }
    }
  );

  // PATCH /v1/work-orders/:id/tasks/:taskId
  fastify.patch(
    '/work-orders/:id/tasks/:taskId',
    { preHandler: [requirePermission('fleet:write')] },
    async (request, reply) => {
      const { id, taskId } = request.params as { id: string; taskId: string };
      const workOrderId = parseInt(id, 10);
      if (Number.isNaN(workOrderId) || workOrderId <= 0) {
        return reply.code(400).send({
          success: false,
          code: 'VALIDATION_ERROR',
          message: 'id de orden inválido',
        });
      }

      const parsed = updateTaskSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          success: false,
          code: 'VALIDATION_ERROR',
          message: parsed.error.issues[0].message,
        });
      }

      try {
        await updateTaskStatus(workOrderId, taskId, parsed.data);
        return reply.code(200).send({ success: true });
      } catch (error) {
        const msg = (error as Error).message;
        if (msg.startsWith('TASK_NOT_FOUND')) {
          return reply.code(404).send({ success: false, code: 'NOT_FOUND', message: msg });
        }
        fastify.log.error({ err: msg }, 'work-orders/:id/tasks/:taskId error');
        return reply
          .code(500)
          .send({ success: false, code: 'INTERNAL_ERROR', message: 'Error al actualizar tarea' });
      }
    }
  );

  // POST /v1/work-orders/:id/close
  fastify.post(
    '/work-orders/:id/close',
    { preHandler: [requirePermission('fleet:write')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const workOrderId = parseInt(id, 10);
      if (Number.isNaN(workOrderId) || workOrderId <= 0) {
        return reply.code(400).send({
          success: false,
          code: 'VALIDATION_ERROR',
          message: 'id de orden inválido',
        });
      }

      try {
        await closeWorkOrder(workOrderId);
        return reply.code(200).send({ success: true });
      } catch (error) {
        const msg = (error as Error).message;
        if (msg.startsWith('WORK_ORDER_NOT_FOUND')) {
          return reply.code(404).send({ success: false, code: 'NOT_FOUND', message: msg });
        }
        if (msg.startsWith('ALREADY_CLOSED')) {
          return reply.code(409).send({ success: false, code: 'CONFLICT', message: msg });
        }
        fastify.log.error({ err: msg }, 'work-orders/:id/close error');
        return reply.code(500).send({
          success: false,
          code: 'INTERNAL_ERROR',
          message: 'Error al cerrar orden de trabajo',
        });
      }
    }
  );
}

export default workOrderRoutes;
