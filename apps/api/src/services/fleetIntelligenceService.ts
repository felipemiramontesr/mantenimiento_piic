import { RowDataPacket } from 'mysql2';
import db from './db';

export interface FleetKpiResult {
  oee: number | null;
  tco_per_km: number | null;
  km_per_liter: number | null;
  pm_compliance: number | null;
  backlog_aging_days: number | null;
}

interface FleetKpiInternal extends FleetKpiResult {
  ownerId: number;
}

export function computeOee(
  availabilityIndex: number,
  dailyUsageAvg: number,
  qualityFactor: number | null,
  dailyKmAvg: number | null
): number | null {
  if (qualityFactor === null || dailyUsageAvg <= 0 || dailyKmAvg === null) return null;
  const performance = Math.min(dailyKmAvg / dailyUsageAvg, 1.0);
  return Math.round((availabilityIndex / 100) * performance * qualityFactor * 10000) / 100;
}

export function computeTcoPerKm(tcoTotal: number, totalKm: number): number | null {
  if (totalKm <= 0) return null;
  return Math.round((tcoTotal / totalKm) * 100) / 100;
}

export default class FleetIntelligenceKpiService {
  static async compute(unitId: string): Promise<FleetKpiInternal | null> {
    const [unitRows] = await db.execute<RowDataPacket[]>(
      `SELECT ownerId, availabilityIndex, dailyUsageAvg, maintIntervalDays, maintIntervalKm
       FROM fleet_units WHERE id = ?`,
      [unitId]
    );
    if (unitRows.length === 0) return null;

    const unit = unitRows[0];
    const ownerId = Number(unit.ownerId);
    const availabilityIndex = Number(unit.availabilityIndex ?? 100);
    const dailyUsageAvg = Number(unit.dailyUsageAvg ?? 0);
    const maintIntervalDays = Number(unit.maintIntervalDays ?? 180);
    const maintIntervalKm = Number(unit.maintIntervalKm ?? 10000);

    const [[oeeRows], [tcoRows], [fuelRows], [pmRows], [backlogRows]] = await Promise.all([
      db.execute<RowDataPacket[]>(
        `SELECT quality_factor, total_km, daily_km_avg
         FROM view_fleet_oee_factors WHERE unit_id = ?`,
        [unitId]
      ),
      db.execute<RowDataPacket[]>(
        `SELECT tco_total FROM view_fleet_units_tco WHERE fleet_unit_id = ?`,
        [unitId]
      ),
      db.execute<RowDataPacket[]>(
        `SELECT km_per_liter FROM view_fleet_fuel_efficiency WHERE unit_id = ?`,
        [unitId]
      ),
      db.execute<RowDataPacket[]>(
        `WITH gaps AS (
           SELECT
             service_date, odometer_at_service,
             LAG(service_date)        OVER (ORDER BY service_date) AS prev_date,
             LAG(odometer_at_service) OVER (ORDER BY service_date) AS prev_odometer
           FROM fleet_maintenance_logs WHERE unit_id = ?
         )
         SELECT
           COUNT(*) AS total,
           SUM(CASE
             WHEN prev_date IS NULL THEN 1
             WHEN DATEDIFF(service_date, prev_date) <= ?
                  AND (odometer_at_service - prev_odometer) <= ?
             THEN 1 ELSE 0
           END) AS compliant
         FROM gaps`,
        [unitId, maintIntervalDays, maintIntervalKm]
      ),
      db.execute<RowDataPacket[]>(
        `SELECT ROUND(AVG(DATEDIFF(NOW(), wo.opened_at)), 1) AS avg_age_days
         FROM upa_work_orders wo
         JOIN upa_work_order_tasks t ON t.work_order_id = wo.id
         WHERE t.status = 'DEFERRED_FINANCIAL'
           AND wo.status != 'CLOSED'
           AND wo.vehicle_id = ?`,
        [unitId]
      ),
    ]);

    const oeeRow = oeeRows[0];
    const qualityFactor = oeeRow?.quality_factor != null ? Number(oeeRow.quality_factor) : null;
    const dailyKmAvg = oeeRow?.daily_km_avg != null ? Number(oeeRow.daily_km_avg) : null;
    const oee = computeOee(availabilityIndex, dailyUsageAvg, qualityFactor, dailyKmAvg);

    const tcoTotal = tcoRows[0] ? Number(tcoRows[0].tco_total) : 0;
    const totalKm = oeeRow ? Number(oeeRow.total_km) : 0;
    const tcoPerKm = computeTcoPerKm(tcoTotal, totalKm);

    const kmPerLiter =
      fuelRows[0]?.km_per_liter != null ? Number(fuelRows[0].km_per_liter) || null : null;

    const pmTotal = pmRows[0] ? Number(pmRows[0].total) : 0;
    const pmCompliant = pmRows[0] ? Number(pmRows[0].compliant) : 0;
    const pmCompliance = pmTotal > 0 ? Math.round((pmCompliant / pmTotal) * 1000) / 10 : null;

    const backlogAgingDays =
      backlogRows[0]?.avg_age_days != null ? Number(backlogRows[0].avg_age_days) || null : null;

    return {
      ownerId,
      oee,
      tco_per_km: tcoPerKm,
      km_per_liter: kmPerLiter,
      pm_compliance: pmCompliance,
      backlog_aging_days: backlogAgingDays,
    };
  }
}
