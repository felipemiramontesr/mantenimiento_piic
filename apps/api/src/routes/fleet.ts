import { FastifyInstance } from 'fastify';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import db from '../services/db';
import EncryptionService from '../services/encryption';
import { toSnakeCase } from '../utils/mappers';

// ============================================================================
// ZOD SCHEMA: CREATE
// ============================================================================
const createFleetSchema = z.object({
  assetType: z.enum(['Vehiculo', 'Maquinaria', 'Herramienta']),
  id: z.string().min(2).max(50),
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
    .enum(['Diaria', 'Semanal', 'Mensual', 'Trimestral', 'Bimestral', 'Semestral', 'Anual'])
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
  // 🔱 Archon Intelligence (v.18.0.0)
  maintenanceTimeFreqId: z.number().int().optional().nullable(),
  maintenanceUsageFreqId: z.number().int().optional().nullable(),
  lastServiceDate: z.string().optional().nullable(),
  lastServiceReading: z.number().optional().default(0),
});

// ============================================================================
// ZOD SCHEMA: UPDATE
// ============================================================================
const updateFleetSchema = z.object({
  assetType: z.enum(['Vehiculo', 'Maquinaria', 'Herramienta']).optional(),
  id: z.string().min(2).max(50).optional(),
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
    .enum(['Diaria', 'Semanal', 'Mensual', 'Trimestral', 'Bimestral', 'Semestral', 'Anual'])
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
  // 🔱 Archon Intelligence (v.18.0.0)
  maintenanceTimeFreqId: z.number().int().optional().nullable(),
  maintenanceUsageFreqId: z.number().int().optional().nullable(),
  lastServiceDate: z.string().optional().nullable(),
  lastServiceReading: z.number().optional().nullable(),
});

