import { RowDataPacket } from 'mysql2';
import db from './db';

export interface OperatorScoreResult {
  driver_id: number | null;
  route_count: number;
  fuel_efficiency_score: number | null;
  incident_rate_score: number | null;
  checkpoint_adherence_score: number | null;
  composite_score: number | null;
}

interface OperatorScoreInternal extends OperatorScoreResult {
  ownerId: number;
}

export function computeFuelEfficiencyScore(
  driverKmPerLiter: number,
  unitBaselineKmPerLiter: number
): number | null {
  if (unitBaselineKmPerLiter <= 0) return null;
  return Math.min(100, Math.round((driverKmPerLiter / unitBaselineKmPerLiter) * 10000) / 100);
}

export function computeIncidentRateScore(
  totalRoutes: number,
  routesWithIncidents: number
): number | null {
  if (totalRoutes <= 0) return null;
  const incidentFreeRatio = (totalRoutes - routesWithIncidents) / totalRoutes;
  return Math.round(incidentFreeRatio * 10000) / 100;
}

export function computeCheckpointAdherenceScore(
  totalCheckpoints: number,
  visitedCheckpoints: number
): number | null {
  if (totalCheckpoints <= 0) return null;
  return Math.round((visitedCheckpoints / totalCheckpoints) * 10000) / 100;
}

export function computeCompositeScore(scores: (number | null)[]): number | null {
  const valid = scores.filter((s): s is number => s !== null);
  if (valid.length === 0) return null;
  return Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 100) / 100;
}

export default class OperatorScorecardService {
  static async compute(unitId: string): Promise<OperatorScoreInternal | null> {
    const [unitRows] = await db.execute<RowDataPacket[]>(
      `SELECT ownerId FROM fleet_units WHERE id = ?`,
      [unitId]
    );
    if (unitRows.length === 0) return null;
    const ownerId = Number(unitRows[0].ownerId);

    const [driverRows] = await db.execute<RowDataPacket[]>(
      `SELECT fre.driver_id, COUNT(*) AS route_count
       FROM fleet_movements fm
       JOIN fleet_route_extensions fre ON fre.movement_id = fm.id
       WHERE fm.unit_id = ?
         AND fm.movement_type = 'ROUTE'
         AND fm.status = 'COMPLETED'
       GROUP BY fre.driver_id
       ORDER BY route_count DESC
       LIMIT 1`,
      [unitId]
    );

    if (driverRows.length === 0) {
      return {
        ownerId,
        driver_id: null,
        route_count: 0,
        fuel_efficiency_score: null,
        incident_rate_score: null,
        checkpoint_adherence_score: null,
        composite_score: null,
      };
    }

    const driverId = Number(driverRows[0].driver_id);
    const routeCount = Number(driverRows[0].route_count);

    const [[fuelRows], [incidentRows], [checkpointRows], [baselineRows]] = await Promise.all([
      db.execute<RowDataPacket[]>(
        `SELECT
           CASE
             WHEN SUM(fm.fuel_liters_loaded) > 0
             THEN ROUND(SUM(fm.end_reading - fm.start_reading) / SUM(fm.fuel_liters_loaded), 2)
             ELSE NULL
           END AS driver_km_per_liter
         FROM fleet_movements fm
         JOIN fleet_route_extensions fre ON fre.movement_id = fm.id
         WHERE fm.unit_id = ?
           AND fm.movement_type = 'ROUTE'
           AND fm.status = 'COMPLETED'
           AND fm.end_reading IS NOT NULL
           AND fm.fuel_liters_loaded > 0
           AND fre.driver_id = ?`,
        [unitId, driverId]
      ),
      db.execute<RowDataPacket[]>(
        `SELECT
           COUNT(DISTINCT fm.id) AS total_routes,
           COUNT(DISTINCT ri.route_uuid) AS routes_with_incidents
         FROM fleet_movements fm
         JOIN fleet_route_extensions fre ON fre.movement_id = fm.id
         LEFT JOIN route_incidents ri
           ON ri.route_uuid COLLATE utf8mb4_unicode_ci = fm.uuid
         WHERE fm.unit_id = ?
           AND fm.movement_type = 'ROUTE'
           AND fm.status = 'COMPLETED'
           AND fre.driver_id = ?`,
        [unitId, driverId]
      ),
      db.execute<RowDataPacket[]>(
        `SELECT
           COUNT(*) AS total_checkpoints,
           SUM(CASE WHEN frc.status = 'VISITED' THEN 1 ELSE 0 END) AS visited_checkpoints
         FROM fleet_movements fm
         JOIN fleet_route_extensions fre ON fre.movement_id = fm.id
         JOIN fleet_route_checkpoints frc ON frc.movement_id = fm.id
         WHERE fm.unit_id = ?
           AND fm.movement_type = 'ROUTE'
           AND fm.status = 'COMPLETED'
           AND fre.driver_id = ?`,
        [unitId, driverId]
      ),
      db.execute<RowDataPacket[]>(
        `SELECT km_per_liter FROM view_fleet_fuel_efficiency WHERE unit_id = ?`,
        [unitId]
      ),
    ]);

    const driverKmPerLiter =
      fuelRows[0]?.driver_km_per_liter != null ? Number(fuelRows[0].driver_km_per_liter) : null;
    const unitBaselineKmPerLiter =
      baselineRows[0]?.km_per_liter != null ? Number(baselineRows[0].km_per_liter) : null;

    const fuelEfficiencyScore =
      driverKmPerLiter !== null && unitBaselineKmPerLiter !== null
        ? computeFuelEfficiencyScore(driverKmPerLiter, unitBaselineKmPerLiter)
        : null;

    const totalRoutes = incidentRows[0] ? Number(incidentRows[0].total_routes) : 0;
    const routesWithIncidents = incidentRows[0] ? Number(incidentRows[0].routes_with_incidents) : 0;
    const incidentRateScore = computeIncidentRateScore(totalRoutes, routesWithIncidents);

    const totalCheckpoints = checkpointRows[0] ? Number(checkpointRows[0].total_checkpoints) : 0;
    const visitedCheckpoints = checkpointRows[0]
      ? Number(checkpointRows[0].visited_checkpoints)
      : 0;
    const checkpointAdherenceScore = computeCheckpointAdherenceScore(
      totalCheckpoints,
      visitedCheckpoints
    );

    const compositeScore = computeCompositeScore([
      fuelEfficiencyScore,
      incidentRateScore,
      checkpointAdherenceScore,
    ]);

    return {
      ownerId,
      driver_id: driverId,
      route_count: routeCount,
      fuel_efficiency_score: fuelEfficiencyScore,
      incident_rate_score: incidentRateScore,
      checkpoint_adherence_score: checkpointAdherenceScore,
      composite_score: compositeScore,
    };
  }
}
