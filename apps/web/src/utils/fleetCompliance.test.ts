import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { checkHoyNoCircula } from './fleetCompliance';

/**
 * 🔱 Archon Compliance Engine: Hoy No Circula Logic Tests
 * Architecture: Sovereign Registry Validation
 * Version: 1.0.0
 */

describe('Fleet Compliance Engine (Hoy No Circula)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return non-restricted for exempt holograms (00, 0, Exento)', () => {
    expect(checkHoyNoCircula('00', 'ABC-123')).toEqual({
      isRestricted: false,
      reason: 'Exento por Holograma',
      color: 'emerald',
    });
    expect(checkHoyNoCircula('0', 'XYZ-987')).toEqual({
      isRestricted: false,
      reason: 'Exento por Holograma',
      color: 'emerald',
    });
    expect(checkHoyNoCircula('Exento', 'K-123-L')).toEqual({
      isRestricted: false,
      reason: 'Exento por Holograma',
      color: 'emerald',
    });
  });

  it('should return false if hologram or plates are missing', () => {
    expect(checkHoyNoCircula(null, 'ABC-123').isRestricted).toBe(false);
    expect(checkHoyNoCircula('1', null).isRestricted).toBe(false);
  });

  it('should handle plates with no digits gracefully', () => {
    expect(checkHoyNoCircula('1', 'ABC').isRestricted).toBe(false);
  });

  it('should restrict plates ending in 5 or 6 on Mondays', () => {
    const monday = new Date('2026-03-09T12:00:00Z'); // Monday
    vi.setSystemTime(monday);

    expect(checkHoyNoCircula('1', 'ABC-5').isRestricted).toBe(true);
    expect(checkHoyNoCircula('2', 'XYZ-6').isRestricted).toBe(true);
    expect(checkHoyNoCircula('1', 'DEF-0').isRestricted).toBe(false);
  });

  it('should restrict plates ending in 7 or 8 on Tuesdays', () => {
    const tuesday = new Date('2026-03-10T12:00:00Z'); // Tuesday
    vi.setSystemTime(tuesday);

    expect(checkHoyNoCircula('1', 'ABC-7').isRestricted).toBe(true);
    expect(checkHoyNoCircula('2', 'XYZ-8').isRestricted).toBe(true);
  });

  it('should restrict plates ending in 3 or 4 on Wednesdays', () => {
    const wednesday = new Date('2026-03-11T12:00:00Z'); // Wednesday
    vi.setSystemTime(wednesday);

    expect(checkHoyNoCircula('1', 'ABC-3').isRestricted).toBe(true);
    expect(checkHoyNoCircula('2', 'XYZ-4').isRestricted).toBe(true);
  });

  it('should restrict plates ending in 1 or 2 on Thursdays', () => {
    const thursday = new Date('2026-03-12T12:00:00Z'); // Thursday
    vi.setSystemTime(thursday);

    expect(checkHoyNoCircula('1', 'ABC-1').isRestricted).toBe(true);
    expect(checkHoyNoCircula('2', 'XYZ-2').isRestricted).toBe(true);
  });

  it('should restrict plates ending in 9 or 0 on Fridays', () => {
    const friday = new Date('2026-03-13T12:00:00Z'); // Friday
    vi.setSystemTime(friday);

    expect(checkHoyNoCircula('1', 'ABC-9').isRestricted).toBe(true);
    expect(checkHoyNoCircula('2', 'XYZ-0').isRestricted).toBe(true);
  });

  it('should restrict all Hologram 2 vehicles on Saturdays', () => {
    const saturday = new Date('2026-03-14T12:00:00Z'); // Saturday
    vi.setSystemTime(saturday);

    expect(checkHoyNoCircula('2', 'ABC-1').isRestricted).toBe(true);
  });

  it('should restrict Hologram 1 with odd plates on 1st and 3rd Saturdays', () => {
    const firstSaturday = new Date('2026-03-07T12:00:00Z'); // 1st Sat
    vi.setSystemTime(firstSaturday);
    expect(checkHoyNoCircula('1', 'ABC-1').isRestricted).toBe(true);
    expect(checkHoyNoCircula('1', 'ABC-2').isRestricted).toBe(false);

    const thirdSaturday = new Date('2026-03-21T12:00:00Z'); // 3rd Sat
    vi.setSystemTime(thirdSaturday);
    expect(checkHoyNoCircula('1', 'ABC-5').isRestricted).toBe(true);
  });

  it('should restrict Hologram 1 with even plates on 2nd and 4th Saturdays', () => {
    const secondSaturday = new Date('2026-03-14T12:00:00Z'); // 2nd Sat
    vi.setSystemTime(secondSaturday);
    expect(checkHoyNoCircula('1', 'ABC-2').isRestricted).toBe(true);
    expect(checkHoyNoCircula('1', 'ABC-3').isRestricted).toBe(false);

    const fourthSaturday = new Date('2026-03-28T12:00:00Z'); // 4th Sat
    vi.setSystemTime(fourthSaturday);
    expect(checkHoyNoCircula('1', 'ABC-0').isRestricted).toBe(true);
  });

  it('should allow circulation on Sundays', () => {
    const sunday = new Date('2026-03-15T12:00:00Z'); // Sunday
    vi.setSystemTime(sunday);

    expect(checkHoyNoCircula('2', 'ABC-1').isRestricted).toBe(false);
  });
});
