import { FastifyInstance } from 'fastify';
import { RowDataPacket } from 'mysql2/promise';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import db from '../services/db';

const createFleetSchema = z.object({
  tag: z.string().min(2).max(50),
  unitName: z.string().min(2).max(100),
  year: z.number().int().min(1900).max(new Date().getFullYear() + 1),
  fuelType: z.enum(['Gasolina', 'Diesel']),
  tireSpec: z.string().max(50).optional(),
  tireBrand: z.string().max(100).optional(),
  unitType: z.string().min(2).max(100),
  unitUsage: z.string().min(2).max(100),
  status: z.enum(['Disponible', 'En Ruta', 'En Mantenimiento', 'Descontinuada']).default('Disponible'),
  odometer: z.number().min(0).default(0),
  assignedOperatorId: z.number().int().optional().nullable(),
});

const updateFleetSchema = z.object({
  tag: z.string().min(2).max(50).optional(),
  unitName: z.string().min(2).max(100).optional(),
  year: z.number().int().min(1900).max(new Date().getFullYear() + 1).optional(),
  fuelType: z.enum(['Gasolina', 'Diesel']).optional(),
  tireSpec: z.string().max(50).optional(),
  tireBrand: z.string().max(100).optional(),
  unitType: z.string().min(2).max(100).optional(),
  unitUsage: z.string().min(2).max(100).optional(),
  status: z.enum(['Disponible', 'En Ruta', 'En Mantenimiento', 'Descontinuada']).optional(),
  odometer: z.number().min(0).optional(),
  assignedOperatorId: z.number().int().optional().nullable(),
});

interface FleetUnit extends RowDataPacket {
  id: string; // FLXXX format
  uuid: string;
  tag: string;
  unit_name: string;
  year: number;
  fuel_type: string;
  tire_spec: string | null;
  tire_brand: string | null;
  unit_type: string;
  unit_usage: string;
  status: string;
  odometer: number;
  assigned_operator_id: number | null;
  created_at: string;
  updated_at: string;
}

export default async function fleetRoutes(fastify: FastifyInstance): Promise<void> {
  // Global Security middleware for all fleet endpoints
  fastify.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify();
      return undefined;
    } catch (err) {
      return reply.code(401).send({ error: 'Unauthorized: Valid Session required' });
    }
  });

  /**
   * GET /api/v1/fleet
   * Retrieves the comprehensive inventory mapping of vehicles.
   */
  fastify.get('/fleet', async (request, reply) => {
    try {
      const [rows] = await db.execute<FleetUnit[]>(
        'SELECT * FROM fleet_units ORDER BY created_at DESC'
      );
      
      return reply.send({ success: true, count: rows.length, data: rows });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal Database Exception' });
    }
  });

  /**
   * POST /api/v1/fleet
   * Register a new vehicle unit into the inventory with auto-generated FLXXX ID.
   */
  fastify.post('/fleet', async (request, reply) => {
    const parse = createFleetSchema.safeParse(request.body);
    
    if (!parse.success) {
      return reply.code(400).send({ error: 'Invalid data format', details: parse.error.format() });
    }

    const { 
      tag, 
      unitName, 
      year, 
      fuelType, 
      tireSpec, 
      tireBrand, 
      unitType, 
      unitUsage, 
      status, 
      odometer, 
      assignedOperatorId 
    } = parse.data;
    const uuid = randomUUID();

    try {
      // 1. Check for duplicate tags
      const [existing] = await db.execute<FleetUnit[]>(
        'SELECT id FROM fleet_units WHERE tag = ?',
        [tag]
      );

      if (existing.length > 0) {
        return reply.code(409).send({ error: `Unit identity '${tag}' already exists in registry` });
      }

      // 2. Generate next FLXXX ID
      const [lastUnit] = await db.execute<FleetUnit[]>(
        'SELECT id FROM fleet_units WHERE id LIKE "FL%" ORDER BY id DESC LIMIT 1'
      );

      let nextId = 'FL001';
      if (lastUnit.length > 0) {
        const lastIdStr = lastUnit[0].id; // e.g., "FL005"
        const lastNum = parseInt(lastIdStr.replace('FL', ''), 10);
        nextId = `FL${String(lastNum + 1).padStart(3, '0')}`;
      }

      // 3. Insert into DB (Mapping camelCase back to snake_case columns)
      await db.execute(
        `INSERT INTO fleet_units (
          id, uuid, tag, unit_name, year, fuel_type, tire_spec, tire_brand, unit_type, unit_usage, status, odometer, assigned_operator_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          nextId, uuid, tag, unitName, year, fuelType, tireSpec || null, tireBrand || null, 
          unitType, unitUsage, status, odometer, assignedOperatorId || null
        ]
      );

      return reply.code(201).send({ success: true, id: nextId, uuid });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to commit unit to registry' });
    }
  });

  /**
   * PATCH /api/v1/fleet/:id
   * Update metadata or status of an existing vehicle unit.
   */
  fastify.patch('/fleet/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const parse = updateFleetSchema.safeParse(request.body);

    if (!parse.success) {
      return reply.code(400).send({ error: 'Invalid update data', details: parse.error.format() });
    }

    const rawUpdates = parse.data;
    const updates: Record<string, string | number | boolean | null> = {};

    // Map camelCase DTO to snake_case DB columns
    if (rawUpdates.tag !== undefined) updates.tag = rawUpdates.tag;
    if (rawUpdates.unitName !== undefined) updates.unit_name = rawUpdates.unitName;
    if (rawUpdates.year !== undefined) updates.year = rawUpdates.year;
    if (rawUpdates.fuelType !== undefined) updates.fuel_type = rawUpdates.fuelType;
    if (rawUpdates.tireSpec !== undefined) updates.tire_spec = rawUpdates.tireSpec;
    if (rawUpdates.tireBrand !== undefined) updates.tire_brand = rawUpdates.tireBrand;
    if (rawUpdates.unitType !== undefined) updates.unit_type = rawUpdates.unitType;
    if (rawUpdates.unitUsage !== undefined) updates.unit_usage = rawUpdates.unitUsage;
    if (rawUpdates.status !== undefined) updates.status = rawUpdates.status;
    if (rawUpdates.odometer !== undefined) updates.odometer = rawUpdates.odometer;
    if (rawUpdates.assignedOperatorId !== undefined) updates.assigned_operator_id = rawUpdates.assignedOperatorId;

    const fields = Object.keys(updates);
    
    if (fields.length === 0) {
      return reply.code(400).send({ error: 'No update parameters provided' });
    }

    try {
      const setClause = fields.map(f => `${f} = ?`).join(', ');
      const values = [...Object.values(updates), id];

      const [result] = await db.execute(
        `UPDATE fleet_units SET ${setClause} WHERE id = ?`,
        values
      );

      const affected = (result as { affectedRows: number }).affectedRows;
      
      if (affected === 0) {
        return reply.code(404).send({ error: 'Unit not found in registry' });
      }

      return reply.send({ success: true });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to update system registry' });
    }
  });

  /**
   * DELETE /api/v1/fleet/:id
   * Permanently decommission a unit from the active registry.
   */
  fastify.delete('/fleet/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      const [result] = await db.execute(
        'DELETE FROM fleet_units WHERE id = ?',
        [id]
      );

      const affected = (result as { affectedRows: number }).affectedRows;
      
      if (affected === 0) {
        return reply.code(404).send({ error: 'Unit not found in registry' });
      }

      return reply.send({ success: true });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Critical failure during unit decommissioning' });
    }
  });
}
