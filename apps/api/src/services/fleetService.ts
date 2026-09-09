import { RowDataPacket } from 'mysql2';
import { PoolConnection } from 'mysql2/promise';
import { FastifyBaseLogger } from 'fastify';
import { randomUUID } from 'node:crypto';
import db from './db';
import EncryptionService from './encryption';
import { FleetIntelligenceEngine, FleetUnit } from './fleetIntelligence';
import { recordAuditLog } from './auditService';

// SQL injection guard: only these column names are allowed in dynamic SET/INSERT clauses.
const FLEET_UNIT_ALLOWED_COLUMNS = new Set<string>([
  'assetTypeId',
  'id',
  'uuid',
  'placas',
  'placasHash',
  'numeroSerie',
  'numeroSerieHash',
  'images',
  'brandId',
  'modelId',
  'year',
  'departmentId',
  'operationalUseId',
  'locationId',
  'engineTypeId',
  'traccionId',
  'transmisionId',
  'fuelTypeId',
  'tireSpec',
  'tireBrandId',
  'terrainTypeId',
  'capacidadCarga',
  'fuelTankCapacity',
  'odometer',
  'initialFuelLevel',
  'lastFuelLevel',
  'maintenanceCenterId',
  'protocolStartDate',
  'vencimientoVerificacion',
  'circulationCardNumber',
  'lastEnvironmentalVerification',
  'lastMechanicalVerification',
  'status',
  'colorId',
  'description',
  'maintIntervalDays',
  'maintIntervalKm',
  'maintenanceTimeFreqId',
  'maintenanceUsageFreqId',
  'lastServiceDate',
  'lastServiceReading',
  'dailyUsageAvg',
  'ownerId',
  'complianceStatusId',
  'accountingAccount',
  'legalComplianceDate',
  'insuranceExpiryDate',
  'insuranceCompanyId',
  'environmentalHologram',
  'monthlyLeasePayment',
  'insuranceCost',
  'acquisitionCost',
]);

/** Columnas SELECT de `getAllUnits`, extraídas de `buildGetAllUnitsQuery`
 * (FC166 Track D — Gate 2 `max-lines-per-function`) — mismo texto verbatim. */
function buildGetAllUnitsSelectColumns(): string {
  return `
      f.*,
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
        o.label AS owner,
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
        END AS usageUnitName`;
}

/** JOINs de `getAllUnits`, extraídos de `buildGetAllUnitsQuery` por el mismo
 * motivo — mismo texto verbatim. */
function buildGetAllUnitsJoins(): string {
  return `
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
      LEFT JOIN owners o ON f.ownerId = o.id
      LEFT JOIN common_catalogs c_compl ON f.complianceStatusId = c_compl.id AND c_compl.category = 'COMPLIANCE_STATUS'
      LEFT JOIN common_catalogs c_loc ON f.locationId = c_loc.id AND c_loc.category = 'LOCATION'
      LEFT JOIN common_catalogs c_mc ON f.maintenanceCenterId = c_mc.id AND c_mc.category = 'MAINTENANCE_CENTER'
      LEFT JOIN common_catalogs c_color ON f.colorId = c_color.id AND c_color.category = 'VEHICLE_COLOR'
      LEFT JOIN common_catalogs c_eng ON f.engineTypeId = c_eng.id AND c_eng.category = 'ENGINE_TYPE'
      LEFT JOIN common_catalogs c_ins ON f.insuranceCompanyId = c_ins.id AND c_ins.category = 'INSURANCE_COMPANY'
      LEFT JOIN common_catalogs ct ON f.maintenanceTimeFreqId = ct.id AND ct.category = 'MAINTENANCE_TIME_FREQ'
      LEFT JOIN common_catalogs cu ON f.maintenanceUsageFreqId = cu.id AND cu.category = 'MAINTENANCE_USAGE_FREQ'`;
}

/** SQL de `getAllUnits`, extraído a función de módulo (FC166 Track D — Gate 2
 * `max-lines-per-function`) — mismo texto verbatim, solo el sitio cambió. */
function buildGetAllUnitsQuery(scopeFilter: string): string {
  return `
      SELECT ${buildGetAllUnitsSelectColumns()}
      ${buildGetAllUnitsJoins()}
      ${scopeFilter}
      ORDER BY f.createdAt DESC
    `;
}

