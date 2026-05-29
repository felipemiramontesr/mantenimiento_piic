/* eslint-disable @typescript-eslint/no-explicit-any */
import { FastifyBaseLogger } from 'fastify';
import { RowDataPacket } from 'mysql2';
import EncryptionService from './encryption';
import db from './db';

// ============================================================================
// ARCHON INTELLIGENCE CONFIGURATION (DRY)
// ============================================================================
export const ARCHON_DEFAULTS = {
  MAINT_INTERVAL_DAYS: 180,
  MAINT_INTERVAL_KM: 10000,
  AVAILABILITY: 100,
};

// ============================================================================
// DOMAIN INTERFACES
// ============================================================================

interface KpiData {
  mtbfHours: number;
  mttrHours: number;
  availabilityIndex: number;
  backlogCount: number;
}
export interface FleetUnit extends RowDataPacket {
  id: string;
  uuid: string;
  assetType: string;
  placas: string | null;
  numeroSerie: string | null;
  maintIntervalDays: number;
  maintIntervalKm: number;
  lastServiceDate: string | null;
  lastServiceReading: number;
  odometer: number;
  availabilityIndex: number;
  mtbfHours: number;
  mttrHours: number;
  backlogCount: number;
  images: string | null;
  circulationCardNumber?: string | null;
  environmentalHologram?: string | null;
  insuranceCost?: number | null;
  dailyUsageAvg?: number;
  healthScore?: number;
  initialFuelLevel?: number;
  lastFuelLevel?: number;
  year?: number | null;
}

export interface UnitHealth {
  healthScore: number;
  healthStatus: string;
  healthColor: string;
  lastServiceDate: Date | null;
  odometer: number;
  lastReading: number;
  today: Date;
  kmLimit: number;
}

/**
 * 🔱 Archon Engine: FleetIntelligence (SOLID: SRP)
 * Centralized logic for maintenance analytics and data transformation.
 */
export class FleetIntelligenceEngine {
  static computeHealth(unit: Partial<FleetUnit>): UnitHealth {
    const today = new Date();
    const lastServiceDate = unit.lastServiceDate ? new Date(unit.lastServiceDate) : null;
    const lastReading = Number(unit.lastServiceReading || 0);
    const odometer = Number(unit.odometer || 0);

    const timeLimit = Number(unit.maintIntervalDays || ARCHON_DEFAULTS.MAINT_INTERVAL_DAYS);
    const usageLimit = Number(unit.maintIntervalKm || ARCHON_DEFAULTS.MAINT_INTERVAL_KM);

    let timeProgress = 0;
    if (lastServiceDate && timeLimit > 0) {
      const diffDays = (today.getTime() - lastServiceDate.getTime()) / (1000 * 3600 * 24);
      timeProgress = Math.max(0, diffDays / timeLimit);
    }

    let usageProgress = 0;
    if (usageLimit > 0) {
      usageProgress = Math.max(0, (odometer - lastReading) / usageLimit);
    }

    const maxProgress = Math.max(timeProgress, usageProgress);

    // 🔱 Binary Overdue Logic: Zero Tolerance (v.45.7.8)
    const isOverdue = maxProgress >= 1.0;
    const healthScore = isOverdue ? 0 : Math.round(Math.max(0, (1 - maxProgress) * 100));

    let healthStatus = 'Healthy';
    let healthColor = '#10b981';

    if (isOverdue) {
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
      odometer,
      lastReading,
      today,
      kmLimit: usageLimit,
    };
  }

  public static processUnit(unit: FleetUnit, logger: FastifyBaseLogger): Record<string, any> {
    const decrypted = this.decryptSensitiveData(unit);
    const health = this.computeHealth(decrypted);

    return {
      ...(decrypted as unknown as Record<string, any>),
      images: this.parseImages(unit.images, unit.id, logger),
      healthScore: health.healthScore,
      healthStatus: health.healthStatus,
      healthColor: health.healthColor,
      daysSinceService: health.lastServiceDate
        ? Math.floor(
            (health.today.getTime() - health.lastServiceDate.getTime()) / (1000 * 3600 * 24)
          )
        : null,
      unitsSinceService: health.odometer - health.lastReading,
      nextServiceReading: health.lastReading + health.kmLimit,
      nextServiceKmTarget: health.lastReading + health.kmLimit,
      forecastDate: this.computeForecast(decrypted),
      currentReading: health.odometer,
    };
  }

  static computeForecast(unit: Partial<FleetUnit>): Date | null {
    const lastDate = unit.lastServiceDate ? new Date(unit.lastServiceDate) : null;
    if (!lastDate || !unit.maintIntervalDays) return null;

    const timeForecast = new Date(lastDate);
    timeForecast.setDate(timeForecast.getDate() + unit.maintIntervalDays);

    const serviceInterval = unit.maintIntervalKm || 0;
    const dailyAvg = unit.dailyUsageAvg || 0;
    const currentOdometer = unit.odometer || 0;
    const lastReading = unit.lastServiceReading || 0;

    if (serviceInterval > 0 && dailyAvg > 0) {
      const unitsRemaining = serviceInterval - (currentOdometer - lastReading);
      const daysToService = Math.max(0, unitsRemaining / dailyAvg);
      const usageForecast = new Date();
      usageForecast.setDate(usageForecast.getDate() + daysToService);

      return usageForecast < timeForecast ? usageForecast : timeForecast;
    }

    return timeForecast;
  }

