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

export const predecirHologramaYEngomado = (
  placas: string | null,
  year: number | null,
  assetTypeCode: string | null
): { hologramaSugerido: string; engomadoColor: string; mesesVerificacion: string } => {
  if (!placas) {
    return {
      hologramaSugerido: '0',
      engomadoColor: 'Gris',
      mesesVerificacion: 'Captura placas...',
    };
  }

  const cleanPlaca = placas.toUpperCase().trim();

  // 1. Detección de Eléctricos / Híbridos (Ecológicos)
  const esEcologico =
    cleanPlaca.startsWith('E') || assetTypeCode === 'AT_ELEC' || cleanPlaca.includes('ECOL');
  if (esEcologico) {
    return {
      hologramaSugerido: 'Exento',
      engomadoColor: 'Exento',
      mesesVerificacion: 'No aplica (Exento)',
    };
  }

  // 2. Detección de Foráneos
  const esForaneo =
    cleanPlaca.includes('FOR') ||
    cleanPlaca.startsWith('F') ||
    (cleanPlaca.length > 2 && !/\d/.test(cleanPlaca));
  if (esForaneo) {
    return {
      hologramaSugerido: 'Foráneo',
      engomadoColor: 'Foráneo',
      mesesVerificacion: 'No aplica (Foráneo)',
    };
  }

  // 3. Obtener el último dígito para deducir Engomado y Calendario
  const lastDigitMatch = cleanPlaca.match(/\d(?=[^\d]*$)/);
  let lastDigit = 9; // Fallback
  if (lastDigitMatch) {
    lastDigit = parseInt(lastDigitMatch[0], 10);
  }

  const calendarioEngomado: Record<number, { color: string; meses: string }> = {
    5: { color: 'Amarillo', meses: 'Julio / Agosto' },
    6: { color: 'Amarillo', meses: 'Julio / Agosto' },
    7: { color: 'Rosa', meses: 'Agosto / Septiembre' },
    8: { color: 'Rosa', meses: 'Agosto / Septiembre' },
    3: { color: 'Rojo', meses: 'Septiembre / Octubre' },
    4: { color: 'Rojo', meses: 'Septiembre / Octubre' },
    1: { color: 'Verde', meses: 'Octubre / Noviembre' },
    2: { color: 'Verde', meses: 'Octubre / Noviembre' },
    9: { color: 'Azul', meses: 'Noviembre / Diciembre' },
    0: { color: 'Azul', meses: 'Noviembre / Diciembre' },
  };

  const infoPlaca = calendarioEngomado[lastDigit] || { color: 'Gris', meses: 'No determinado' };

  // 4. Pre-selección heurística del Holograma basada en el Año
  let hologramaSugerido = '0';
  if (year) {
    if (year >= 2023) hologramaSugerido = '00';
    else if (year >= 2018) hologramaSugerido = '0';
    else if (year >= 2016) hologramaSugerido = '1';
    else hologramaSugerido = '2';
  }

  return {
    hologramaSugerido,
    engomadoColor: infoPlaca.color,
    mesesVerificacion: infoPlaca.meses,
  };
};