// ============================================================================
// DB INTERFACE (v.7.2.3)
// ============================================================================
interface FleetUnit extends RowDataPacket {
  id: string;
  uuid: string;
  asset_type: string;
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
  // 🔱 Archon Intelligence (v.18.0.0)
  maintenance_time_freq_id: number | null;
  maintenance_usage_freq_id: number | null;
  last_service_date: string | null;
  last_service_reading: number;
  current_reading: number;
  // 🔱 Catalog Joint Data (for computation)
  time_limit_days: number | null;
  usage_limit_units: number | null;
  usage_unit_name: string | null;
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
  fastify.get('/fleet', async (_request, reply) => {
    try {
      const query = `
        SELECT 
          f.*,
          ct.numeric_value AS time_limit_days,
          cu.numeric_value AS usage_limit_units,
          cu.unit AS usage_unit_name
        FROM fleet_units f
        LEFT JOIN common_catalogs ct ON f.maintenance_time_freq_id = ct.id
        LEFT JOIN common_catalogs cu ON f.maintenance_usage_freq_id = cu.id
        ORDER BY f.created_at DESC
      `;

      const [rows] = await db.execute<FleetUnit[]>(query);

      // 🛡️ SENTINEL INTELLIGENCE LAYER: Decryption + Predictive Computation
      const processedRows = rows.map((unit) => {
        // 1. Decryption (ALE Layer)
        const decrypted = {
          ...unit,
          placas: unit.placas ? EncryptionService.decrypt(unit.placas) : unit.placas,
          numero_serie: unit.numero_serie
            ? EncryptionService.decrypt(unit.numero_serie)
            : unit.numero_serie,
          motor: unit.motor ? EncryptionService.decrypt(unit.motor) : unit.motor,
          tarjeta_circulacion: unit.tarjeta_circulacion
            ? EncryptionService.decrypt(unit.tarjeta_circulacion)
            : unit.tarjeta_circulacion,
        };

        // 2. Predictive Maintenance Logic (v.18.6.0)
        const today = new Date();
        const lastServiceDate = unit.last_service_date ? new Date(unit.last_service_date) : null;
        const lastReading = unit.last_service_reading || 0;
        const currentReading = unit.current_reading || 0;

        // Trigger A: Time Based
        let timeProgress = 0;
        if (lastServiceDate && unit.time_limit_days) {
          const diffMs = today.getTime() - lastServiceDate.getTime();
          const diffDays = diffMs / (1000 * 3600 * 24);
          timeProgress = Math.max(0, diffDays / unit.time_limit_days);
        }

        // Trigger B: Usage Based (KM/HRS)
        let usageProgress = 0;
        if (unit.usage_limit_units) {
          const diffUnits = currentReading - lastReading;
          usageProgress = Math.max(0, diffUnits / unit.usage_limit_units);
        }

        // Aggregate Health Score (The most critical trigger wins)
        const maxProgress = Math.max(timeProgress, usageProgress);
        const healthScore = Math.max(0, Math.min(100, (1 - maxProgress) * 100));

        // State Classification
        let healthStatus = 'Healthy';
        let healthColor = '#10b981'; // Green

        if (maxProgress >= 1.0) {
          healthStatus = 'Overdue';
          healthColor = '#ef4444'; // Red
        } else if (maxProgress >= 0.7) {
          healthStatus = 'Caution';
          healthColor = '#f2b705'; // Yellow
        }

        return {
          ...decrypted,
          health_score: Math.round(healthScore),
          health_status: healthStatus,
          health_color: healthColor,
          days_since_service: lastServiceDate
            ? Math.floor((today.getTime() - lastServiceDate.getTime()) / (1000 * 3600 * 24))
            : null,
          units_since_service: currentReading - lastReading,
        };
      });

      return reply.send({ success: true, count: processedRows.length, data: processedRows });
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
      // Check for duplicate ID (Manual Entry ASM-xxx)
      const [existing] = await db.execute<FleetUnit[]>('SELECT id FROM fleet_units WHERE id = ?', [
        parse.data.id,
      ]);
      if (existing.length > 0) {
        return reply
          .code(409)
          .send({ error: `El identificador '${parse.data.id}' ya existe en el registro master` });
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

      const { id } = parse.data;

      const payload = { ...parse.data } as Record<string, unknown>;
      if (payload.motor) payload.motor = EncryptionService.encrypt(payload.motor as string);
      if (payload.tarjetaCirculacion)
        payload.tarjetaCirculacion = EncryptionService.encrypt(
          payload.tarjetaCirculacion as string
        );

      // 🛡️ B.I.G (Blind Index Generation): Identity Fortification
      if (payload.numeroSerie) {
        payload.numeroSerieHash = EncryptionService.generateBlindIndex(
          payload.numeroSerie as string
        );
        payload.numeroSerie = EncryptionService.encrypt(payload.numeroSerie as string);
      }

      if (payload.placas) {
        payload.placasHash = EncryptionService.generateBlindIndex(payload.placas as string);
        payload.placas = EncryptionService.encrypt(payload.placas as string);
      }

      // Map dynamic intelligence columns (v.18.9.0)
      const intelligencePayload = {
        ...payload,
        id,
        uuid,
        currentReading: parse.data.odometer || 0,
      };

      const dbData = toSnakeCase(intelligencePayload);
      const fields = Object.keys(dbData);
      const placeholders = fields.map(() => '?').join(', ');

      const values = Object.values(dbData).map((v) => {
        if (v !== null && (Array.isArray(v) || typeof v === 'object')) {
          return JSON.stringify(v);
        }
        return v;
      });

      await db.execute(
        `INSERT INTO fleet_units (${fields.join(', ')}) VALUES (${placeholders})`,
        values
      );

      return reply.code(201).send({ success: true, id, uuid });
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
      const [result] = await db.execute<ResultSetHeader>(
        `UPDATE fleet_units SET ${setClause} WHERE id = ?`,
        values
      );
      const affected = result.affectedRows;
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
