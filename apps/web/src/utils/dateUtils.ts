/**
 * 🔱 ARCHON DATE ENGINE (v.1.0.0)
 * Sovereign Localization Utility
 * Standards: es-MX (DD/MM/YYYY)
 */

/**
 * Formats a date string or object to the Spanish (Mexico) standard (Date only).
 * @param date - The date to format (string, number, or Date object)
 * @returns Formatted date string (DD/MM/YYYY)
 */
export const formatDate = (date: string | number | Date): string => {
  if (!date) return '---';
  return new Date(date).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

/**
 * Formats a date with time to the Spanish (Mexico) standard (AM/PM).
 * @param date - The date to format
 * @returns Formatted date/time string (DD/MM/YYYY hh:mm AM/PM)
 */
export const formatDateTime = (date: string | number | Date): string => {
  if (!date) return '---';
  return new Date(date).toLocaleString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};
/**
 * Calculates the duration between two dates in a human-readable hour format.
 * @param start - Start date
 * @param end - End date
 * @returns Formatted duration string (e.g., "2h 30m")
 */
export const calculateDuration = (
  start: string | number | Date,
  end: string | number | Date | null
): string => {
  if (!start || !end) return '---';
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  const diffMs = e - s;

  if (diffMs < 0) return '0h 0m';

  const totalMinutes = Math.floor(diffMs / 1000 / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${hours}h ${minutes}m`;
};
