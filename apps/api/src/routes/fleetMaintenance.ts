import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import crypto from 'crypto';
import db from '../services/db';

const createMaintenanceSchema = z.object({
  unitId: z.string().min(2).max(50),
  serviceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  odometerAtService: z.number().min(0),
  serviceType: z.enum(['BASIC_10K', 'INTERMEDIATE_20K', 'MAJOR_30K', 'ADVANCED_50K', 'MINOR_MINING']),
  cost: z.number().min(0),
  technician: z.string().min(2).max(100),
  details: z.array(z.object({
    taskCode: z.string().min(1).max(50),
    status: z.enum(['PASS', 'FAIL', 'REPLACED', 'N_A']),
    notes: z.string().max(255).optional().nullable(),
  })),
});

function getRecommendedServiceType(odometer: number): string {
  if (!odometer || odometer <= 0) return 'BASIC_10K';
  const relativeKm = odometer % 60000;
  const milestones = [
    { type: 'ADVANCED_50K', value: 0 },
    { type: 'BASIC_10K', value: 10000 },
    { type: 'INTERMEDIATE_20K', value: 20000 },
    { type: 'MAJOR_30K', value: 30000 },
    { type: 'MAJOR_30K', value: 40000 },
    { type: 'ADVANCED_50K', value: 50000 },
    { type: 'ADVANCED_50K', value: 60000 },
  ];
  let bestType = 'BASIC_10K';
  let minDistance = Infinity;
  for (const m of milestones) {
    const distance = Math.abs(relativeKm - m.value);
    if (distance < minDistance) {
      minDistance = distance;
      bestType = m.type;
    }
  }
  return bestType;
}

