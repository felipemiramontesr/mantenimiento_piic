import { ResultSetHeader } from 'mysql2';
import db from './db';

/**
 * 🔱 Archon ServiceOrderService (Sovereign Operations)
 * Manages the lifecycle of maintenance service orders and triggers fleet updates.
 */
export default class ServiceOrderService {
  /**
   * Registers a new Service Order and updates the fleet unit reading.
   */
  static async createOrder(data: {
    unitId: string;
    serviceDate: string;
    odometerAtService: number;
    serviceTypeId: number;
    providerId: number;
    laborCost: number;
    partsCost: number;
    description: string;
    statusId: number;
  }): Promise<{ id: number; folio: string }> {
    const { unitId, serviceDate, odometerAtService } = data;

    // 1. 🔱 Generate Folio (SO-YYYY-[Incremental])
    const year = new Date(serviceDate).getFullYear();
    const [counts] = await db.execute(
      'SELECT COUNT(*) as count FROM fleet_service_orders WHERE YEAR(serviceDate) = ?',
      [year]
    );
    const count = (counts as { count: number }[])[0]?.count || 0;
    const folio = `SO-${year}-${(count + 1).toString().padStart(4, '0')}`;

    const fields = [
      'unitId',
      'folio',
      'serviceDate',
      'odometerAtService',
      'serviceTypeId',
      'providerId',
      'laborCost',
      'partsCost',
      'description',
      'statusId',
    ];
    const placeholders = fields.map(() => '?').join(', ');
    const values = fields.map(
      (f) => (data as Record<string, string | number | null>)[f] || (f === 'folio' ? folio : null)
    );

    const [result] = await db.execute<ResultSetHeader>(
      `INSERT INTO fleet_service_orders (${fields.join(', ')}) VALUES (${placeholders})`,
      values
    );

    const orderId = result.insertId;

    // 3. 🔱 TRIGGER: Fleet Sovereign Update
    // When a service is recorded, the unit MUST update its last service metadata
    await db.execute(
      `UPDATE fleet_units 
       SET lastServiceDate = ?, 
           lastServiceReading = ?,
           odometer = GREATEST(odometer, ?)
       WHERE id = ?`,
      [serviceDate, odometerAtService, odometerAtService, unitId]
    );

    return { id: orderId, folio };
  }

  /**
   * Retrieves history for a specific unit.
   */
  static async getUnitHistory(unitId: string): Promise<Record<string, string | number | null>[]> {
    const query = `
      SELECT 
        so.*,
        ct.label as serviceType,
        cs.label as status,
        cp.label as provider
      FROM fleet_service_orders so
      LEFT JOIN common_catalogs ct ON so.serviceTypeId = ct.id
      LEFT JOIN common_catalogs cs ON so.statusId = cs.id
      LEFT JOIN common_catalogs cp ON so.providerId = cp.id
      WHERE so.unitId = ?
      ORDER BY so.serviceDate DESC
    `;
    const [rows] = await db.execute(query, [unitId]);
    return rows as Record<string, string | number | null>[];
  }

  /**
   * Retrieves a global financial summary of all maintenance operations
   */
  static async getFinancialSummary(): Promise<{
    laborTotal: number;
    partsTotal: number;
    grandTotal: number;
  }> {
    const query = `
      SELECT 
        SUM(laborCost) as laborTotal,
        SUM(partsCost) as partsTotal
      FROM fleet_service_orders
    `;
    const [rows] = await db.execute(query);
    const resultRows = rows as {
      laborTotal: string | number | null;
      partsTotal: string | number | null;
    }[];
    const laborTotal = Number(resultRows[0]?.laborTotal || 0);
    const partsTotal = Number(resultRows[0]?.partsTotal || 0);
    return {
      laborTotal,
      partsTotal,
      grandTotal: laborTotal + partsTotal,
    };
  }
}