/** Payload crudo de alta/edición de unidad (FC166 Track D S4323 — alias en
 * vez de repetir la unión en cada firma que lo usa). */
type FleetUnitPayload = Record<string, string | number | null | string[]>;

/**
 * 🔱 Archon FleetService (SOLID: SRP & High Cohesion)
 * Centralized service for fleet unit operations and persistence.
 */
export default class FleetService {
  /**
   * Resolves the full cosmological owner scope for a user (§14 cascade):
   *   Nivel 0 — direct owner via user_owner_membership
   *   Nivel 1 — Supercúmulos (PRIVATE linked to CENTER via owner_service_links)
   *   Nivel 2 — Cúmulos (children of PRIVATE via owners.parent_owner_id)
   * Isolation is guaranteed per universe: a CENTER only sees its own linked owners.
   * Empty array = deny-by-default.
   */
  static async getUserOwnerIds(userId: number): Promise<number[]> {
    const [rows] = await db.execute<RowDataPacket[]>(
      `SELECT uom.owner_id AS id FROM user_owner_membership uom WHERE uom.user_id = ?
       UNION
       SELECT osl.privado_owner_id AS id
         FROM user_owner_membership uom
         JOIN owner_service_links osl ON osl.centro_owner_id = uom.owner_id
        WHERE uom.user_id = ?
       UNION
       SELECT o.id
         FROM user_owner_membership uom
         JOIN owner_service_links osl ON osl.centro_owner_id = uom.owner_id
         JOIN owners o ON o.parent_owner_id = osl.privado_owner_id
        WHERE uom.user_id = ?`,
      [userId, userId, userId]
    );
    return rows.map((r) => r.id as number);
  }

  /**
   * Retrieves all units from the registry and processes them through the Archon Engine.
   * When ownerIds is provided (fleet:scoped carriers), the list is filtered to
   * units whose ownerId belongs to that set.
   */
  static async getAllUnits(
    logger: FastifyBaseLogger,
    ownerIds?: number[]
  ): Promise<Record<string, unknown>[]> {
    const scopeFilter =
      ownerIds && ownerIds.length > 0
        ? `WHERE f.ownerId IN (${ownerIds.map(() => '?').join(', ')})`
        : '';
    const query = buildGetAllUnitsQuery(scopeFilter);

    const [rows] = await db.execute<FleetUnit[]>(query, ownerIds ?? []);
    const unitIds = rows.map((u) => u.id);
    const kpiMap = await FleetIntelligenceEngine.computeKpis(unitIds).catch(() => new Map());
    return rows.map((unit) => {
      const processed = FleetIntelligenceEngine.processUnit(unit, logger);
      const kpi = kpiMap.get(unit.id);
      return kpi ? { ...processed, ...kpi } : processed;
    });
  }

  /**
   * Retrieves a single unit by ID with full technical profile (including images).
   * When ownerIds is provided (fleet:scoped carriers), units outside the set
   * resolve to null — indistinguishable from a missing unit (anti-IDOR).
   */
  static async getUnitById(
    id: string,
    logger: FastifyBaseLogger,
    ownerIds?: number[]
  ): Promise<Record<string, unknown> | null> {
    const scopeFilter =
      ownerIds && ownerIds.length > 0
        ? ` AND f.ownerId IN (${ownerIds.map(() => '?').join(', ')})`
        : '';
    const query = `
      SELECT f.*,
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
        o.label AS owner,
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
      LEFT JOIN owners o ON f.ownerId = o.id
      LEFT JOIN common_catalogs c_compl ON f.complianceStatusId = c_compl.id AND c_compl.category = 'COMPLIANCE_STATUS'
      LEFT JOIN common_catalogs c_loc ON f.locationId = c_loc.id AND c_loc.category = 'LOCATION'
      LEFT JOIN common_catalogs c_mc ON f.maintenanceCenterId = c_mc.id AND c_mc.category = 'MAINTENANCE_CENTER'
      LEFT JOIN common_catalogs c_color ON f.colorId = c_color.id AND c_color.category = 'VEHICLE_COLOR'
      LEFT JOIN common_catalogs c_eng ON f.engineTypeId = c_eng.id AND c_eng.category = 'ENGINE_TYPE'
      LEFT JOIN common_catalogs c_ins ON f.insuranceCompanyId = c_ins.id AND c_ins.category = 'INSURANCE_COMPANY'
      LEFT JOIN common_catalogs ct ON f.maintenanceTimeFreqId = ct.id AND ct.category = 'MAINTENANCE_TIME_FREQ'
      LEFT JOIN common_catalogs cu ON f.maintenanceUsageFreqId = cu.id AND cu.category = 'MAINTENANCE_USAGE_FREQ'
      WHERE f.id = ?${scopeFilter}
    `;

    const [rows] = await db.execute<FleetUnit[]>(query, [id, ...(ownerIds ?? [])]);
    if (rows.length === 0) return null;
    const kpiMap = await FleetIntelligenceEngine.computeKpis([id]).catch(() => new Map());
    const processed = FleetIntelligenceEngine.processUnit(rows[0], logger);
    const kpi = kpiMap.get(id);
    return kpi ? { ...processed, ...kpi } : processed;
  }

