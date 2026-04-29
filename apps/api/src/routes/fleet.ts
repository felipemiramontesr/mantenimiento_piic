import { FastifyInstance, FastifyBaseLogger } from 'fastify';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import db from '../services/db';
import EncryptionService from '../services/encryption';

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
  assignedOperatorId: z.number().int().optional().nullable(),
  colorId: z.number().int().optional().nullable(),
  description: z.string().optional().nullable(),
  // 🔱 Archon Intelligence (v.18.0.0)
  maintenanceTimeFreqId: z.number().int().optional().nullable(),
  maintenanceUsageFreqId: z.number().int().optional().nullable(),
  maintIntervalDays: z.number().int().min(0).default(90),
  maintIntervalKm: z.number().min(0).default(5000),
  lastServiceDate: z.string().optional().nullable(),
  lastServiceReading: z.number().optional().default(0),
  dailyUsageAvg: z.number().min(0).optional().nullable(),
  // 🔱 Sovereign Asset Management (v.39.0.0)
  ownerId: z.number().int().optional().nullable(),
  complianceStatusId: z.number().int().optional().nullable(),
  accountingAccount: z.string().max(50).optional().nullable(),
  legalComplianceDate: z.string().optional().nullable(),
  insuranceExpiryDate: z.string().optional().nullable(),
  insuranceCompanyId: z.number().int().optional().nullable(),
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
  locationId: z.number().int().optional().nullable(),
  engineTypeId: z.number().int().optional().nullable(),
  traccionId: z.number().int().optional().nullable(),
  transmisionId: z.number().int().optional().nullable(),
  fuelTypeId: z.number().int().optional().nullable(),
  tireSpec: z.string().max(50).optional(),
  tireBrandId: z.number().int().optional().nullable(),
  terrainTypeId: z.number().int().optional().nullable(),
  capacidadCarga: z.number().min(0).optional(),
  fuelTankCapacity: z.number().min(0).optional(),
  odometer: z.number().min(0).optional(),
  maintenanceCenterId: z.number().int().optional().nullable(),
  protocolStartDate: z.string().optional().nullable(),
  vigenciaSeguro: z.string().optional().nullable(),
  vencimientoVerificacion: z.string().optional().nullable(),
  circulationCardNumber: z.string().max(100).optional(),
  status: z.enum(['Disponible', 'En Ruta', 'En Mantenimiento', 'Descontinuada']).optional(),
  assignedOperatorId: z.number().int().optional().nullable(),
  colorId: z.number().int().optional().nullable(),
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
  insuranceCompanyId: z.number().int().optional().nullable(),
  monthlyLeasePayment: z.number().min(0).optional(),
});

// ============================================================================
// DB INTERFACE (v.7.2.3) - NATIVE CAMELCASE SMMETRY
// ============================================================================
interface FleetUnit extends RowDataPacket {
  id: string;
  uuid: string;
  assetType: string;
  placas: string | null;
  placasHash: string | null;
  numeroSerie: string | null;
  numeroSerieHash: string | null;
  brandId: number | null;
  modelId: number | null;
  images: string | null;
  year: number;
  departmentId: number | null;
  operationalUseId: number | null;
  locationId: number | null;
  engineTypeId: number | null;
  colorId: number | null;
  tireSpec: string | null;
  tireBrandId: number | null;
  terrainTypeId: number | null;
  capacidadCarga: string | null;
  fuelTankCapacity: number;
  maintIntervalDays: number;
  maintIntervalKm: number;
  odometer: number;
  sede: string | null;
  centroMantenimiento: string | null;
  maintenanceCenterId: number | null;
  protocolStartDate: string | null;
  insuranceExpiryDate: string | null;
  vencimientoVerificacion: string | null;
  circulationCardNumber: string | null;
  status: string;
  assignedOperatorId: number | null;
  color: string | null;
  motor: string | null;
  insuranceCompany: string | null;
  insuranceCompanyId: number | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  maintenanceTimeFreqId: number | null;
  maintenanceUsageFreqId: number | null;
  lastServiceDate: string | null;
  lastServiceReading: number;
  currentReading: number;
  availabilityIndex: number;
  mtbfHours: number;
  mttrHours: number;
  backlogCount: number;
  assetTypeId: number;
  fuelTypeId: number;
  traccionId: number;
  transmisionId: number;
  dailyUsageAvg: number | null;
  ownerId: number | null;
  owner: string | null;
  complianceStatusId: number | null;
  complianceStatus: string | null;
  accountingAccount: string | null;
  legalComplianceDate: string | null;
  monthlyLeasePayment: number;
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
  const lastServiceDate = unit.lastServiceDate ? new Date(unit.lastServiceDate) : null;
  const lastReading = Number(unit.lastServiceReading || 0);
  const currentReading = Number(unit.currentReading || 0);

