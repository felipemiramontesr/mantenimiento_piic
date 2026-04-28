import { FastifyInstance, FastifyBaseLogger } from 'fastify';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import db from '../services/db';
import EncryptionService from '../services/encryption';
import { toSnakeCase, toCamelCase } from '../utils/mappers';

// ============================================================================
// ZOD SCHEMA: CREATE
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
  motor: z.string().max(150).optional(),
  traccionId: z.number().int().optional().nullable(),
  transmisionId: z.number().int().optional().nullable(),
  fuelTypeId: z.number().int().optional().nullable(),
  tireSpec: z.string().max(50).optional(),
  tireBrandId: z.number().int().optional().nullable(),
  terrainTypeId: z.number().int().optional().nullable(),
  capacidadCarga: z.number().min(0).optional(),
  fuelTankCapacity: z.number().min(0),
  odometer: z.number().min(0).default(0),
  sede: z.string().max(150).optional(),
  centroMantenimiento: z.enum(['PIIC', 'Archon Core']).default('PIIC'),
  protocolStartDate: z.string().optional().nullable(),
  vigenciaSeguro: z.string().optional().nullable(),
  vencimientoVerificacion: z.string().optional().nullable(),
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
  dailyUsageAvg: z.number().min(0).optional().nullable(),
  // 🔱 Sovereign Asset Management (v.39.0.0)
  ownerId: z.number().int().optional().nullable(),
  complianceStatusId: z.number().int().optional().nullable(),
  accountingAccount: z.string().max(50).optional().nullable(),
  legalComplianceDate: z.string().optional().nullable(),
  insuranceExpiryDate: z.string().optional().nullable(),
  monthlyLeasePayment: z.number().min(0).default(0),
});