  /**
   * Creates a new fleet unit with encryption and blind indexing.
   */
  static async createUnit(data: FleetUnitPayload): Promise<{ id: string; uuid: string }> {
    const id = data.id as string;
    const uuid = randomUUID();

    const [existing] = await db.execute<FleetUnit[]>('SELECT id FROM fleet_units WHERE id = ?', [
      id,
    ]);
    if (existing && existing.length > 0) {
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
      lastFuelLevel: payload.lastFuelLevel ?? payload.initialFuelLevel ?? 100,
    };

    const fields = Object.keys(intelligencePayload);
    const invalidCols = fields.filter((f) => !FLEET_UNIT_ALLOWED_COLUMNS.has(f));
    if (invalidCols.length > 0) {
      throw new Error(
        `SQL_INJECTION_GUARD: unexpected columns in INSERT: ${invalidCols.join(', ')}`
      );
    }
    const placeholders = fields.map(() => '?').join(', ');
    const values = Object.values(intelligencePayload).map((v) => {
      if (v && typeof v === 'object') {
        return JSON.stringify(v);
      }
      return v;
    });

    await db.execute(
      `INSERT INTO fleet_units (${fields.join(', ')}) VALUES (${placeholders})`,
      values
    );
    return { id, uuid };
  }

  /** Pasos 2-3 de `updateUnit`: prepara el payload, valida columnas contra
   * el allowlist SQL-injection-guard, y ejecuta el UPDATE — extraída para
   * respetar el cap de 50 líneas de Gate 2 (FC166 Track D); mismo
   * comportamiento verbatim. Retorna `false` si no hay campos que
   * actualizar (mismo contrato "sin cambios" que el caller original). */
  private static async applyUnitUpdate(
    connection: PoolConnection,
    id: string,
    data: FleetUnitPayload
  ): Promise<boolean> {
    const updates = this.preparePayload(data);

    const fields = Object.keys(updates);
    if (fields.length === 0) return false;
    const invalidCols = fields.filter((f) => !FLEET_UNIT_ALLOWED_COLUMNS.has(f));
    if (invalidCols.length > 0) {
      throw new Error(
        `SQL_INJECTION_GUARD: unexpected columns in UPDATE: ${invalidCols.join(', ')}`
      );
    }

    const setClause = fields.map((f) => `${f} = ?`).join(', ');
    const values = [
      ...Object.values(updates).map((v) => (v && typeof v === 'object' ? JSON.stringify(v) : v)),
      id,
    ];

    await connection.execute(`UPDATE fleet_units SET ${setClause} WHERE id = ?`, values);
    return true;
  }