  private static decryptSensitiveData(unit: FleetUnit): FleetUnit {
    return {
      ...unit,
      placas: unit.placas ? EncryptionService.decrypt(unit.placas) : unit.placas,
      numeroSerie: unit.numeroSerie
        ? EncryptionService.decrypt(unit.numeroSerie)
        : unit.numeroSerie,
      circulationCardNumber: unit.circulationCardNumber
        ? EncryptionService.decrypt(unit.circulationCardNumber)
        : unit.circulationCardNumber,
      availabilityIndex: Number(unit.availabilityIndex || ARCHON_DEFAULTS.AVAILABILITY),
      mtbfHours: Number(unit.mtbfHours || 0),
      mttrHours: Number(unit.mttrHours || 0),
      backlogCount: Number(unit.backlogCount || 0),
      year: unit.year ? Number(unit.year) : null,
    };
  }

  private static parseImages(raw: unknown, id: string, logger: FastifyBaseLogger): string[] {
    if (!raw) return [];
    try {
      const filenames = typeof raw === 'string' ? JSON.parse(raw) : (raw as string[]);
      return filenames.map((f: string) =>
        f.startsWith('http') || f.startsWith('data:') ? f : `/v1/fleet/asset/${f}`
      );
    } catch (e) {
      logger.warn(`Failed to parse images for unit ${id}: ${e}`);
      return [];
    }
  }

  static async computeKpis(unitIds: string[]): Promise<Map<string, KpiData>> {
    const kpiMap = new Map<string, KpiData>();
    if (unitIds.length === 0) return kpiMap;

    const ph = unitIds.map(() => '?').join(',');
    const defaults = (): KpiData => ({
      mtbfHours: 0,
      mttrHours: 0,
      availabilityIndex: 100,
      backlogCount: 0,
    });

    // MTTR: average repair duration per completed maintenance event (hours)
    const [mttrRows] = await db.execute<RowDataPacket[]>(
      `SELECT unit_id,
              ROUND(AVG(TIMESTAMPDIFF(MINUTE, start_at, end_at)) / 60.0, 1) AS mttr_hours
       FROM fleet_movements
       WHERE movement_type = 'MAINTENANCE'
         AND status = 'COMPLETED'
         AND start_at IS NOT NULL AND end_at IS NOT NULL
         AND unit_id IN (${ph})
       GROUP BY unit_id`,
      unitIds
    );

    mttrRows.forEach((row) => {
      kpiMap.set(row.unit_id as string, {
        ...defaults(),
        mttrHours: Number(row.mttr_hours) || 0,
      });
    });

    // MTBF: average interval (hours) between end of one maintenance and start of the next
    const [mtbfRows] = await db.execute<RowDataPacket[]>(
      `SELECT unit_id, ROUND(AVG(gap_minutes) / 60.0, 1) AS mtbf_hours
       FROM (
         SELECT unit_id,
                TIMESTAMPDIFF(MINUTE,
                  LAG(end_at) OVER (PARTITION BY unit_id ORDER BY start_at),
                  start_at
                ) AS gap_minutes
         FROM fleet_movements
         WHERE movement_type = 'MAINTENANCE'
           AND status = 'COMPLETED'
           AND start_at IS NOT NULL AND end_at IS NOT NULL
           AND unit_id IN (${ph})
       ) gaps
       WHERE gap_minutes IS NOT NULL AND gap_minutes > 0
       GROUP BY unit_id`,
      unitIds
    );

    mtbfRows.forEach((row) => {
      const uid = row.unit_id as string;
      const entry = kpiMap.get(uid) ?? defaults();
      entry.mtbfHours = Number(row.mtbf_hours) || 0;
      const { mtbfHours, mttrHours } = entry;
      entry.availabilityIndex =
        mtbfHours + mttrHours > 0
          ? Math.round((mtbfHours / (mtbfHours + mttrHours)) * 1000) / 10
          : 100;
      kpiMap.set(uid, entry);
    });

    // BCK: deferred task count from the most recent completed maintenance per unit
    const [bckRows] = await db.execute<RowDataPacket[]>(
      `SELECT ranked.unit_id, COUNT(fmd.task_code) AS backlog_count
       FROM (
         SELECT fm.unit_id, fm.id,
                ROW_NUMBER() OVER (PARTITION BY fm.unit_id ORDER BY fm.end_at DESC) AS rn
         FROM fleet_movements fm
         WHERE fm.movement_type = 'MAINTENANCE'
           AND fm.status = 'COMPLETED'
           AND fm.end_at IS NOT NULL
           AND fm.unit_id IN (${ph})
       ) ranked
       LEFT JOIN fleet_maintenance_details fmd
         ON fmd.maintenance_id = ranked.id AND fmd.status_code = 'DEFERRED'
       WHERE ranked.rn = 1
       GROUP BY ranked.unit_id`,
      unitIds
    );

    bckRows.forEach((row) => {
      const uid = row.unit_id as string;
      const entry = kpiMap.get(uid) ?? defaults();
      entry.backlogCount = Number(row.backlog_count) || 0;
      kpiMap.set(uid, entry);
    });

    return kpiMap;
  }
}
