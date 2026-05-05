import { describe, test, expect } from 'vitest';
import { formatDate, formatDateTime } from './dateUtils';

describe('Archon Date Engine (v.1.0.0)', () => {
  const mockDate = '2026-05-04T15:30:00Z';

  test('formatDate should return DD/MM/YYYY for es-MX', () => {
    const formatted = formatDate(mockDate);
    // Note: Depending on the environment, it might use / or -
    // But it must have day first, then month, then year.
    expect(formatted).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    expect(formatted).toBe('04/05/2026');
  });

  test('formatDateTime should return DD/MM/YYYY and time for es-MX', () => {
    const formatted = formatDateTime(mockDate);
    // Be more flexible with the separator (comma or space)
    expect(formatted).toMatch(/^\d{2}\/\d{2}\/\d{4}.*\d{2}:\d{2}$/);
  });

  test('formatDate should handle null/undefined', () => {
    expect(formatDate('')).toBe('---');
    // @ts-expect-error - Testing invalid input
    expect(formatDate(null)).toBe('---');
  });
});
