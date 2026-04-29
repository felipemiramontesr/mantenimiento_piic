import { describe, it, expect } from 'vitest';
import { FleetIntelligenceEngine, FleetUnit } from './fleetIntelligence';

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
    currentReading: 5000,
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
      currentReading: 15000, // 5000 (last) + 10000 (interval)
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
      currentReading: 12500, // 75% progress -> 25% health
    };
    const result = FleetIntelligenceEngine.computeHealth(cautionUnit);
    expect(result.healthScore).toBe(25);
    expect(result.healthStatus).toBe('Caution');
    expect(result.healthColor).toBe('#f2b705');
  });

  it('should handle extreme overdue values (Negative logic)', () => {
    const criticalUnit = {
      ...mockUnit,
      currentReading: 1000000, // Way over limit
    };
    const result = FleetIntelligenceEngine.computeHealth(criticalUnit);
    expect(result.healthScore).toBe(0);
    expect(result.healthStatus).toBe('Overdue');
  });

  it('should use default interval if unit-specific interval is missing', () => {
    const unitWithNoInterval = {
      ...mockUnit,
      maintIntervalKm: 0, // Should trigger default 10,000
      currentReading: 16000, // 11,000 km since last (5,000)
    };
    const result = FleetIntelligenceEngine.computeHealth(unitWithNoInterval);
    expect(result.healthScore).toBe(0); // Overdue because 11,000 > 10,000
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
        currentReading: 0,
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
        currentReading: 0,
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
