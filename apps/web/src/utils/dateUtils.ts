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
