import { ResultSetHeader } from 'mysql2';
import { randomUUID } from 'node:crypto';
import db from './db';
import EncryptionService from './encryption';
import { FleetIntelligenceEngine, FleetUnit } from './fleetIntelligence';

/**
 * 🔱 Archon FleetService (SOLID: SRP & High Cohesion)
 * Centralized service for fleet unit operations and persistence.
 */
export default class FleetService {
  /**
   * Retrieves all units from the registry and processes them through the Archon Engine.
   */
  static async getAllUnits(logger: {
    info: (m: string, p?: Record<string, unknown>) => void;
    error: (m: string, p?: Record<string, unknown>) => void;
  }): Promise<Record<string, unknown>[]> {
    const query = `
      SELECT 
        f.*,
        f.lastServiceReading AS lastServiceReading,
        f.currentReading AS currentReading,
        f.maintIntervalKm AS maintIntervalKm,
        f.maintIntervalDays AS maintIntervalDays,
        c_at.label AS assetType,
        c_at.code AS assetTypeCode,
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
    return rows.map((unit) => FleetIntelligenceEngine.processUnit(unit, logger));
  }

  /**
   * Creates a new fleet unit with encryption and blind indexing.
   */
  static async createUnit(
    data: Record<string, string | number | null | string[]>
  ): Promise<{ id: string; uuid: string }> {
    const { id } = data;
    const uuid = randomUUID();

    // 🛡️ Security Check: Prevent Duplicate ID
    const [existing] = await db.execute<FleetUnit[]>('SELECT id FROM fleet_units WHERE id = ?', [
      id,
    ]);
    if (existing.length > 0) {
      throw new Error(`CONFLICT: El identificador '${id}' ya existe.`);
    }

    const payload = this.preparePayload(data);

    // 🛡️ B.I.G: Duplicate Serial Check
    if (payload.numeroSerieHash) {
      const [existingSerie] = await db.execute<FleetUnit[]>(
        'SELECT id FROM fleet_units WHERE numeroSerieHash = ?',
        [payload.numeroSerieHash]
      );
      if (existingSerie.length > 0) {
        throw new Error(`CONFLICT: El número de serie ya existe en el registro.`);
      }
    }

    const intelligencePayload = {
      ...payload,
      id,
      uuid,
      currentReading: data.odometer || 0,
    };

    const fields = Object.keys(intelligencePayload);
    const placeholders = fields.map(() => '?').join(', ');
    const values = Object.values(intelligencePayload).map((v) =>
      v !== null && (Array.isArray(v) || typeof v === 'object') ? JSON.stringify(v) : v
    );

    await db.execute(
      `INSERT INTO fleet_units (${fields.join(', ')}) VALUES (${placeholders})`,
      values
    );

    return { id, uuid };
  }

  /**
   * Updates an existing unit.
   */
  static async updateUnit(
    id: string,
    data: Record<string, string | number | null | string[]>
  ): Promise<boolean> {
    const updates = this.preparePayload(data);
    const fields = Object.keys(updates);
    if (fields.length === 0) return false;

    const setClause = fields.map((f) => `${f} = ?`).join(', ');
    const values = [...Object.values(updates), id];

    const [result] = await db.execute<ResultSetHeader>(
      `UPDATE fleet_units SET ${setClause} WHERE id = ?`,
      values
    );

    return result.affectedRows > 0;
  }

  /**
   * Removes a unit from the system.
   */
  static async deleteUnit(id: string): Promise<boolean> {
    const [result] = await db.execute('DELETE FROM fleet_units WHERE id = ?', [id]);
    return (result as ResultSetHeader).affectedRows > 0;
  }

  /**
   * Internal helper to handle encryption and data transformation.
   */
  private static preparePayload(
    data: Record<string, string | number | null | string[]>
  ): Record<string, string | number | null | string[]> {
    const payload = { ...data };

    // 🛡️ ALE: Application Level Encryption
    if (payload.circulationCardNumber) {
      payload.circulationCardNumber = EncryptionService.encrypt(payload.circulationCardNumber);
    }

    // 🛡️ B.I.G: Blind Index Generation for Identity Fortification
    if (payload.numeroSerie) {
      payload.numeroSerieHash = EncryptionService.generateBlindIndex(payload.numeroSerie);
      payload.numeroSerie = EncryptionService.encrypt(payload.numeroSerie);
    }

    if (payload.placas) {
      payload.placasHash = EncryptionService.generateBlindIndex(payload.placas);
      payload.placas = EncryptionService.encrypt(payload.placas);
    }

    return payload;
  }
}
