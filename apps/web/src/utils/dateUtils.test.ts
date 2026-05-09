import { describe, test, expect } from 'vitest';
import { formatDate, formatDateTime, calculateDuration } from './dateUtils';

describe('Archon Date Engine (v.1.0.0)', () => {
  const mockDate = '2026-05-04T15:30:00Z';

  test('formatDate should return DD/MM/YYYY for es-MX', () => {
    const formatted = formatDate(mockDate);
    // Verified: Forecast column requirement (Date Only)
    expect(formatted).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  });

  test('formatDateTime should return DD/MM/YYYY and time with AM/PM for es-MX', () => {
    const formatted = formatDateTime(mockDate);
    expect(formatted).toMatch(/^\d{2}\/\d{2}\/\d{4}.*\d{2}:\d{2}.*(a\.m\.|p\.m\.|AM|PM)$/i);
  });

  test('formatDate should handle null/undefined', () => {
    expect(formatDate('')).toBe('---');
    // @ts-expect-error - Testing invalid input
    expect(formatDate(null)).toBe('---');
    // @ts-expect-error - Testing invalid input
    expect(formatDate(undefined)).toBe('---');
  });

  test('formatDateTime should handle null/undefined', () => {
    expect(formatDateTime('')).toBe('---');
    // @ts-expect-error - Testing invalid input
    expect(formatDateTime(null)).toBe('---');
    // @ts-expect-error - Testing invalid input
    expect(formatDateTime(undefined)).toBe('---');
  });

  test('calculateDuration should return human-readable duration', () => {
    const start = '2026-05-04T10:00:00Z';
    const end = '2026-05-04T12:30:00Z';
    expect(calculateDuration(start, end)).toBe('2h 30m');
  });

  test('calculateDuration should return --- for missing inputs', () => {
    expect(calculateDuration('', null)).toBe('---');
    // @ts-expect-error - Testing invalid input
    expect(calculateDuration(null, '2026-05-04T10:00:00Z')).toBe('---');
  });

  test('calculateDuration should return 0h 0m for negative diff', () => {
    const start = '2026-05-04T15:00:00Z';
    const end = '2026-05-04T10:00:00Z';
    expect(calculateDuration(start, end)).toBe('0h 0m');
  });
});
