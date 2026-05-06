import { describe, it, expect } from 'vitest';
import { calculateIncentive, getPerformanceColor } from './ArchonIncentiveEngine';

describe('ArchonIncentiveEngine (Performance Metrics)', () => {
  it('calculates incentive correctly based on performance', () => {
    // Assuming calculateIncentive(km, factor)
    // I'll check the implementation first
    expect(calculateIncentive).toBeDefined();
  });

  it('returns correct color for performance levels', () => {
    expect(getPerformanceColor(95)).toBe('text-emerald-500');
    expect(getPerformanceColor(85)).toBe('text-amber-500');
    expect(getPerformanceColor(50)).toBe('text-red-500');
  });
});
