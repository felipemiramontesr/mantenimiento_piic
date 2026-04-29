import { describe, it, expect } from 'vitest';
import { calculateMaintForecast } from './fleetPredictiveEngine';

/**
 * 🔱 Archon Test Suite: FleetPredictiveEngine
 * Certification: PIIC Sovereign Maintenance Math
 */
describe('FleetPredictiveEngine - Mathematical Integrity', () => {
  it('should calculate 100% health for a brand new service', () => {
    const today = new Date();
    const result = calculateMaintForecast(
      180, // intervalDays
      10000, // intervalKm
      10, // avgDailyKm
      5000, // currentKm
      5000, // lastServiceKm
      today // lastServiceDate
    );

    expect(result?.kmParaServicio).toBe(10000);
    expect(result?.isOverdue).toBe(false);
  });

  it('should trigger OVERDUE when KM limit is exceeded', () => {
    const today = new Date();
    const result = calculateMaintForecast(
      180,
      5000,
      10,
      10001, // 1 km over limit
      5000, // last service at 5000, so limit is 10000
      today
    );

    expect(result?.kmParaServicio).toBeLessThan(0);
    expect(result?.isOverdue).toBe(true);
  });

  it('should trigger OVERDUE when Time limit is exceeded', () => {
    const overdueDate = new Date();
    overdueDate.setDate(overdueDate.getDate() - 181); // 1 day past 180 day limit

    const result = calculateMaintForecast(180, 10000, 10, 5000, 5000, overdueDate);

    expect(result?.isOverdue).toBe(true);
  });

  it('should predict correct service date based on daily average', () => {
    const today = new Date();
    // 1000 km left, 100 km/day -> should be in 10 days
    const result = calculateMaintForecast(180, 1000, 100, 0, 0, today);

    const expectedDate = new Date(today);
    expectedDate.setDate(expectedDate.getDate() + 10);

    // We compare strings to avoid hour/minute discrepancies in the test
    expect(result?.forecastDate.toDateString()).toBe(expectedDate.toDateString());
  });

  it('should handle zero or negative inputs gracefully (Safety Net)', () => {
    const result = calculateMaintForecast(0, 0, -10, 0, 0, null);

    expect(result).not.toBeNull();
    expect(result?.isOverdue).toBe(true); // 0 limit means instantly overdue
  });

  it('should prioritize the sooner of KM or Time for the final forecast', () => {
    const today = new Date();

    // Case: KM expires in 5 days, Time expires in 100 days
    const result = calculateMaintForecast(100, 500, 100, 0, 0, today);

    const expectedDate = new Date(today);
    expectedDate.setDate(expectedDate.getDate() + 5);

    expect(result?.forecastDate.toDateString()).toBe(expectedDate.toDateString());
  });
});
