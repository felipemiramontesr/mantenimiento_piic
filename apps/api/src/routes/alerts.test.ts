import { describe, it, expect } from 'vitest';
import { buildOverdueDescription, computeOverdueSeverity } from './alerts';

// ─── computeOverdueSeverity ───────────────────────────────────────────────────

describe('computeOverdueSeverity — km-based', () => {
  it('CRITICAL when odometer >= 150% of forecast', () => {
    expect(computeOverdueSeverity(15000, 10000, null, null)).toBe('CRITICAL');
  });

  it('HIGH when odometer is 110–149% of forecast', () => {
    expect(computeOverdueSeverity(12000, 10000, null, null)).toBe('HIGH');
  });

  it('MEDIUM when odometer is 100–109% of forecast', () => {
    expect(computeOverdueSeverity(10500, 10000, null, null)).toBe('MEDIUM');
  });

  it('LOW when odometer is 90–99% of forecast (approaching)', () => {
    expect(computeOverdueSeverity(9500, 10000, null, null)).toBe('LOW');
  });

  it('LOW when forecast is null (no km criterion)', () => {
    expect(computeOverdueSeverity(50000, null, null, null)).toBe('LOW');
  });
});

describe('computeOverdueSeverity — days-based', () => {
  it('CRITICAL when > 60 days overdue', () => {
    const date = new Date();
    date.setDate(date.getDate() - 240);
    expect(computeOverdueSeverity(0, null, date, 90)).toBe('CRITICAL');
  });

  it('HIGH when 30–60 days overdue', () => {
    const date = new Date();
    date.setDate(date.getDate() - 130);
    expect(computeOverdueSeverity(0, null, date, 90)).toBe('HIGH');
  });

  it('MEDIUM when 14–30 days overdue', () => {
    const date = new Date();
    date.setDate(date.getDate() - 110);
    expect(computeOverdueSeverity(0, null, date, 90)).toBe('MEDIUM');
  });

  it('LOW when <= 14 days overdue', () => {
    const date = new Date();
    date.setDate(date.getDate() - 97);
    expect(computeOverdueSeverity(0, null, date, 90)).toBe('LOW');
  });

  it('LOW when upcoming (within 14 days before due)', () => {
    const date = new Date();
    date.setDate(date.getDate() - 83);
    expect(computeOverdueSeverity(0, null, date, 90)).toBe('LOW');
  });
});

describe('computeOverdueSeverity — max of both criteria', () => {
  it('returns max severity when km=MEDIUM and days=HIGH', () => {
    const date = new Date();
    date.setDate(date.getDate() - 130);
    expect(computeOverdueSeverity(10500, 10000, date, 90)).toBe('HIGH');
  });

  it('returns max severity when km=HIGH and days=MEDIUM', () => {
    const date = new Date();
    date.setDate(date.getDate() - 110);
    expect(computeOverdueSeverity(12000, 10000, date, 90)).toBe('HIGH');
  });
});

// ─── buildOverdueDescription ─────────────────────────────────────────────────

describe('buildOverdueDescription', () => {
  it('returns forecast overdue message when odometer exceeds forecast', () => {
    expect(buildOverdueDescription(50000, 45000, '2025-01-01', 180)).toBe(
      'Odómetro 50000 km supera el pronóstico de 45000 km'
    );
  });

  it('returns km approaching message when odometer is below forecast', () => {
    const result = buildOverdueDescription(9500, 10000, '2025-01-01', 180);
    expect(result).toContain('Pronóstico: 10000 km');
    expect(result).toContain('faltan 500 km');
    expect(result).not.toContain('supera');
  });

  it('does not produce "null" in output when nextServiceForecast is null', () => {
    const result = buildOverdueDescription(50000, null, '2025-01-01', 180);
    expect(result).not.toContain('null');
    expect(result).toContain('Último Mantenimiento');
  });

  it('returns days overdue message when date-based and overdue', () => {
    const result = buildOverdueDescription(0, null, '2020-01-01', 30);
    expect(result).toContain('días vencido');
    expect(result).not.toContain('null');
  });

  it('returns upcoming message when date-based and not yet due', () => {
    const date = new Date();
    date.setDate(date.getDate() - 10);
    const result = buildOverdueDescription(0, null, date, 90);
    expect(result).toContain('Próximo Mantenimiento');
    expect(result).toContain('en');
    expect(result).not.toContain('null');
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
  });

  it('formats ISO string date in Spanish locale', () => {
    const result = buildOverdueDescription(50000, null, '2025-12-01', 180);
    expect(result).not.toMatch(/Mon|Tue|Wed|Thu|Fri|Sat|Sun/);
  });
});