  /**
   * Updates an existing unit with forensic audit.
   */
  static async updateUnit(
    id: string,
    data: FleetUnitPayload,
    reason: string,
    adminId: number
  ): Promise<boolean> {
    let connection;
    try {
      connection = await db.getConnection();
      await connection.beginTransaction();

      // 1. Snapshot Before
      const [rows] = await connection.execute<RowDataPacket[]>(
        'SELECT * FROM fleet_units WHERE id = ? FOR UPDATE',
        [id]
      );
      if (rows.length === 0) {
        connection.release();
        return false;
      }
      const snapshotBefore = rows[0];

      // 2-3. Prepare + validate + execute UPDATE
      const updated = await this.applyUnitUpdate(connection, id, data);
      if (!updated) {
        connection.release();
        return false;
      }

      // 4. Snapshot After
      const [rowsAfter] = await connection.execute<RowDataPacket[]>(
        'SELECT * FROM fleet_units WHERE id = ?',
        [id]
      );
      const snapshotAfter = rowsAfter[0];

      // 5. Record Audit
      await recordAuditLog({
        entity_type: 'fleet_unit',
        entity_id: id,
        action: 'UPDATE',
        snapshot_before: snapshotBefore,
        snapshot_after: snapshotAfter,
        reason,
        user_id: adminId,
      });

      await connection.commit();
      connection.release();
      return true;
    } catch (e) {
      if (connection) {
        await connection.rollback();
        connection.release();
      }
      throw e;
    }
  }

  /**
   * Removes a unit from the system with forensic audit.
   */
  static async deleteUnit(id: string, reason: string, adminId: number): Promise<boolean> {
    let connection;
    try {
      connection = await db.getConnection();
      await connection.beginTransaction();

      // 1. Snapshot Before
      const [rows] = await connection.execute<RowDataPacket[]>(
        'SELECT * FROM fleet_units WHERE id = ? FOR UPDATE',
        [id]
      );
      if (rows.length === 0) {
        connection.release();
        return false;
      }
      const snapshotBefore = rows[0];

      // 2. Perform Delete
      await connection.execute('DELETE FROM fleet_units WHERE id = ?', [id]);

      // 3. Record Audit
      await recordAuditLog({
        entity_type: 'fleet_unit',
        entity_id: id,
        action: 'DELETE',
        snapshot_before: snapshotBefore,
        reason,
        user_id: adminId,
      });

      await connection.commit();
      connection.release();
      return true;
    } catch (e) {
      if (connection) {
        await connection.rollback();
        connection.release();
      }
      throw e;
    }
  }

  /** Resuelve `maintenanceTimeFreqId` a partir de `maintIntervalDays`
   * (Omega Protocol, catálogo dinámico) — extraída de `preparePayload` para
   * respetar el cap de Cognitive Complexity 15 (S3776, FC166 Track D
   * hotfix #2); mismo comportamiento verbatim (early-return equivalente a
   * la cadena if/else-if/else original). */
  private static resolveMaintenanceTimeFreqId(days: number): number | null {
    if (days === 90) return 1048;
    if (days === 180) return 1044;
    if (days === 365) return 1045;
    return null;
  }

  /** Análogo a `resolveMaintenanceTimeFreqId` para `maintIntervalKm` ->
   * `maintenanceUsageFreqId`. */
  private static resolveMaintenanceUsageFreqId(km: number): number | null {
    if (km === 5000) return 1046;
    if (km === 10000) return 1047;
    return null;
  }

  /**
   * Internal helper to handle encryption and data transformation.
   */
  private static preparePayload(data: FleetUnitPayload): FleetUnitPayload {
    const payload = { ...data };

    // 🛡️ ALE: Application Level Encryption
    if (payload.circulationCardNumber) {
      payload.circulationCardNumber = EncryptionService.encrypt(
        payload.circulationCardNumber as string
      );
    }

    // 🛡️ B.I.G: Blind Index Generation for Identity Fortification
    if (payload.numeroSerie) {
      payload.numeroSerieHash = EncryptionService.generateBlindIndex(payload.numeroSerie as string);
      payload.numeroSerie = EncryptionService.encrypt(payload.numeroSerie as string);
    }

    if (payload.placas) {
      payload.placasHash = EncryptionService.generateBlindIndex(payload.placas as string);
      payload.placas = EncryptionService.encrypt(payload.placas as string);
    }

    // 🔱 Dynamic Catalog Frequency Auto-Sync (Omega Protocol)
    if (payload.maintIntervalDays !== undefined) {
      const days = payload.maintIntervalDays !== null ? Number(payload.maintIntervalDays) : 0;
      payload.maintenanceTimeFreqId = this.resolveMaintenanceTimeFreqId(days);
    }

    if (payload.maintIntervalKm !== undefined) {
      const km = payload.maintIntervalKm !== null ? Number(payload.maintIntervalKm) : 0;
      payload.maintenanceUsageFreqId = this.resolveMaintenanceUsageFreqId(km);
    }

    return payload;
  }
}
