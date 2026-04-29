import { FastifyBaseLogger } from 'fastify';
import { RowDataPacket } from 'mysql2';
import EncryptionService from './encryption';

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
  currentReading: number;
  availabilityIndex: number;
  mtbfHours: number;
  mttrHours: number;
  backlogCount: number;
  images: string | null;
  circulationCardNumber?: string | null;
}

export interface UnitHealth {
  healthScore: number;
  healthStatus: string;
  healthColor: string;
  lastServiceDate: Date | null;
  currentReading: number;
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
    const currentReading = Number(unit.currentReading || 0);

    const timeLimit = Number(unit.maintIntervalDays || ARCHON_DEFAULTS.MAINT_INTERVAL_DAYS);
    const usageLimit = Number(unit.maintIntervalKm || ARCHON_DEFAULTS.MAINT_INTERVAL_KM);

    let timeProgress = 0;
    if (lastServiceDate && timeLimit > 0) {
      const diffDays = (today.getTime() - lastServiceDate.getTime()) / (1000 * 3600 * 24);
      timeProgress = Math.max(0, diffDays / timeLimit);
    }

    let usageProgress = 0;
    if (usageLimit > 0) {
      usageProgress = Math.max(0, (currentReading - lastReading) / usageLimit);
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
      currentReading,
      lastReading,
      today,
      kmLimit: usageLimit,
    };
  }

  static processUnit(unit: FleetUnit, logger: FastifyBaseLogger): Record<string, unknown> {
    const decrypted = this.decryptSensitiveData(unit);
    const health = this.computeHealth(decrypted);

    return {
      ...(decrypted as unknown as Record<string, unknown>),
      images: this.parseImages(unit.images, unit.id, logger),
      healthScore: health.healthScore,
      healthStatus: health.healthStatus,
      healthColor: health.healthColor,
      daysSinceService: health.lastServiceDate
        ? Math.floor(
            (health.today.getTime() - health.lastServiceDate.getTime()) / (1000 * 3600 * 24)
          )
        : null,
      unitsSinceService: health.currentReading - health.lastReading,
      nextServiceReading: health.lastReading + health.kmLimit,
    };
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
    };
  }

  private static parseImages(raw: unknown, id: string, logger: FastifyBaseLogger): string[] {
    if (!raw) return [];
    try {
      return typeof raw === 'string' ? JSON.parse(raw) : (raw as string[]);
    } catch (e) {
      logger.warn(`Failed to parse images for unit ${id}: ${e}`);
      return [];
    }
  }
}