// ============================================================================
// ZOD SCHEMA: UPDATE
// ============================================================================
const updateFleetSchema = z.object({
  assetTypeId: z.number().int().optional(),
  id: z.string().min(2).max(50).optional(),
  placas: z.string().max(20).optional().nullable(),
  numeroSerie: z.string().max(100).optional(),
  images: z.array(z.string()).max(4).optional(),
  brandId: z.number().int().optional(),
  modelId: z.number().int().optional(),
  year: z
    .number()
    .int()
    .min(1900)
    .max(new Date().getFullYear() + 1)
    .optional(),
  departmentId: z.number().int().optional().nullable(),
  operationalUseId: z.number().int().optional().nullable(),
  motor: z.string().max(150).optional(),
  traccionId: z.number().int().optional().nullable(),
  transmisionId: z.number().int().optional().nullable(),
  fuelTypeId: z.number().int().optional().nullable(),
  tireSpec: z.string().max(50).optional(),
  tireBrandId: z.number().int().optional().nullable(),
  terrainTypeId: z.number().int().optional().nullable(),
  capacidadCarga: z.number().min(0).optional(),
  fuelTankCapacity: z.number().min(0).optional(),
  odometer: z.number().min(0).optional(),
  sede: z.string().max(150).optional(),
  centroMantenimiento: z.enum(['PIIC', 'Archon Core']).optional(),
  protocolStartDate: z.string().optional().nullable(),
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
  dailyUsageAvg: z.number().min(0).optional().nullable(),
  // 🔱 Sovereign Asset Management (v.39.0.0)
  ownerId: z.number().int().optional().nullable(),
  complianceStatusId: z.number().int().optional().nullable(),
  accountingAccount: z.string().max(50).optional().nullable(),
  legalComplianceDate: z.string().optional().nullable(),
  insuranceExpiryDate: z.string().optional().nullable(),
  monthlyLeasePayment: z.number().min(0).optional(),
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
  marca: string | null;
  brand_id: number | null;
  modelo: string | null;
  model_id: number | null;
  images: string | null;
  year: number;
  departamento: string | null;
  department_id: number | null;
  uso: string | null;
  operational_use_id: number | null;
  motor: string | null;
  traccion: string;
  transmision: string;
  fuel_type: string;
  tire_spec: string | null;
  tire_brand: string | null;
  tire_brand_id: number | null;
  tipo_terreno: string | null;
  terrain_type_id: number | null;
  capacidad_carga: string | null;
  fuel_tank_capacity: number;
  odometer: number;
  sede: string | null;
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
  // 🔱 Archon Analytical Engine (v.20.0.0)
  availability_index: number;
  mtbf_hours: number;
  mttr_hours: number;
  backlog_count: number;
  // 🔱 Relational ID Fields (v.21.0.0)
  asset_type_id: number;
  fuel_type_id: number;
  traccion_id: number;
  transmision_id: number;
  daily_usage_avg: number | null;
  // 🔱 Sovereign Asset Management (v.39.0.0)
  owner_id: number | null;
  owner: string | null;
  compliance_status_id: number | null;
  compliance_status: string | null;
  accounting_account: string | null;
  legal_compliance_date: string | null;
  insurance_expiry_date: string | null;
  monthly_lease_payment: number;
}

interface UnitHealth {
  healthScore: number;
  healthStatus: string;
  healthColor: string;
  lastServiceDate: Date | null;
  currentReading: number;
  lastReading: number;
  today: Date;
}

/**
 * 🛡️ SENTINEL INTELLIGENCE HELPER
 * Purpose: Decrypt, Parse, and Compute Health Metrics for a single Fleet Unit.
 * Logic: Extracted to satisfy Cognitive Complexity limits (v.21.0.1)
 */
/**
 * 🛡️ SENTINEL INTELLIGENCE HELPER: Image Parser
 */
function parseUnitImages(
  rawImages: string | null,
  unitId: string,
  logger: FastifyBaseLogger
): string[] {
  if (!rawImages) return [];
  try {
    return typeof rawImages === 'string'
      ? JSON.parse(rawImages)
      : (rawImages as unknown as string[]);
  } catch (e) {
    logger.warn(`Failed to parse images for unit ${unitId}: ${e}`);
    return [];
  }
}

/**
 * 🛡️ SENTINEL INTELLIGENCE HELPER: Health Computer
 */
function computeUnitHealth(unit: FleetUnit): UnitHealth {
  const today = new Date();
  const lastServiceDate = unit.last_service_date ? new Date(unit.last_service_date) : null;
  const lastReading = Number(unit.last_service_reading || 0);
  const currentReading = Number(unit.current_reading || 0);

  // Trigger A: Time Based
  let timeProgress = 0;
  if (lastServiceDate && unit.time_limit_days) {
    const diffMs = today.getTime() - lastServiceDate.getTime();
    const diffDays = diffMs / (1000 * 3600 * 24);
    timeProgress = Math.max(0, diffDays / Number(unit.time_limit_days));
  }

  // Trigger B: Usage Based (KM/HRS)
  let usageProgress = 0;
  if (unit.usage_limit_units) {
    const diffUnits = currentReading - lastReading;
    usageProgress = Math.max(0, diffUnits / Number(unit.usage_limit_units));
  }

  const maxProgress = Math.max(timeProgress, usageProgress);
  const healthScore = Math.round(Math.max(0, Math.min(100, (1 - maxProgress) * 100)));

  let healthStatus = 'Healthy';
  let healthColor = '#10b981';

  if (maxProgress >= 1.0) {
    healthStatus = 'Overdue';
    healthColor = '#ef4444';
  } else if (maxProgress >= 0.7) {
    healthStatus = 'Caution';
    healthColor = '#f2b705';
  }

  return {
    healthScore,
    healthStatus,
    healthColor,
    lastServiceDate,
    currentReading,
    lastReading,
    today,
  };
}

/**
 * 🛡️ SENTINEL INTELLIGENCE HELPER: Main Processor
 */
function processFleetUnit(unit: FleetUnit, logger: FastifyBaseLogger): Record<string, unknown> {
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
    // 🔱 Numeric Normalization (v.21.0.2)
    availability_index: Number(unit.availability_index || 0),
    mtbf_hours: Number(unit.mtbf_hours || 0),
    mttr_hours: Number(unit.mttr_hours || 0),
    backlog_count: Number(unit.backlog_count || 0),
    time_limit_days: unit.time_limit_days ? Number(unit.time_limit_days) : null,
    usage_limit_units: unit.usage_limit_units ? Number(unit.usage_limit_units) : null,
    time_freq_label: unit.time_freq_label,
    usage_freq_label: unit.usage_freq_label,
  };

  const {
    healthScore,
    healthStatus,
    healthColor,
    lastServiceDate,
    currentReading,
    lastReading,
    today,
  } = computeUnitHealth(decrypted as unknown as FleetUnit);

  return toCamelCase({
    ...decrypted,
    images: parseUnitImages(unit.images, unit.id, logger),
    health_score: healthScore,
    health_status: healthStatus,
    health_color: healthColor,
    days_since_service: lastServiceDate
      ? Math.floor((today.getTime() - lastServiceDate.getTime()) / (1000 * 3600 * 24))
      : null,
    units_since_service: currentReading - lastReading,
  }) as Record<string, unknown>;
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
          c_at.label AS asset_type,
          c_brand.label AS marca,
          c_model.label AS modelo,
          c_dept.label AS departamento,
          c_use.label AS uso,
          c_ft.label AS fuel_type,
          c_tr.label AS traccion,
          c_ts.label AS transmision,
          c_tire_brand.label AS tire_brand,
          c_terrain.label AS tipo_terreno,
          c_owner.label AS owner,
          c_compl.label AS compliance_status,
          ct.numeric_value AS time_limit_days,
          ct.label AS time_freq_label,
          cu.numeric_value AS usage_limit_units,
          cu.label AS usage_freq_label,
          cu.unit AS usage_unit_name
        FROM fleet_units f
        LEFT JOIN common_catalogs c_at ON f.asset_type_id = c_at.id
        LEFT JOIN common_catalogs c_brand ON f.brand_id = c_brand.id
        LEFT JOIN common_catalogs c_model ON f.model_id = c_model.id
        LEFT JOIN common_catalogs c_dept ON f.department_id = c_dept.id
        LEFT JOIN common_catalogs c_use ON f.operational_use_id = c_use.id
        LEFT JOIN common_catalogs c_ft ON f.fuel_type_id = c_ft.id
        LEFT JOIN common_catalogs c_tr ON f.traccion_id = c_tr.id
        LEFT JOIN common_catalogs c_ts ON f.transmision_id = c_ts.id
        LEFT JOIN common_catalogs c_tire_brand ON f.tire_brand_id = c_tire_brand.id
        LEFT JOIN common_catalogs c_terrain ON f.terrain_type_id = c_terrain.id
        LEFT JOIN common_catalogs c_owner ON f.owner_id = c_owner.id
        LEFT JOIN common_catalogs c_compl ON f.compliance_status_id = c_compl.id
        LEFT JOIN common_catalogs ct ON f.maintenance_time_freq_id = ct.id
        LEFT JOIN common_catalogs cu ON f.maintenance_usage_freq_id = cu.id
        ORDER BY f.created_at DESC
      `;

      const [rows] = await db.execute<FleetUnit[]>(query);

      // 🛡️ SENTINEL INTELLIGENCE LAYER: Decryption + Predictive Computation
      const processedRows = rows.map((unit) => processFleetUnit(unit, fastify.log));

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
      let sqlError = 'Unknown DB Exception';

      if (error && typeof error === 'object') {
        sqlError =
          (error as { sqlMessage?: string }).sqlMessage || (error as Error).message || sqlError;
      } else if (typeof error === 'string') {
        sqlError = error;
      }

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