  // Trigger A: Time Based
  let timeProgress = 0;
  const timeLimit = Number(unit.maintIntervalDays || 180); // 🔱 Archon Default: 180 days
  if (lastServiceDate && timeLimit > 0) {
    const diffMs = today.getTime() - lastServiceDate.getTime();
    const diffDays = diffMs / (1000 * 3600 * 24);
    timeProgress = Math.max(0, diffDays / timeLimit);
  }

  // Trigger B: Usage Based (KM/HRS)
  let usageProgress = 0;
  const usageLimit = Number(unit.maintIntervalKm || 10000); // 🔱 Archon Default: 10,000 units
  if (usageLimit > 0) {
    const diffUnits = currentReading - lastReading;
    usageProgress = Math.max(0, diffUnits / usageLimit);
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
    numeroSerie: unit.numeroSerie ? EncryptionService.decrypt(unit.numeroSerie) : unit.numeroSerie,
    circulationCardNumber: unit.circulationCardNumber
      ? EncryptionService.decrypt(unit.circulationCardNumber)
      : unit.circulationCardNumber,
    // 🔱 Numeric Normalization (v.21.0.2)
    availabilityIndex: Number(unit.availabilityIndex || 0),
    mtbfHours: Number(unit.mtbfHours || 0),
    mttrHours: Number(unit.mttrHours || 0),
    backlogCount: Number(unit.backlogCount || 0),
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

  return {
    ...decrypted,
    images: parseUnitImages(unit.images, unit.id, logger),
    healthScore,
    healthStatus,
    healthColor,
    daysSinceService: lastServiceDate
      ? Math.floor((today.getTime() - lastServiceDate.getTime()) / (1000 * 3600 * 24))
      : null,
    unitsSinceService: currentReading - lastReading,
    nextServiceReading: Number(lastReading) + Number(unit.maintIntervalKm || 0),
  } as Record<string, unknown>;
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
          c_at.label AS assetType,
          c_brand.label AS marca,
          c_model.label AS modelo,
          c_dept.label AS departamento,
          c_use.label AS uso,
          c_ft.label AS fuelType,
          c_tr.label AS traccion,
          c_ts.label AS transmision,
          c_tire_brand.label AS tireBrand,
          c_terrain.label AS tipoTerreno,
          c_owner.label AS owner,
          c_compl.label AS complianceStatus,
          c_loc.label AS sede,
          c_mc.label AS centroMantenimiento,
          c_color.label AS color,
          c_eng.label AS motor,
          c_ins.label AS insuranceCompany,
          ct.label AS timeFreqLabel,
          cu.label AS usageFreqLabel,
          ct.numeric_value AS maintIntervalDays,
          cu.numeric_value AS maintIntervalKm,
          CASE 
            WHEN c_at.code = 'AT_MAQ' OR c_at.label = 'Maquinaria' THEN 'HRS'
            ELSE 'KM'
          END AS usageUnitName
        FROM fleet_units f
        LEFT JOIN common_catalogs c_at ON f.assetTypeId = c_at.id AND c_at.category = 'ASSET_TYPE'
        LEFT JOIN common_catalogs c_brand ON f.brandId = c_brand.id AND c_brand.category = 'BRAND'
        LEFT JOIN common_catalogs c_model ON f.modelId = c_model.id AND c_model.category = 'MODEL'
        LEFT JOIN common_catalogs c_dept ON f.departmentId = c_dept.id AND c_dept.category = 'DEPARTMENT'
        LEFT JOIN common_catalogs c_use ON f.operationalUseId = c_use.id AND c_use.category = 'OPERATIONAL_USE'
        LEFT JOIN common_catalogs c_ft ON f.fuelTypeId = c_ft.id AND c_ft.category = 'FUEL'
        LEFT JOIN common_catalogs c_tr ON f.traccionId = c_tr.id AND c_tr.category = 'DRIVE_TYPE'
        LEFT JOIN common_catalogs c_ts ON f.transmisionId = c_ts.id AND c_ts.category = 'TRANSMISSION'
        LEFT JOIN common_catalogs c_tire_brand ON f.tireBrandId = c_tire_brand.id AND c_tire_brand.category = 'TIRE_BRAND'
        LEFT JOIN common_catalogs c_terrain ON f.terrainTypeId = c_terrain.id AND c_terrain.category = 'TERRAIN_TYPE'
        LEFT JOIN common_catalogs c_owner ON f.ownerId = c_owner.id AND c_owner.category = 'FLEET_OWNER'
        LEFT JOIN common_catalogs c_compl ON f.complianceStatusId = c_compl.id AND c_compl.category = 'COMPLIANCE_STATUS'
        LEFT JOIN common_catalogs c_loc ON f.locationId = c_loc.id AND c_loc.category = 'LOCATION'
        LEFT JOIN common_catalogs c_mc ON f.maintenanceCenterId = c_mc.id AND c_mc.category = 'MAINTENANCE_CENTER'
        LEFT JOIN common_catalogs c_color ON f.colorId = c_color.id AND c_color.category = 'VEHICLE_COLOR'
        LEFT JOIN common_catalogs c_eng ON f.engineTypeId = c_eng.id AND c_eng.category = 'ENGINE_TYPE'
        LEFT JOIN common_catalogs c_ins ON f.insuranceCompanyId = c_ins.id AND c_ins.category = 'INSURANCE_COMPANY'
        LEFT JOIN common_catalogs ct ON f.maintenanceTimeFreqId = ct.id AND ct.category = 'FREQ_TIME'
        LEFT JOIN common_catalogs cu ON f.maintenanceUsageFreqId = cu.id AND cu.category = 'FREQ_USAGE'
        ORDER BY f.createdAt DESC
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

      // Check for duplicate numeroSerie via Blind Index (Searchable Encryption)
      if (parse.data.numeroSerie) {
        const serieHash = EncryptionService.generateBlindIndex(parse.data.numeroSerie);
        const [existingSerie] = await db.execute<FleetUnit[]>(
          'SELECT id FROM fleet_units WHERE numeroSerieHash = ?',
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
      if (payload.circulationCardNumber)
        payload.circulationCardNumber = EncryptionService.encrypt(
          payload.circulationCardNumber as string
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

      const fields = Object.keys(intelligencePayload);
      const placeholders = fields.map(() => '?').join(', ');

      const values = Object.values(intelligencePayload).map((v) => {
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

    const updates = { ...parse.data } as Record<string, unknown>;

    // 🛡️ ALE (Application-Level Encryption): Secure identity during update
    if (updates.circulationCardNumber)
      updates.circulationCardNumber = EncryptionService.encrypt(
        updates.circulationCardNumber as string
      );

    // 🛡️ B.I.G (Blind Index Update): Identity Fortification
    if (updates.numeroSerie) {
      updates.numeroSerieHash = EncryptionService.generateBlindIndex(updates.numeroSerie as string);
      updates.numeroSerie = EncryptionService.encrypt(updates.numeroSerie as string);
    }

    if (updates.placas) {
      updates.placasHash = EncryptionService.generateBlindIndex(updates.placas as string);
      updates.placas = EncryptionService.encrypt(updates.placas as string);
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
