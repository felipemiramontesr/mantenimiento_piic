import { RowDataPacket } from 'mysql2';
import db from './db';

export const BASE_VEHICLE_VALUE_MXN = 450_000;
export const MAX_DEPRECIATION_FRACTION = 0.8;
export const DEPRECIATION_RATE_PER_YEAR = 0.25;

export interface EconomicLifeResult {
  residual_value_mxn: number;
  accumulated_tco: number;
  replacement_score: number;
  recommendation: 'KEEP' | 'EVALUATE' | 'REPLACE';
}

interface EconomicLifeInternal extends EconomicLifeResult {
  ownerId: number;
}

export function computeResidualValue(vehicleYear: number, currentYear: number): number {
  const ageYears = Math.max(0, currentYear - vehicleYear);
  const depreciationFraction = Math.min(
    MAX_DEPRECIATION_FRACTION,
    DEPRECIATION_RATE_PER_YEAR * ageYears
  );
  return Math.round(BASE_VEHICLE_VALUE_MXN * (1 - depreciationFraction));
}

export function computeReplacementScore(accumulatedTco: number, residualValueMxn: number): number {
  if (residualValueMxn <= 0) return 1.0;
  return Math.round((accumulatedTco / residualValueMxn) * 100) / 100;
}

export function computeRecommendation(replacementScore: number): 'KEEP' | 'EVALUATE' | 'REPLACE' {
  if (replacementScore >= 1.0) return 'REPLACE';
  if (replacementScore >= 0.5) return 'EVALUATE';
  return 'KEEP';
}

export default class EconomicLifeService {
  static async compute(
    unitId: string,
    currentYear = new Date().getFullYear()
  ): Promise<EconomicLifeInternal | null> {
    const [unitRows] = await db.execute<RowDataPacket[]>(
      `SELECT ownerId, year FROM fleet_units WHERE id = ?`,
      [unitId]
    );
    if (unitRows.length === 0) return null;

    const ownerId = Number(unitRows[0].ownerId);
    const vehicleYear = Number(unitRows[0].year);

    const [tcoRows] = await db.execute<RowDataPacket[]>(
      `SELECT tco_total FROM view_fleet_units_tco WHERE fleet_unit_id = ?`,
      [unitId]
    );
    const accumulatedTco = tcoRows[0]?.tco_total != null ? Number(tcoRows[0].tco_total) : 0;

    const residualValueMxn = computeResidualValue(vehicleYear, currentYear);
    const replacementScore = computeReplacementScore(accumulatedTco, residualValueMxn);
    const recommendation = computeRecommendation(replacementScore);

    return {
      ownerId,
      residual_value_mxn: residualValueMxn,
      accumulated_tco: accumulatedTco,
      replacement_score: replacementScore,
      recommendation,
    };
  }
}
