/**
 * 🔱 Archon Incentive Engine
 * Logic for calculating performance-based incentives and styling.
 */

/**
 * Calculates the incentive amount based on performance factor.
 * @param km Traveled distance
 * @param factor Performance factor (0-1)
 * @returns Calculated incentive
 */
export const calculateIncentive = (km: number, factor: number): number => km * factor * 0.15; // Standard Archon multiplier

/**
 * Returns the tailwind color class based on performance percentage.
 * @param percentage Performance percentage (0-100)
 * @returns Tailwind CSS class
 */
export const getPerformanceColor = (percentage: number): string => {
  if (percentage >= 90) return 'text-emerald-500';
  if (percentage >= 75) return 'text-amber-500';
  return 'text-red-500';
};
