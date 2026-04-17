import { FastifyInstance } from 'fastify';
import { RowDataPacket } from 'mysql2/promise';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import db from '../services/db';
import EncryptionService from '../services/encryption';
import { toSnakeCase } from '../utils/mappers';

// ============================================================================
// ZOD SCHEMA: CREATE
// ============================================================================
const createFleetSchema = z.object({
  assetType: z.enum(['Vehiculo', 'Maquinaria']),
  tag: z.string().min(2).max(50),
  placas: z.string().max(20).optional().nullable(),
  numeroSerie: z.string().max(100).optional(),
  images: z.array(z.string()).max(4).optional(),
  marca: z.string().min(1).max(100),
  modelo: z.string().min(1).max(100),
  year: z
    .number()
    .int()
    .min(1900)
    .max(new Date().getFullYear() + 1),
  departamento: z.string().max(150).optional().nullable(),
  uso: z.string().max(100).optional().nullable(),
  motor: z.string().max(150).optional(),
  traccion: z
    .enum(['4x2', '4x4', 'Doble Tracción', 'AWD', 'Oruga', 'No Aplica'])
    .default('No Aplica'),
  transmision: z
    .enum(['Automática', 'Estándar (Manual)', 'CVT', 'Hidrostática', 'No Aplica'])
    .default('No Aplica'),
  fuelType: z.enum(['Gasolina', 'Diesel', 'Eléctrico', 'Híbrido', 'No Aplica']).default('Diesel'),
  tireSpec: z.string().max(50).optional(),
  tireBrand: z.string().max(100).optional(),
  tipoTerreno: z.string().max(100).optional().nullable(),
  capacidadCarga: z.string().max(50).optional(),
  odometer: z.number().min(0).default(0),
  sede: z.string().max(150).optional(),
  maintenanceFrequency: z
    .enum(['Diaria', 'Semanal', 'Mensual', 'Bimestral', 'Semestral', 'Anual'])
    .default('Mensual'),
  centroMantenimiento: z.enum(['PIIC', 'Archon Core']).default('PIIC'),
  protocolStartDate: z.string().optional().nullable(), // ISO date string
  vigenciaSeguro: z.string().optional().nullable(), // ISO date string
  vencimientoVerificacion: z.string().optional().nullable(), // ISO date string
  tarjetaCirculacion: z.string().max(100).optional(),
  status: z
    .enum(['Disponible', 'En Ruta', 'En Mantenimiento', 'Descontinuada'])
    .default('Disponible'),
  assignedOperatorId: z.number().int().optional().nullable(),
  color: z.string().max(50).optional().nullable(),
  description: z.string().optional().nullable(),
});

// ============================================================================
// ZOD SCHEMA: UPDATE
// ============================================================================
const updateFleetSchema = z.object({
  assetType: z.enum(['Vehiculo', 'Maquinaria']).optional(),
  tag: z.string().min(2).max(50).optional(),
  placas: z.string().max(20).optional().nullable(),
  numeroSerie: z.string().max(100).optional(),
  images: z.array(z.string()).max(4).optional(),
  marca: z.string().min(1).max(100).optional(),
  modelo: z.string().min(1).max(100).optional(),
  year: z
    .number()
    .int()
    .min(1900)
    .max(new Date().getFullYear() + 1)
    .optional(),
  departamento: z.string().max(150).optional().nullable(),
  uso: z.string().max(100).optional().nullable(),
  motor: z.string().max(150).optional(),
  traccion: z.enum(['4x2', '4x4', 'Doble Tracción', 'AWD', 'Oruga', 'No Aplica']).optional(),
  transmision: z
    .enum(['Automática', 'Estándar (Manual)', 'CVT', 'Hidrostática', 'No Aplica'])
    .optional(),
  fuelType: z.enum(['Gasolina', 'Diesel', 'Eléctrico', 'Híbrido', 'No Aplica']).optional(),
  tireSpec: z.string().max(50).optional(),
  tireBrand: z.string().max(100).optional(),
  tipoTerreno: z.string().max(100).optional().nullable(),
  capacidadCarga: z.string().max(50).optional(),
  odometer: z.number().min(0).optional(),
  sede: z.string().max(150).optional(),
  maintenanceFrequency: z
    .enum(['Diaria', 'Semanal', 'Mensual', 'Bimestral', 'Semestral', 'Anual'])
    .optional(),
  centroMantenimiento: z.enum(['PIIC', 'Archon Core']).optional(),
  protocolStartDate: z.string().optional().nullable(), // ISO date string
  vigenciaSeguro: z.string().optional().nullable(),
  vencimientoVerificacion: z.string().optional().nullable(),
  tarjetaCirculacion: z.string().max(100).optional(),
  status: z.enum(['Disponible', 'En Ruta', 'En Mantenimiento', 'Descontinuada']).optional(),
  assignedOperatorId: z.number().int().optional().nullable(),
  color: z.string().max(50).optional().nullable(),
  description: z.string().optional().nullable(),
});

