import { describe, it, expect } from 'vitest';
import { buildOverdueDescription } from './alerts';

describe('buildOverdueDescription', () => {
  it('returns forecast message when nextServiceForecast is not null and odometer exceeds it', () => {
    expect(buildOverdueDescription(50000, 45000, '2025-01-01', 180)).toBe(
      'Odómetro 50000 km supera el pronóstico de 45000 km'
    );
  });

  it('does not produce "null" in output when nextServiceForecast is null', () => {
    const result = buildOverdueDescription(50000, null, '2025-01-01', 180);
    expect(result).not.toContain('null');
    expect(result).toContain('Última revisión');
  });

  it('uses date description when odometer is below nextServiceForecast', () => {
    const result = buildOverdueDescription(30000, 45000, '2025-01-01', 180);
    expect(result).toContain('Última revisión');
    expect(result).not.toContain('pronóstico');
  });

  it('shows N/D for null lastServiceDate', () => {
    const result = buildOverdueDescription(50000, null, null, 180);
    expect(result).toContain('N/D');
    expect(result).not.toContain('null');
  });

  it('shows N/D for null maintIntervalDays', () => {
    const result = buildOverdueDescription(50000, null, '2025-01-01', null);
    expect(result).toContain('N/D');
    expect(result).not.toContain('null');
  });

  it('formats Date object without English weekday/timezone strings', () => {
    const date = new Date('2025-12-01T06:00:00.000Z');
    const result = buildOverdueDescription(50000, null, date, 180);
    expect(result).not.toMatch(/Mon|Tue|Wed|Thu|Fri|Sat|Sun/);
    expect(result).not.toContain('GMT');
    expect(result).not.toContain('hora estándar');
    expect(result).toContain('Última revisión');
  });

  it('formats ISO string date in Spanish locale', () => {
    const result = buildOverdueDescription(50000, null, '2025-12-01', 180);
    expect(result).not.toMatch(/Mon|Tue|Wed|Thu|Fri|Sat|Sun/);
    expect(result).toContain('Última revisión');
  });
});
