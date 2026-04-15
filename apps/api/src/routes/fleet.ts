import { FastifyInstance } from 'fastify';
import { RowDataPacket } from 'mysql2/promise';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import db from '../services/db';

// ============================================================================
// ZOD SCHEMA: CREATE (v.7.1.2)
// ============================================================================
const createFleetSchema = z.object({
  assetType: z.enum(['Vehiculo', 'Maquinaria']),
  tag: z.string().min(2).max(50),
  numeroSerie: z.string().max(100).optional(),
  marca: z.string().min(1).max(100),
  modelo: z.string().min(1).max(100),
  year: z
    .number()
    .int()
    .min(1900)
    .max(new Date().getFullYear() + 1),
  motor: z.string().max(150).optional(),
  traccion: z.enum(['4x2', '4x4', 'Doble Tracción', 'AWD', 'Oruga', 'N/A']).default('N/A'),
  transmision: z
    .enum(['Automática', 'Estándar (Manual)', 'CVT', 'Hidrostática', 'N/A'])
    .default('N/A'),
  fuelType: z.enum(['Gasolina', 'Diesel', 'Eléctrico', 'Híbrido', 'N/A']).default('Diesel'),
  tireSpec: z.string().max(50).optional(),
  tireBrand: z.string().max(100).optional(),
  capacidadCarga: z.string().max(50).optional(),
  odometer: z.number().min(0).default(0),
  sede: z.string().max(150).optional(),
  centroMantenimiento: z.enum(['PIIC', 'Archon Core']).default('PIIC'),
  vigenciaSeguro: z.string().optional().nullable(), // ISO date string
  vencimientoVerificacion: z.string().optional().nullable(), // ISO date string
  tarjetaCirculacion: z.string().max(100).optional(),
  status: z
    .enum(['Disponible', 'En Ruta', 'En Mantenimiento', 'Descontinuada'])
    .default('Disponible'),
  assignedOperatorId: z.number().int().optional().nullable(),
});

// ============================================================================
// ZOD SCHEMA: UPDATE (v.7.1.2)
// ============================================================================
const updateFleetSchema = z.object({
  assetType: z.enum(['Vehiculo', 'Maquinaria']).optional(),
  tag: z.string().min(2).max(50).optional(),
  numeroSerie: z.string().max(100).optional(),
  marca: z.string().min(1).max(100).optional(),
  modelo: z.string().min(1).max(100).optional(),
  year: z
    .number()
    .int()
    .min(1900)
    .max(new Date().getFullYear() + 1)
    .optional(),
  motor: z.string().max(150).optional(),
  traccion: z.enum(['4x2', '4x4', 'Doble Tracción', 'AWD', 'Oruga', 'N/A']).optional(),
  transmision: z.enum(['Automática', 'Estándar (Manual)', 'CVT', 'Hidrostática', 'N/A']).optional(),
  fuelType: z.enum(['Gasolina', 'Diesel', 'Eléctrico', 'Híbrido', 'N/A']).optional(),
  tireSpec: z.string().max(50).optional(),
  tireBrand: z.string().max(100).optional(),
  capacidadCarga: z.string().max(50).optional(),
  odometer: z.number().min(0).optional(),
  sede: z.string().max(150).optional(),
  centroMantenimiento: z.enum(['PIIC', 'Archon Core']).optional(),
  vigenciaSeguro: z.string().optional().nullable(),
  vencimientoVerificacion: z.string().optional().nullable(),
  tarjetaCirculacion: z.string().max(100).optional(),
  status: z.enum(['Disponible', 'En Ruta', 'En Mantenimiento', 'Descontinuada']).optional(),
  assignedOperatorId: z.number().int().optional().nullable(),
});

