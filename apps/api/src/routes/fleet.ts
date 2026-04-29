import { FastifyInstance } from 'fastify';
import { ResultSetHeader } from 'mysql2';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import db from '../services/db';
import EncryptionService from '../services/encryption';

import { FleetIntelligenceEngine, FleetUnit } from '../services/fleetIntelligence';

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
    // 🔱 Archon Cache-Killer Protocol
    reply.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    reply.header('Pragma', 'no-cache');
    reply.header('Expires', '0');
    reply.header('Surrogate-Control', 'no-store');

    try {
      const query = `
        SELECT 
          f.*,
          f.lastServiceReading AS lastServiceReading,
          f.currentReading AS currentReading,
          f.maintIntervalKm AS maintIntervalKm,
          f.maintIntervalDays AS maintIntervalDays,
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
        LEFT JOIN common_catalogs ct ON f.maintenanceTimeFreqId = ct.id AND ct.category = 'MAINTENANCE_TIME_FREQ'
        LEFT JOIN common_catalogs cu ON f.maintenanceUsageFreqId = cu.id AND cu.category = 'MAINTENANCE_USAGE_FREQ'
        ORDER BY f.createdAt DESC
      `;

      const [rows] = await db.execute<FleetUnit[]>(query);

      // 🛡️ SENTINEL INTELLIGENCE LAYER: Decryption + Predictive Computation
      const processedRows = rows.map((unit) =>
        FleetIntelligenceEngine.processUnit(unit, fastify.log)
      );

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
