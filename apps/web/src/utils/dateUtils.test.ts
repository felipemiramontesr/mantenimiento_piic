import { describe, test, expect } from 'vitest';
import { formatDate, formatDateTime } from './dateUtils';

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
  });
});
