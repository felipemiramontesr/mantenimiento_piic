import { RowDataPacket } from 'mysql2';
import db from './db';

export const CO2_FACTORS: Record<string, number> = {
  F_DIESEL: 2.68,
  F_GAS: 2.31,
  F_LP_GAS: 1.96,
};
export const DEFAULT_CO2_FACTOR = 2.31;

export interface Co2Result {
  fuel_code: string | null;
  co2_factor_kg_per_liter: number;
  total_liters: number;
  total_co2_kg: number;
  period_from: string | null;
  period_to: string | null;
}

interface Co2ResultInternal extends Co2Result {
  ownerId: number;
}

export function computeCo2Kg(totalLiters: number, factor: number): number {
  return Math.round(totalLiters * factor * 100) / 100;
}

export function resolveCo2Factor(fuelCode: string | null): number {
  if (!fuelCode) return DEFAULT_CO2_FACTOR;
  return CO2_FACTORS[fuelCode] ?? DEFAULT_CO2_FACTOR;
}

export interface Co2QueryParams {
  from?: string;
  to?: string;
}

export default class Co2Service {
  static async compute(
    unitId: string,
    params: Co2QueryParams = {}
  ): Promise<Co2ResultInternal | null> {
    const [unitRows] = await db.execute<RowDataPacket[]>(
      `SELECT fu.ownerId, cc.code AS fuel_code
       FROM fleet_units fu
       LEFT JOIN common_catalogs cc ON cc.id = fu.fuelTypeId AND cc.category = 'FUEL'
       WHERE fu.id = ?`,
      [unitId]
    );
    if (unitRows.length === 0) return null;

    const ownerId = Number(unitRows[0].ownerId);
    const fuelCode = unitRows[0].fuel_code ?? null;
    const co2Factor = resolveCo2Factor(fuelCode);

    const baseQuery = `
      SELECT
        COALESCE(SUM(fuel_liters_loaded), 0) AS total_liters,
        MIN(start_at) AS period_from_derived,
        MAX(start_at) AS period_to_derived
      FROM fleet_movements
      WHERE unit_id = ?
        AND movement_type = 'ROUTE'
        AND status = 'COMPLETED'
        AND fuel_liters_loaded > 0`;

    let totalLiters: number;
    let derivedFrom: string | null = null;
    let derivedTo: string | null = null;
    const periodFrom = params.from ?? null;
    const periodTo = params.to ?? null;

    if (periodFrom && periodTo) {
      const [rows] = await db.execute<RowDataPacket[]>(
        `${baseQuery} AND start_at >= ? AND start_at < ?`,
        [unitId, periodFrom, periodTo]
      );
      totalLiters = Number(rows[0]?.total_liters ?? 0);
      derivedFrom = rows[0]?.period_from_derived ?? null;
      derivedTo = rows[0]?.period_to_derived ?? null;
    } else if (periodFrom) {
      const [rows] = await db.execute<RowDataPacket[]>(`${baseQuery} AND start_at >= ?`, [
        unitId,
        periodFrom,
      ]);
      totalLiters = Number(rows[0]?.total_liters ?? 0);
      derivedFrom = rows[0]?.period_from_derived ?? null;
      derivedTo = rows[0]?.period_to_derived ?? null;
    } else if (periodTo) {
      const [rows] = await db.execute<RowDataPacket[]>(`${baseQuery} AND start_at < ?`, [
        unitId,
        periodTo,
      ]);
      totalLiters = Number(rows[0]?.total_liters ?? 0);
      derivedFrom = rows[0]?.period_from_derived ?? null;
      derivedTo = rows[0]?.period_to_derived ?? null;
    } else {
      const [rows] = await db.execute<RowDataPacket[]>(baseQuery, [unitId]);
      totalLiters = Number(rows[0]?.total_liters ?? 0);
      derivedFrom = rows[0]?.period_from_derived ?? null;
      derivedTo = rows[0]?.period_to_derived ?? null;
    }

    return {
      ownerId,
      fuel_code: fuelCode,
      co2_factor_kg_per_liter: co2Factor,
      total_liters: Math.round(totalLiters * 100) / 100,
      total_co2_kg: computeCo2Kg(totalLiters, co2Factor),
      period_from: periodFrom ?? derivedFrom,
      period_to: periodTo ?? derivedTo,
    };
  }
}