// ============================================================================
// DB INTERFACE (v.7.2.3)
// ============================================================================
interface FleetUnit extends RowDataPacket {
  id: string;
  uuid: string;
  asset_type: string;
  tag: string;
  placas: string | null;
  placas_hash: string | null;
  numero_serie: string | null;
  numero_serie_hash: string | null;
  marca: string;
  modelo: string;
  year: number;
  departamento: string | null;
  uso: string | null;
  motor: string | null;
  traccion: string;
  transmision: string;
  fuel_type: string;
  tire_spec: string | null;
  tire_brand: string | null;
  tipo_terreno: string | null;
  capacidad_carga: string | null;
  odometer: number;
  sede: string | null;
  maintenance_frequency: string;
  centro_mantenimiento: string;
  protocol_start_date: string | null;
  vigencia_seguro: string | null;
  vencimiento_verificacion: string | null;
  tarjeta_circulacion: string | null;
  status: string;
  assigned_operator_id: number | null;
  color: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// ROUTES (v.7.2.3)
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

      // 🛡️ SENTINEL DECRYPTION LAYER: Transform encrypted data for UI consumption
      const decryptedRows = rows.map((unit) => ({
        ...unit,
        placas: unit.placas ? EncryptionService.decrypt(unit.placas) : unit.placas,
        numero_serie: unit.numero_serie
          ? EncryptionService.decrypt(unit.numero_serie)
          : unit.numero_serie,
        motor: unit.motor ? EncryptionService.decrypt(unit.motor) : unit.motor,
        tarjeta_circulacion: unit.tarjeta_circulacion
          ? EncryptionService.decrypt(unit.tarjeta_circulacion)
          : unit.tarjeta_circulacion,
      }));

      return reply.send({ success: true, count: decryptedRows.length, data: decryptedRows });
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

    const uuid = randomUUID();

    try {
      // Check for duplicate tag
      const [existing] = await db.execute<FleetUnit[]>('SELECT id FROM fleet_units WHERE tag = ?', [
        parse.data.tag,
      ]);
      if (existing.length > 0) {
        return reply
          .code(409)
          .send({ error: `Número Económico '${parse.data.tag}' ya existe en el registro` });
      }

      // Check for duplicate numero_serie via Blind Index (Searchable Encryption)
      if (parse.data.numeroSerie) {
        const serieHash = EncryptionService.generateBlindIndex(parse.data.numeroSerie);
        const [existingSerie] = await db.execute<FleetUnit[]>(
          'SELECT id FROM fleet_units WHERE numero_serie_hash = ?',
          [serieHash]
        );
        if (existingSerie.length > 0) {
          return reply.code(409).send({
            error: `Número de serie '${parse.data.numeroSerie}' ya existe en el registro`,
          });
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

      const payload = { ...parse.data } as Record<string, unknown>;
      if (payload.motor) payload.motor = EncryptionService.encrypt(payload.motor);
      if (payload.tarjetaCirculacion)
        payload.tarjetaCirculacion = EncryptionService.encrypt(payload.tarjetaCirculacion);

      // 🛡️ B.I.G (Blind Index Generation): Identity Fortification
      if (payload.numeroSerie) {
        payload.numeroSerieHash = EncryptionService.generateBlindIndex(payload.numeroSerie);
        payload.numeroSerie = EncryptionService.encrypt(payload.numeroSerie);
      }

      if (payload.placas) {
        payload.placasHash = EncryptionService.generateBlindIndex(payload.placas);
        payload.placas = EncryptionService.encrypt(payload.placas);
      }

      const dbData = toSnakeCase({ ...payload, id: nextId, uuid });
      const fields = Object.keys(dbData);
      const placeholders = fields.map(() => '?').join(', ');
      const values = Object.values(dbData).map((v) => (v === undefined ? null : v));

      await db.execute(
        `INSERT INTO fleet_units (${fields.join(', ')}) VALUES (${placeholders})`,
        values
      );

      return reply.code(201).send({ success: true, id: nextId, uuid });
    } catch (error: unknown) {
      fastify.log.error(error);
      const sqlError =
        (error as { sqlMessage?: string }).sqlMessage ||
        (error as Error).message ||
        'Unknown DB Exception';
      return reply.code(500).send({ error: `Database Error: ${sqlError}` });
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

    const updates = toSnakeCase(parse.data) as Record<string, unknown>;

    // 🛡️ ALE (Application-Level Encryption): Secure identity during update
    if (updates.motor) updates.motor = EncryptionService.encrypt(updates.motor);
    if (updates.tarjeta_circulacion)
      updates.tarjeta_circulacion = EncryptionService.encrypt(updates.tarjeta_circulacion);

    // 🛡️ B.I.G (Blind Index Update): Identity Fortification
    if (updates.numero_serie) {
      updates.numero_serie_hash = EncryptionService.generateBlindIndex(updates.numero_serie);
      updates.numero_serie = EncryptionService.encrypt(updates.numero_serie);
    }

    if (updates.placas) {
      updates.placas_hash = EncryptionService.generateBlindIndex(updates.placas);
      updates.placas = EncryptionService.encrypt(updates.placas);
    }

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
