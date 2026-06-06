/**
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest';
import { calculateIncentive, getPerformanceColor } from './ArchonIncentiveEngine';

describe('ArchonIncentiveEngine (Performance Metrics)', () => {
  it('calculates incentive correctly based on performance', () => {
    expect(calculateIncentive(100, 0.5)).toBe(7.5);
    expect(calculateIncentive(200, 1)).toBe(30);
    expect(calculateIncentive(0, 1)).toBe(0);
  });

  it('returns correct color for performance levels', () => {
    expect(getPerformanceColor(95)).toBe('text-emerald-500');
    expect(getPerformanceColor(85)).toBe('text-amber-500');
    expect(getPerformanceColor(50)).toBe('text-red-500');
  });
});