// ============================================================================
// DB INTERFACE (v.7.1.2)
// ============================================================================
interface FleetUnit extends RowDataPacket {
  id: string;
  uuid: string;
  asset_type: string;
  tag: string;
  numero_serie: string | null;
  marca: string;
  modelo: string;
  year: number;
  motor: string | null;
  traccion: string;
  transmision: string;
  fuel_type: string;
  tire_spec: string | null;
  tire_brand: string | null;
  capacidad_carga: string | null;
  odometer: number;
  sede: string | null;
  centro_mantenimiento: string;
  vigencia_seguro: string | null;
  vencimiento_verificacion: string | null;
  tarjeta_circulacion: string | null;
  status: string;
  assigned_operator_id: number | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// ROUTES (v.7.1.2)
// ============================================================================
export default async function fleetRoutes(fastify: FastifyInstance): Promise<void> {
  // Global Security middleware
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
   */
  fastify.post('/fleet', async (request, reply) => {
    const parse = createFleetSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.code(400).send({ error: 'Invalid data format', details: parse.error.format() });
    }

    const {
      assetType,
      tag,
      numeroSerie,
      marca,
      modelo,
      year,
      motor,
      traccion,
      transmision,
      fuelType,
      tireSpec,
      tireBrand,
      capacidadCarga,
      odometer,
      sede,
      centroMantenimiento,
      vigenciaSeguro,
      vencimientoVerificacion,
      tarjetaCirculacion,
      status,
      assignedOperatorId,
    } = parse.data;

    const uuid = randomUUID();

    try {
      // Check for duplicate tag
      const [existing] = await db.execute<FleetUnit[]>('SELECT id FROM fleet_units WHERE tag = ?', [
        tag,
      ]);
      if (existing.length > 0) {
        return reply
          .code(409)
          .send({ error: `Número Económico '${tag}' ya existe en el registro` });
      }

      // Check for duplicate numero_serie
      if (numeroSerie) {
        const [existingSerie] = await db.execute<FleetUnit[]>(
          'SELECT id FROM fleet_units WHERE numero_serie = ?',
          [numeroSerie]
        );
        if (existingSerie.length > 0) {
          return reply
            .code(409)
            .send({ error: `Número de serie '${numeroSerie}' ya existe en el registro` });
        }
      }

      // Auto-generate FLXXX ID
      const [lastUnit] = await db.execute<FleetUnit[]>(
        'SELECT id FROM fleet_units WHERE id LIKE "FL%" ORDER BY id DESC LIMIT 1'
      );
      let nextId = 'FL001';
      if (lastUnit.length > 0) {
        const lastNum = parseInt(lastUnit[0].id.replace('FL', ''), 10);
        nextId = `FL${String(lastNum + 1).padStart(3, '0')}`;
      }

      await db.execute(
        `INSERT INTO fleet_units (
          id, uuid, asset_type, tag, numero_serie, marca, modelo, year, motor,
          traccion, transmision, fuel_type, tire_spec, tire_brand,
          capacidad_carga, odometer, sede, centro_mantenimiento,
          vigencia_seguro, vencimiento_verificacion, tarjeta_circulacion,
          status, assigned_operator_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          nextId,
          uuid,
          assetType,
          tag,
          numeroSerie || null,
          marca,
          modelo,
          year,
          motor || null,
          traccion,
          transmision,
          fuelType,
          tireSpec || null,
          tireBrand || null,
          capacidadCarga || null,
          odometer,
          sede || null,
          centroMantenimiento,
          vigenciaSeguro || null,
          vencimientoVerificacion || null,
          tarjetaCirculacion || null,
          status,
          assignedOperatorId || null,
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
   */
  fastify.patch('/fleet/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const parse = updateFleetSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.code(400).send({ error: 'Invalid update data', details: parse.error.format() });
    }

    const raw = parse.data;
    const updates: Record<string, string | number | boolean | null> = {};

    if (raw.assetType !== undefined) updates.asset_type = raw.assetType;
    if (raw.tag !== undefined) updates.tag = raw.tag;
    if (raw.numeroSerie !== undefined) updates.numero_serie = raw.numeroSerie ?? null;
    if (raw.marca !== undefined) updates.marca = raw.marca;
    if (raw.modelo !== undefined) updates.modelo = raw.modelo;
    if (raw.year !== undefined) updates.year = raw.year;
    if (raw.motor !== undefined) updates.motor = raw.motor ?? null;
    if (raw.traccion !== undefined) updates.traccion = raw.traccion;
    if (raw.transmision !== undefined) updates.transmision = raw.transmision;
    if (raw.fuelType !== undefined) updates.fuel_type = raw.fuelType;
    if (raw.tireSpec !== undefined) updates.tire_spec = raw.tireSpec ?? null;
    if (raw.tireBrand !== undefined) updates.tire_brand = raw.tireBrand ?? null;
    if (raw.capacidadCarga !== undefined) updates.capacidad_carga = raw.capacidadCarga ?? null;
    if (raw.odometer !== undefined) updates.odometer = raw.odometer;
    if (raw.sede !== undefined) updates.sede = raw.sede ?? null;
    if (raw.centroMantenimiento !== undefined)
      updates.centro_mantenimiento = raw.centroMantenimiento;
    if (raw.vigenciaSeguro !== undefined) updates.vigencia_seguro = raw.vigenciaSeguro ?? null;
    if (raw.vencimientoVerificacion !== undefined)
      updates.vencimiento_verificacion = raw.vencimientoVerificacion ?? null;
    if (raw.tarjetaCirculacion !== undefined)
      updates.tarjeta_circulacion = raw.tarjetaCirculacion ?? null;
    if (raw.status !== undefined) updates.status = raw.status;
    if (raw.assignedOperatorId !== undefined)
      updates.assigned_operator_id = raw.assignedOperatorId ?? null;

    const fields = Object.keys(updates);
    if (fields.length === 0) {
      return reply.code(400).send({ error: 'No update parameters provided' });
    }

    try {
      const setClause = fields.map((f) => `${f} = ?`).join(', ');
      const values = [...Object.values(updates), id];
      const [result] = await db.execute(`UPDATE fleet_units SET ${setClause} WHERE id = ?`, values);
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
   */
  fastify.delete('/fleet/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const [result] = await db.execute('DELETE FROM fleet_units WHERE id = ?', [id]);
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
