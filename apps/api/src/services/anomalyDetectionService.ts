import { RowDataPacket } from 'mysql2';
import db from './db';

export const FLEET_SIZE_THRESHOLD = 10;
export const MOVING_AVG_DEVIATION_THRESHOLD = 0.2;
export const Z_SCORE_THRESHOLD = 1.5;

export interface AnomalyResult {
  fleet_size: number;
  algorithm: 'moving_avg' | 'z_score';
  unit_km_per_liter: number | null;
  baseline_km_per_liter: number | null;
  deviation_pct: number | null;
  z_score: number | null;
  is_anomaly: boolean;
}

interface AnomalyResultInternal extends AnomalyResult {
  ownerId: number;
}

export function computeZScore(
  value: number,
  fleetMean: number,
  fleetStdDev: number
): number | null {
  if (fleetStdDev <= 0) return null;
  return Math.round(((value - fleetMean) / fleetStdDev) * 100) / 100;
}

export function computeDeviationPct(current: number, baseline: number): number | null {
  if (baseline <= 0) return null;
  return Math.round(((current - baseline) / baseline) * 10000) / 100;
}

function arithmeticMean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function populationStdDev(values: number[], avg: number): number {
  const variance = values.reduce((acc, v) => acc + (v - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

async function resolveMovingAvg(
  unitId: string,
  ownerId: number,
  fleetSize: number,
  unitKmPerLiter: number | null
): Promise<AnomalyResultInternal> {
  const [recentRows] = await db.execute<RowDataPacket[]>(
    `SELECT
       CASE
         WHEN SUM(fuel_liters_loaded) > 0
         THEN ROUND(SUM(end_reading - start_reading) / SUM(fuel_liters_loaded), 2)
         ELSE NULL
       END AS recent_km_per_liter
     FROM fleet_movements
     WHERE unit_id = ?
       AND movement_type = 'ROUTE'
       AND status = 'COMPLETED'
       AND end_reading IS NOT NULL
       AND fuel_liters_loaded > 0
       AND start_at >= DATE_SUB(NOW(), INTERVAL 3 MONTH)`,
    [unitId]
  );

  const recentKmPerLiter =
    recentRows[0]?.recent_km_per_liter != null ? Number(recentRows[0].recent_km_per_liter) : null;

  let deviationPct: number | null = null;
  let isAnomaly = false;

  if (recentKmPerLiter !== null && unitKmPerLiter !== null) {
    deviationPct = computeDeviationPct(recentKmPerLiter, unitKmPerLiter);
    if (deviationPct !== null) {
      isAnomaly = Math.abs(deviationPct) / 100 > MOVING_AVG_DEVIATION_THRESHOLD;
    }
  }

  return {
    ownerId,
    fleet_size: fleetSize,
    algorithm: 'moving_avg',
    unit_km_per_liter: recentKmPerLiter,
    baseline_km_per_liter: unitKmPerLiter,
    deviation_pct: deviationPct,
    z_score: null,
    is_anomaly: isAnomaly,
  };
}

async function resolveZScore(
  ownerId: number,
  fleetSize: number,
  unitKmPerLiter: number | null
): Promise<AnomalyResultInternal> {
  const [fleetRows] = await db.execute<RowDataPacket[]>(
    `SELECT vffe.km_per_liter
     FROM view_fleet_fuel_efficiency vffe
     JOIN fleet_units fu ON fu.id = vffe.unit_id
     WHERE fu.ownerId = ?
       AND vffe.km_per_liter IS NOT NULL`,
    [ownerId]
  );

  const fleetValues = fleetRows.map((r) => Number(r.km_per_liter));
  let zScore: number | null = null;
  let isAnomaly = false;

  if (unitKmPerLiter !== null && fleetValues.length >= 2) {
    const fleetMean = arithmeticMean(fleetValues);
    const fleetStd = populationStdDev(fleetValues, fleetMean);
    zScore = computeZScore(unitKmPerLiter, fleetMean, fleetStd);
    if (zScore !== null) {
      isAnomaly = Math.abs(zScore) > Z_SCORE_THRESHOLD;
    }
  }

  return {
    ownerId,
    fleet_size: fleetSize,
    algorithm: 'z_score',
    unit_km_per_liter: unitKmPerLiter,
    baseline_km_per_liter: null,
    deviation_pct: null,
    z_score: zScore,
    is_anomaly: isAnomaly,
  };
}

export default class AnomalyDetectionService {
  static async compute(unitId: string): Promise<AnomalyResultInternal | null> {
    const [unitRows] = await db.execute<RowDataPacket[]>(
      `SELECT ownerId FROM fleet_units WHERE id = ?`,
      [unitId]
    );
    if (unitRows.length === 0) return null;
    const ownerId = Number(unitRows[0].ownerId);

    const [countRows] = await db.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS fleet_size FROM fleet_units WHERE ownerId = ?`,
      [ownerId]
    );
    const fleetSize = Number(countRows[0].fleet_size);

    const [baselineRows] = await db.execute<RowDataPacket[]>(
      `SELECT km_per_liter FROM view_fleet_fuel_efficiency WHERE unit_id = ?`,
      [unitId]
    );
    const unitKmPerLiter =
      baselineRows[0]?.km_per_liter != null ? Number(baselineRows[0].km_per_liter) : null;

    if (fleetSize < FLEET_SIZE_THRESHOLD) {
      return resolveMovingAvg(unitId, ownerId, fleetSize, unitKmPerLiter);
    }
    return resolveZScore(ownerId, fleetSize, unitKmPerLiter);
  }
}
