import { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { RowDataPacket } from 'mysql2';
import FleetService from '../services/fleetService';
import requirePermission from '../middleware/requirePermission';
import db from '../services/db';

/**
 * 🔱 Archon Fleet Routes — Plan Omega
 * All assets (images) are stored as Base64 strings directly in MySQL.
 * v.22.0.0 - Zero Filesystem Dependency. 100% Hostinger Compatible.
 */

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
  initialFuelLevel: z.number().min(0).max(100).default(100),
  lastFuelLevel: z.number().min(0).max(100).optional(),
  maintenanceCenterId: z.number().int().optional().nullable(),
  protocolStartDate: z.string().optional().nullable(),
  vencimientoVerificacion: z.string().optional().nullable(),
  circulationCardNumber: z.string().max(100).optional(),
  lastEnvironmentalVerification: z.string().optional().nullable(),
  lastMechanicalVerification: z.string().optional().nullable(),
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
  environmentalHologram: z.string().max(10).optional().nullable(),
  monthlyLeasePayment: z.number().min(0).default(0),
  insuranceCost: z.number().min(0).optional().nullable().default(0),
});

const updateFleetSchema = createFleetSchema.partial();

/**
 * Owner-Scoped Fleet Access (F1-A).
 * Returns null for unscoped carriers (full fleet visibility) or the list of
 * FLEET_OWNER ids linked to the user for fleet:scoped carriers.
 * An empty array means deny-by-default: the user sees nothing.
 */
const resolveOwnerScope = async (request: FastifyRequest): Promise<number[] | null> => {
  const { id, permissions } = request.user as { id: number; permissions: string[] };
  if (permissions.includes('*') || !permissions.includes('fleet:scoped')) return null;
  return FleetService.getUserOwnerIds(id);
};

