/**
 * 🔱 Archon Compliance Engine: Hoy No Circula logic
 * Based on SEDEMA (Mexico City) environmental regulations.
 */

export interface RestrictionStatus {
  isRestricted: boolean;
  reason: string;
  color: string;
}

export const checkHoyNoCircula = (
  hologram: string | null,
  placas: string | null
): RestrictionStatus => {
  if (!hologram || !placas) {
    return { isRestricted: false, reason: '', color: '' };
  }

  // 🔱 Exemption Layer: 00, 0, and Exento are free to circulate
  const exemptHolograms = ['00', '0', 'Exento'];
  if (exemptHolograms.includes(hologram)) {
    return { isRestricted: false, reason: 'Exento por Holograma', color: 'emerald' };
  }

  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 (Sun) to 6 (Sat)

  // Clean plate to get last digit
  const lastDigitMatch = placas.match(/\d(?=[^\d]*$)/);
  if (!lastDigitMatch) return { isRestricted: false, reason: '', color: '' };
  const lastDigit = parseInt(lastDigitMatch[0], 10);

  // 1. Weekly Restrictions (Monday to Friday)
  if (dayOfWeek >= 1 && dayOfWeek <= 5) {
    const restrictions: Record<number, number[]> = {
      1: [5, 6], // Monday
      2: [7, 8], // Tuesday
      3: [3, 4], // Wednesday
      4: [1, 2], // Thursday
      5: [9, 0], // Friday
    };

    if (restrictions[dayOfWeek].includes(lastDigit)) {
      return {
        isRestricted: true,
        reason: 'Restricción Semanal (Hoy No Circula)',
        color: 'rose',
      };
    }
  }

  // 2. Saturday Restrictions (Hologram 1 & 2)
  if (dayOfWeek === 6) {
    if (hologram === '2') {
      return { isRestricted: true, reason: 'Restricción Sabatina (Holograma 2)', color: 'rose' };
    }

    if (hologram === '1') {
      // Logic for 1st/3rd vs 2nd/4th Saturday (based on odd/even last digit)
      const date = today.getDate();
      const weekOfMonth = Math.ceil(date / 7);

      // 1st and 3rd Saturday: Restricted if odd (1, 3, 5, 7, 9)
      // 2nd and 4th Saturday: Restricted if even (2, 4, 6, 8, 0)
      const isOddDigit = lastDigit % 2 !== 0;
      const isOddSaturday = weekOfMonth % 2 !== 0;

      if ((isOddSaturday && isOddDigit) || (!isOddSaturday && !isOddDigit)) {
        return { isRestricted: true, reason: 'Restricción Sabatina (Holograma 1)', color: 'rose' };
      }
    }
  }

  return { isRestricted: false, reason: 'Circula sin restricciones', color: 'emerald' };
};