export async function fleetMaintenanceRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /v1/maintenance - Cursor paginated history
  fastify.get('/maintenance', async (request, reply) => {
    try {
      const { cursor, limit = '50' } = request.query as { cursor?: string; limit?: string };
      const parsedLimit = parseInt(limit, 10);
      
      let query = `
        SELECT 
          m.id, m.uuid, m.unit_id, m.service_date, m.odometer_at_service, m.service_type, 
          m.cost, m.technician, m.created_at,
          u.id AS unit_name, u.brandId, u.modelId, u.placas
        FROM fleet_maintenance_logs m
        JOIN fleet_units u ON m.unit_id = u.id
      `;
      const params: (string | number)[] = [];

      if (cursor) {
        // Decode cursor (created_at_iso|id)
        const [cursorDate, cursorId] = Buffer.from(cursor, 'base64').toString('ascii').split('|');
        query += ` WHERE (m.created_at < ?) OR (m.created_at = ? AND m.id < ?) `;
        params.push(cursorDate, cursorDate, parseInt(cursorId, 10));
      }

      query += ` ORDER BY m.created_at DESC, m.id DESC LIMIT ? `;
      params.push(parsedLimit + 1);

      const [rows] = await db.execute<RowDataPacket[]>(query, params);
      
      let nextCursor = null;
      if (rows.length > parsedLimit) {
        const lastItem = rows[parsedLimit - 1];
        nextCursor = Buffer.from(`${(lastItem.created_at as Date).toISOString()}|${lastItem.id}`).toString('base64');
        rows.pop(); // Remove the extra item
      }

      return reply.send({ success: true, data: rows, nextCursor });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ success: false, message: 'Error retrieving maintenance logs' });
    }
  });

  // GET /v1/maintenance/template/:unitId - Generate Checklist Logic
  fastify.get('/maintenance/template/:unitId', async (request, reply) => {
    try {
      const { unitId } = request.params as { unitId: string };
      const { isMining, serviceType, odometer } = request.query as { isMining?: string; serviceType?: string; odometer?: string };
      
      const [units] = await db.execute<RowDataPacket[]>(
        'SELECT brandId, fuelTypeId, maintIntervalKm, odometer FROM fleet_units WHERE id = ?',
        [unitId]
      );
      
      if (units.length === 0) {
        return reply.code(404).send({ success: false, message: 'Unit not found' });
      }
      
      const unit = units[0];
      
      const currentOdometer = odometer !== undefined ? Number(odometer) : Number(unit.odometer || 0);
      
      // Deduce service type if not provided
      let queryServiceType = serviceType;
      if (!queryServiceType) {
        queryServiceType = getRecommendedServiceType(currentOdometer);
      }

      const serviceTypes: string[] = [queryServiceType];
      if (isMining === 'true' && !serviceTypes.includes('MINOR_MINING')) {
        serviceTypes.push('MINOR_MINING');
      }
      if (isMining === 'true' && queryServiceType === 'MINOR_MINING') {
        const standardServiceType = getRecommendedServiceType(currentOdometer);
        if (standardServiceType && standardServiceType !== 'MINOR_MINING' && !serviceTypes.includes(standardServiceType)) {
          serviceTypes.push(standardServiceType);
        }
      }

      const placeholders = serviceTypes.map(() => '?').join(', ');

      // Execute optimized UNION query to fetch standard plan tasks + brand/fuel-specific rules
      const query = `
        SELECT DISTINCT t.code, t.label, t.is_critical AS isCritical
        FROM (
          SELECT task_code FROM maintenance_plan_tasks WHERE service_type IN (${placeholders})
          UNION
          SELECT task_code FROM maintenance_brand_rules 
          WHERE service_type IN (${placeholders}) 
            AND (brand_id = ? OR brand_id IS NULL)
            AND (fuel_type_id = ? OR fuel_type_id IS NULL)
        ) combined
        JOIN maintenance_tasks t ON combined.task_code = t.code
      `;

      const [rows] = await db.execute<RowDataPacket[]>(query, [
        ...serviceTypes,
        ...serviceTypes,
        unit.brandId,
        unit.fuelTypeId,
      ]);

      const tasks = rows.map(r => ({
        code: r.code,
        label: r.label,
        isCritical: Boolean(r.isCritical),
      }));

      return reply.send({ success: true, tasks });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ success: false, message: 'Template generation failed' });
    }
  });

  // POST /v1/maintenance - Create log
  fastify.post('/maintenance', async (request, reply) => {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const data = createMaintenanceSchema.parse(request.body);
      const logUuid = crypto.randomUUID();

      const [units] = await connection.execute<RowDataPacket[]>(
        'SELECT id, odometer, maintIntervalKm FROM fleet_units WHERE id = ? FOR UPDATE',
        [data.unitId]
      );

      if (units.length === 0) throw new Error('Fleet unit not found');
      const unit = units[0];

      const [insertLog] = await connection.execute<ResultSetHeader>(
        `INSERT INTO fleet_maintenance_logs 
          (uuid, unit_id, service_date, odometer_at_service, service_type, cost, technician)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [logUuid, data.unitId, data.serviceDate, data.odometerAtService, data.serviceType, data.cost, data.technician]
      );
      const maintenanceId = insertLog.insertId;

      await Promise.all(
        data.details.map((detail) =>
          connection.execute(
            `INSERT INTO fleet_maintenance_details (maintenance_id, task_code, status, notes) VALUES (?, ?, ?, ?)`,
            [maintenanceId, detail.taskCode, detail.status, detail.notes || null]
          )
        )
      );

      const nextServiceReading = data.odometerAtService + (unit.maintIntervalKm || 10000);
      const finalOdometer = Math.max(unit.odometer, data.odometerAtService);

      await connection.execute(
        `UPDATE fleet_units SET 
          odometer = ?, lastServiceReading = ?, lastServiceDate = ?, 
          nextServiceReading_forecast = ?, status = 'Disponible', updatedAt = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [finalOdometer, data.odometerAtService, data.serviceDate, nextServiceReading, data.unitId]
      );

      await connection.commit();
      return reply.code(201).send({ success: true, message: 'Maintenance registered successfully', uuid: logUuid });
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