export default async function fleetRoutes(fastify: FastifyInstance): Promise<void> {
  // Security Hook
  fastify.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      reply.code(401).send({ error: 'Archon Protection: Session required' });
    }
  });
  fastify.addHook('preHandler', requirePermission('fleet:view'));

  /**
   * GET /api/v1/fleet
   */
  fastify.get('/fleet', async (request, reply) => {
    reply.header('Cache-Control', 'no-store, no-cache, must-revalidate');
    try {
      const ownerScope = await resolveOwnerScope(request);
      if (ownerScope !== null && ownerScope.length === 0) {
        return reply.send({ success: true, count: 0, data: [] });
      }
      const units = await FleetService.getAllUnits(fastify.log, ownerScope ?? undefined);
      return reply.send({ success: true, count: units.length, data: units });
    } catch (error) {
      fastify.log.error(error);
      return reply
        .code(500)
        .send({ error: `Internal Database Exception: ${(error as Error).message}` });
    }
  });

  /**
   * GET /api/v1/fleet/:id
   */
  fastify.get('/fleet/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const ownerScope = await resolveOwnerScope(request);
      if (ownerScope !== null && ownerScope.length === 0) {
        return reply.code(404).send({ error: 'Unit not found' });
      }
      const unit = await FleetService.getUnitById(id, fastify.log, ownerScope ?? undefined);
      if (!unit) return reply.code(404).send({ error: 'Unit not found' });
      return reply.send({ success: true, data: unit });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failure retrieving unit details' });
    }
  });

  /**
   * POST /api/v1/fleet
   * Plan Omega: Base64 images are part of the main payload.
   */
  fastify.post(
    '/fleet',
    { preHandler: [requirePermission('fleet:write')] },
    async (request, reply) => {
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
    }
  );

  /**
   * PATCH /api/v1/fleet/:id
   */
  fastify.patch(
    '/fleet/:id',
    { preHandler: [requirePermission('fleet:write')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const schema = z.object({
        data: updateFleetSchema,
        reason: z.string().min(5),
      });

      const parse = schema.safeParse(request.body);
      if (!parse.success) {
        return reply
          .code(400)
          .send({ error: 'Invalid update format', details: parse.error.format() });
      }

      const { data, reason } = parse.data;
      const user = request.user as { id: number };

      try {
        const success = await FleetService.updateUnit(id, data, reason, user.id);
        if (!success) return reply.code(404).send({ error: 'Unit not found' });
        return reply.send({ success: true });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({ error: 'Critical failure during update' });
      }
    }
  );

  /**
   * DELETE /api/v1/fleet/:id
   */
  fastify.delete(
    '/fleet/:id',
    { preHandler: [requirePermission('fleet:write')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const schema = z.object({
        reason: z.string().min(5),
      });
      const parse = schema.safeParse(request.body);
      if (!parse.success) {
        return reply.code(400).send({ error: 'Reason required for deletion' });
      }

      const { reason } = parse.data;
      const user = request.user as { id: number };

      try {
        const success = await FleetService.deleteUnit(id, reason, user.id);
        if (!success) return reply.code(404).send({ error: 'Unit not found' });
        return reply.send({ success: true });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({ error: 'System error during deletion' });
      }
    }
  );

  /**
   * GET /api/v1/fleet/:id/node
   * Sovereign Node — aggregates full unit profile + maintenance + financial + incidents
   */
  fastify.get('/fleet/:id/node', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const unit = await FleetService.getUnitById(id, fastify.log);
      if (!unit) return reply.code(404).send({ error: 'Unidad no encontrada' });

      const yearStart = `${new Date().getFullYear()}-01`;
      const yearEnd = `${new Date().getFullYear()}-12`;

      const [maintenanceRows, financialRows, incidentRows] = await Promise.all([
        // Last 5 maintenance records
        db.execute<RowDataPacket[]>(
          `SELECT fm.uuid, fme.service_date, fme.service_type, fme.service_mode,
                  fme.cost, fme.technician, fm.start_reading AS odometer,
                  fm.end_reading, fm.status, fm.start_at, fm.end_at
           FROM fleet_movements fm
           JOIN fleet_maintenance_extensions fme ON fme.movement_id = fm.id
           WHERE fm.unit_id = ? AND fm.movement_type = 'MAINTENANCE'
           ORDER BY fme.service_date DESC, fm.id DESC
           LIMIT 5`,
          [id]
        ),
        // Financial summary by category for current year
        db.execute<RowDataPacket[]>(
          `SELECT category, SUM(amount) AS total
           FROM financial_transactions
           WHERE unit_id = ? AND period >= ? AND period <= ?
           GROUP BY category`,
          [id, yearStart, yearEnd]
        ),
        // Last 3 incidents linked to this unit
        db.execute<RowDataPacket[]>(
          `SELECT ri.id, ri.category, ri.description, ri.severity,
                  ri.status, ri.reported_at
           FROM route_incidents ri
           JOIN fleet_movements fm ON ri.route_uuid = fm.uuid COLLATE utf8mb4_unicode_ci
           WHERE fm.unit_id = ?
           ORDER BY ri.reported_at DESC
           LIMIT 3`,
          [id]
        ),
      ]);

      const byCategory: Record<string, number> = {};
      (financialRows[0] as RowDataPacket[]).forEach((r) => {
        byCategory[r.category as string] = Number(r.total);
      });
      const totalFinancial = Object.values(byCategory).reduce((s, v) => s + v, 0);

      return reply.send({
        success: true,
        data: {
          unit,
          maintenance: {
            recentHistory: maintenanceRows[0] as RowDataPacket[],
          },
          financial: {
            year: new Date().getFullYear(),
            totalCost: totalFinancial,
            byCategory,
          },
          incidents: {
            recent: incidentRows[0] as RowDataPacket[],
            openCount: (incidentRows[0] as RowDataPacket[]).filter((r) => r.status === 'OPEN')
              .length,
          },
        },
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Error al cargar nodo de unidad' });
    }
  });
}
