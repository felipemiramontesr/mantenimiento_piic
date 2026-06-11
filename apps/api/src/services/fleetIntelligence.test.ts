/* eslint-disable */
// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FleetIntelligenceEngine, FleetUnit } from './fleetIntelligence';

// ── DB mock for computeKpis ───────────────────────────────────────────────────
vi.mock('./db', () => ({
  default: {
    execute: vi.fn(),
  },
}));
import db from './db';

/**
 * 🔱 Archon Test Suite: FleetIntelligenceEngine
 * Certification: API Analytical Core
 */
describe('FleetIntelligenceEngine - Backend Integrity', () => {
  const mockUnit: Partial<FleetUnit> = {
    id: 'ASM-001',
    maintIntervalDays: 180,
    maintIntervalKm: 10000,
    lastServiceReading: 5000,
    odometer: 5000,
    lastServiceDate: new Date().toISOString(),
  };

  it('should return 100% health for fresh maintenance', () => {
    const result = FleetIntelligenceEngine.computeHealth(mockUnit);
    expect(result.healthScore).toBe(100);
    expect(result.healthStatus).toBe('Healthy');
  });

  it('should collapse to 0% health when KM limit is exactly reached', () => {
    const overdueUnit = {
      ...mockUnit,
      odometer: 15000, // 5000 (last) + 10000 (interval)
    };
    const result = FleetIntelligenceEngine.computeHealth(overdueUnit);
    expect(result.healthScore).toBe(0);
    expect(result.healthStatus).toBe('Overdue');
  });

  it('should collapse to 0% health when Time limit is exactly reached', () => {
    const overdueDate = new Date();
    overdueDate.setDate(overdueDate.getDate() - 180); // Exactly 180 days

    const overdueUnit = {
      ...mockUnit,
      lastServiceDate: overdueDate.toISOString(),
    };
    const result = FleetIntelligenceEngine.computeHealth(overdueUnit);
    expect(result.healthScore).toBe(0);
    expect(result.healthStatus).toBe('Overdue');
  });

  it('should show Caution status when health is at 25%', () => {
    const cautionUnit = {
      ...mockUnit,
      odometer: 12500, // 75% progress -> 25% health
    };
    const result = FleetIntelligenceEngine.computeHealth(cautionUnit);
    expect(result.healthScore).toBe(25);
    expect(result.healthStatus).toBe('Caution');
    expect(result.healthColor).toBe('#f2b705');
  });

  it('should handle extreme overdue values (Negative logic)', () => {
    const criticalUnit = {
      ...mockUnit,
      odometer: 1000000, // Way over limit
    };
    const result = FleetIntelligenceEngine.computeHealth(criticalUnit);
    expect(result.healthScore).toBe(0);
    expect(result.healthStatus).toBe('Overdue');
  });

  it('should use default interval if unit-specific interval is missing', () => {
    const unitWithNoInterval = {
      ...mockUnit,
      maintIntervalKm: 0, // Should trigger default 10,000
      odometer: 16000, // 11,000 km since last (5,000)
    };
    const result = FleetIntelligenceEngine.computeHealth(unitWithNoInterval);
    expect(result.healthScore).toBe(0); // Overdue because 11,000 > 10,000
  });

  it('converts year to Number when unit.year is truthy (line 178 truthy branch)', () => {
    const unitWithYear = {
      ...mockUnit,
      id: 'ASM-YEAR',
      year: 2020,
      odometer: 5000,
      lastServiceDate: new Date().toISOString(),
    };
    const mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      trace: vi.fn(),
    };
    const result = FleetIntelligenceEngine.processUnit(unitWithYear as any, mockLogger as any);
    expect(result.year).toBe(2020);
  });

  describe('computeKpis — KPI Aggregation Engine', () => {
    beforeEach(() => {
      vi.mocked(db.execute).mockReset();
    });

    it('returns an empty map when unitIds is empty', async () => {
      const result = await FleetIntelligenceEngine.computeKpis([]);
      expect(result.size).toBe(0);
      expect(db.execute).not.toHaveBeenCalled();
    });

    it('returns default KPI values when unit has no maintenance history', async () => {
      // All three queries return empty result sets
      vi.mocked(db.execute)
        .mockResolvedValueOnce([[]]) // MTTR: no rows
        .mockResolvedValueOnce([[]]) // MTBF: no rows
        .mockResolvedValueOnce([[]]); // BCK: no rows

      const result = await FleetIntelligenceEngine.computeKpis(['ASM-NEW']);
      // Unit is absent from the map when no history exists
      expect(result.has('ASM-NEW')).toBe(false);
    });

    it('computes MTTR correctly from DB row', async () => {
      vi.mocked(db.execute)
        .mockResolvedValueOnce([[{ unit_id: 'ASM-001', mttr_hours: 96.5 }]])
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([[]]);

      const result = await FleetIntelligenceEngine.computeKpis(['ASM-001']);
      const kpi = result.get('ASM-001');
      expect(kpi).toBeDefined();
      expect(kpi.mttrHours).toBe(96.5);
    });

    it('computes MTBF and derives availabilityIndex', async () => {
      // MTTR = 120h, MTBF = 480h → DISP = 480 / (480 + 120) * 100 = 80.0
      vi.mocked(db.execute)
        .mockResolvedValueOnce([[{ unit_id: 'ASM-002', mttr_hours: 120 }]])
        .mockResolvedValueOnce([[{ unit_id: 'ASM-002', mtbf_hours: 480 }]])
        .mockResolvedValueOnce([[]]);

      const result = await FleetIntelligenceEngine.computeKpis(['ASM-002']);
      const kpi = result.get('ASM-002');
      expect(kpi.mtbfHours).toBe(480);
      expect(kpi.mttrHours).toBe(120);
      expect(kpi.availabilityIndex).toBeCloseTo(80.0, 1);
    });

    it('sets availabilityIndex to 100 when MTBF + MTTR is zero', async () => {
      vi.mocked(db.execute)
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([[{ unit_id: 'ASM-003', mtbf_hours: 0 }]])
        .mockResolvedValueOnce([[]]);

      const result = await FleetIntelligenceEngine.computeKpis(['ASM-003']);
      const kpi = result.get('ASM-003');
      expect(kpi.availabilityIndex).toBe(100);
    });

    it('reads backlogCount from BCK query', async () => {
      vi.mocked(db.execute)
        .mockResolvedValueOnce([[{ unit_id: 'ASM-004', mttr_hours: 72 }]])
        .mockResolvedValueOnce([[{ unit_id: 'ASM-004', mtbf_hours: 360 }]])
        .mockResolvedValueOnce([[{ unit_id: 'ASM-004', backlog_count: 3 }]]);

      const result = await FleetIntelligenceEngine.computeKpis(['ASM-004']);
      const kpi = result.get('ASM-004');
      expect(kpi.backlogCount).toBe(3);
    });

    it('handles multiple units in a single call', async () => {
      vi.mocked(db.execute)
        .mockResolvedValueOnce([
          [
            { unit_id: 'ASM-001', mttr_hours: 96 },
            { unit_id: 'ASM-002', mttr_hours: 144 },
          ],
        ])
        .mockResolvedValueOnce([
          [
            { unit_id: 'ASM-001', mtbf_hours: 480 },
            { unit_id: 'ASM-002', mtbf_hours: 720 },
          ],
        ])
        .mockResolvedValueOnce([
          [
            { unit_id: 'ASM-001', backlog_count: 1 },
            { unit_id: 'ASM-002', backlog_count: 0 },
          ],
        ]);

      const result = await FleetIntelligenceEngine.computeKpis(['ASM-001', 'ASM-002']);
      expect(result.size).toBe(2);
      expect(result.get('ASM-001').backlogCount).toBe(1);
      expect(result.get('ASM-002').backlogCount).toBe(0);
    });

    it('returns 0 backlogCount when BCK query returns 0', async () => {
      vi.mocked(db.execute)
        .mockResolvedValueOnce([[{ unit_id: 'ASM-005', mttr_hours: 48 }]])
        .mockResolvedValueOnce([[{ unit_id: 'ASM-005', mtbf_hours: 240 }]])
        .mockResolvedValueOnce([[{ unit_id: 'ASM-005', backlog_count: 0 }]]);

      const result = await FleetIntelligenceEngine.computeKpis(['ASM-005']);
      expect(result.get('ASM-005').backlogCount).toBe(0);
    });

    it('triggers defaults() for unit in BCK not previously seen in MTTR/MTBF (line 280)', async () => {
      vi.mocked(db.execute)
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([[{ unit_id: 'ASM-BCK-ONLY', backlog_count: 5 }]]);

      const result = await FleetIntelligenceEngine.computeKpis(['ASM-BCK-ONLY']);
      const kpi = result.get('ASM-BCK-ONLY');
      expect(kpi?.backlogCount).toBe(5);
    });

    it('handles null/missing DB values gracefully (coerces to 0)', async () => {
      vi.mocked(db.execute)
        .mockResolvedValueOnce([[{ unit_id: 'ASM-006', mttr_hours: null }]])
        .mockResolvedValueOnce([[{ unit_id: 'ASM-006', mtbf_hours: null }]])
        .mockResolvedValueOnce([[{ unit_id: 'ASM-006', backlog_count: null }]]);

      const result = await FleetIntelligenceEngine.computeKpis(['ASM-006']);
      const kpi = result.get('ASM-006');
      expect(kpi.mttrHours).toBe(0);
      // MTBF entry creates entry but with 0 values → availabilityIndex stays 100
      expect(kpi.availabilityIndex).toBe(100);
    });
  });

  describe('Predictive Forecasting (Archon Core)', () => {
    it('should forecast by time when usage data is missing', () => {
      const lastDate = new Date();
      lastDate.setDate(lastDate.getDate() - 10); // 10 days ago

      const unit = {
        lastServiceDate: lastDate.toISOString(),
        maintIntervalDays: 30,
        dailyUsageAvg: 0, // No usage
      };

      const forecast = FleetIntelligenceEngine.computeForecast(unit);
      expect(forecast).not.toBeNull();

      const expectedDate = new Date(lastDate);
      expectedDate.setDate(expectedDate.getDate() + 30);
      expect(forecast?.toDateString()).toBe(expectedDate.toDateString());
    });

    it('should forecast by usage when it is sooner than time limit', () => {
      const lastDate = new Date(); // Today
      const unit = {
        lastServiceDate: lastDate.toISOString(),
        maintIntervalDays: 365, // 1 year
        maintIntervalKm: 10000,
        lastServiceReading: 0,
        odometer: 0,
        dailyUsageAvg: 1000, // Very high usage: 10 days to reach 10,000
      };

      const forecast = FleetIntelligenceEngine.computeForecast(unit);
      expect(forecast).not.toBeNull();

      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() + 10);
      expect(forecast?.toDateString()).toBe(expectedDate.toDateString());
    });

    it('should forecast by time when it is sooner than usage limit', () => {
      const lastDate = new Date(); // Today
      const unit = {
        lastServiceDate: lastDate.toISOString(),
        maintIntervalDays: 5, // Very soon
        maintIntervalKm: 10000,
        lastServiceReading: 0,
        odometer: 0,
        dailyUsageAvg: 1, // 10,000 days to reach limit
      };

      const forecast = FleetIntelligenceEngine.computeForecast(unit);
      expect(forecast).not.toBeNull();

      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() + 5);
      expect(forecast?.toDateString()).toBe(expectedDate.toDateString());
    });
  });
});
