import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import FleetService from '../services/fleetService';

// ============================================================================
// ZOD SCHEMAS: CONTRACT DEFINITION
// ============================================================================
const createFleetSchema = z.object({
  assetTypeId: z.number().int(),
  id: z.string().min(2).max(50),
  placas: z.string().max(20).optional().nullable(),
  numeroSerie: z.string().max(100).optional(),
  images: z.array(z.string()).max(4).optional(),
  brandId: z.number().int(),
  modelId: z.number().int(),
  year: z
    .number()
    .int()
    .min(1900)
    .max(new Date().getFullYear() + 1),
  departmentId: z.number().int().optional().nullable(),
  operationalUseId: z.number().int().optional().nullable(),
  locationId: z.number().int().optional().nullable(),
  engineTypeId: z.number().int().optional().nullable(),
  traccionId: z.number().int().optional().nullable(),
  transmisionId: z.number().int().optional().nullable(),
  fuelTypeId: z.number().int().optional().nullable(),
  tireSpec: z.string().max(50).optional(),
  tireBrandId: z.number().int().optional().nullable(),
  terrainTypeId: z.number().int().optional().nullable(),
  capacidadCarga: z.number().min(0).optional(),
  fuelTankCapacity: z.number().min(0),
  odometer: z.number().min(0).default(0),
  maintenanceCenterId: z.number().int().optional().nullable(),
  protocolStartDate: z.string().optional().nullable(),
  tarjetaCirculacion: z.string().max(100).optional(),
  vencimientoVerificacion: z.string().optional().nullable(),
  circulationCardNumber: z.string().max(100).optional(),
  status: z
    .enum(['Disponible', 'En Ruta', 'En Mantenimiento', 'Descontinuada'])
    .default('Disponible'),
  colorId: z.number().int().optional().nullable(),
  description: z.string().optional().nullable(),
  // 🔱 Archon Intelligence
  maintIntervalDays: z.number().int().min(0).default(90),
  maintIntervalKm: z.number().min(0).default(5000),
  lastServiceDate: z.string().optional().nullable(),
  lastServiceReading: z.number().optional().default(0),
  dailyUsageAvg: z.number().min(0).optional().nullable(),
  // 🔱 Sovereign Asset Management
  ownerId: z.number().int().optional().nullable(),
  complianceStatusId: z.number().int().optional().nullable(),
  accountingAccount: z.string().max(50).optional().nullable(),
  legalComplianceDate: z.string().optional().nullable(),
  insuranceExpiryDate: z.string().optional().nullable(),
  insuranceCompanyId: z.number().int().optional().nullable(),
  monthlyLeasePayment: z.number().min(0).default(0),
});

const updateFleetSchema = createFleetSchema.partial();

// ============================================================================
// ROUTES (v.8.0.0 - REFACTORED)
// ============================================================================
export default async function fleetRoutes(fastify: FastifyInstance): Promise<void> {
  // Security Hook
  fastify.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      reply.code(401).send({ error: 'Archon Protection: Session required' });
    }
  });

  /**
   * GET /api/v1/fleet
   */
  fastify.get('/fleet', async (_request, reply) => {
    // 🔱 Cache-Killer Protocol
    reply.header('Cache-Control', 'no-store, no-cache, must-revalidate');

    try {
      const units = await FleetService.getAllUnits(fastify.log);
      return reply.send({ success: true, count: units.length, data: units });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal Database Exception' });
    }
  });

  /**
   * POST /api/v1/fleet
   */
  fastify.post('/fleet', async (request, reply) => {
    const parse = createFleetSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.code(400).send({ error: 'Validation failed', details: parse.error.format() });
    }

    try {
      const result = await FleetService.createUnit(
        parse.data as Parameters<typeof FleetService.createUnit>[0]
      );
      return reply.code(201).send({ success: true, ...result });
    } catch (error: unknown) {
      fastify.log.error(error as Error);
      const err = error as Record<string, unknown>;
      const message =
        (err?.message as string) ||
        (err?.sqlMessage as string) ||
        (typeof err === 'string' ? err : 'Unknown DB Exception');

      if (message.includes('CONFLICT')) {
        return reply.code(409).send({ error: message });
      }

      return reply.code(500).send({ error: `Database Error: ${message}` });
    }
  });

  /**
   * PATCH /api/v1/fleet/:id
   */
  fastify.patch('/fleet/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const parse = updateFleetSchema.safeParse(request.body);
    if (!parse.success) {
      return reply
        .code(400)
        .send({ error: 'Invalid update format', details: parse.error.format() });
    }

    if (Object.keys(parse.data).length === 0) {
      return reply.code(400).send({ error: 'Empty update payload' });
    }

    try {
      const success = await FleetService.updateUnit(id, parse.data);
      if (!success) return reply.code(404).send({ error: 'Unit not found' });
      return reply.send({ success: true });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Critical failure during update' });
    }
  });

  /**
   * DELETE /api/v1/fleet/:id
   */
  fastify.delete('/fleet/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const success = await FleetService.deleteUnit(id);
      if (!success) return reply.code(404).send({ error: 'Unit not found' });
      return reply.send({ success: true });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'System error during deletion' });
    }
  });
}
