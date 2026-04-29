/**
 * 🔱 Archon Engine: FleetPredictiveEngine
 * Logic: PIIC Sovereign Maintenance Forecasting (v.28.0.0)
 * Replicates the exact math from the master maintenance spreadsheet.
 * Implementation: Native Date Logic (Zero-Dependency)
 */

export interface MaintenanceForecast {
  intervalDays: number;
  intervalKm: number;
  avgDailyKm: number;
  currentKm: number;
  lastServiceKm: number;
  lastServiceDate: Date;
  nextServiceKm: number;
  serviceByKmDate: Date;
  kmParaServicio: number;
  serviceByTimeDate: Date;
  forecastDate: Date;
  isOverdue: boolean;
  overdueIntensity: number; // 0 to 1 for visual alerting
}

const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

export const calculateMaintForecast = (
  intervalDays: number | null | undefined,
  intervalKm: number | null | undefined,
  avgDailyKm: number | null | undefined,
  currentKm: number | null | undefined,
  lastServiceKm: number | null | undefined,
  lastServiceDateStr: string | null | Date | undefined
): MaintenanceForecast | null => {
  // 🔱 Strict Type Casting (Database Parity)
  const castCurrentKm = Number(currentKm);
  const castLastServiceKm = Number(lastServiceKm);

  // 🔱 Fallback Constants (Standard Parity)
  const defaultIntervalDays =
    intervalDays !== null && intervalDays !== undefined ? Number(intervalDays) : 180;
  const defaultIntervalKm =
    intervalKm !== null && intervalKm !== undefined ? Number(intervalKm) : 10000;
  const defaultAvgDailyKm =
    avgDailyKm !== null && avgDailyKm !== undefined ? Number(avgDailyKm) : 30;
  const safeCurrentKm = castCurrentKm || 0;
  const safeLastServiceKm = castLastServiceKm || 0;

  // 🔱 Fallback Date Logic
  // If no date is provided, we assume the unit is due based on today - standard interval
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const lastDate = lastServiceDateStr
    ? new Date(lastServiceDateStr)
    : addDays(today, -defaultIntervalDays);

  // 1. KM Calculations
  const nextServiceKm = safeLastServiceKm + defaultIntervalKm;
  const kmParaServicio = nextServiceKm - safeCurrentKm;

  // 2. Date Calculations
  // 🔱 HIGH-PRECISION FORECAST (v.39.9.2.0)
  // Calculate remaining days based on CURRENT KM deficit, starting from TODAY.
  const safeAvgDaily = defaultAvgDailyKm > 0 ? defaultAvgDailyKm : 1;
  const daysToKmTarget = Math.floor(kmParaServicio / safeAvgDaily);

  // Service by KM is Today + days remaining
  const serviceByKmDate = addDays(today, daysToKmTarget);

  // Service by Time remains strictly tied to the last service date + interval
  const serviceByTimeDate = addDays(lastDate, defaultIntervalDays);

  // 3. Final Forecast (The limiting factor)
  // The forecast is the SOONER of the two dates
  const forecastDate =
    serviceByKmDate < serviceByTimeDate
      ? new Date(serviceByKmDate.setHours(0, 0, 0, 0))
      : new Date(serviceByTimeDate.setHours(0, 0, 0, 0));

  // 4. Overdue Logic
  // A unit is overdue IF:
  // - Remaining KM is zero or negative
  // - OR the Time-based service date has passed
  const isOverdue = kmParaServicio <= 0 || serviceByTimeDate < today || forecastDate < today;

  // Calculate intensity based on how much it is overdue
  let overdueIntensity = 0;
  if (isOverdue) {
    const diffTime = Math.abs(today.getTime() - forecastDate.getTime());
    const daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const kmOverdue = Math.max(0, safeCurrentKm - nextServiceKm);
    overdueIntensity = Math.min(1, daysOverdue / 45 + kmOverdue / 2000);
  }

  // 🔱 Zero-NaN Guarantee
  const finalKmParaServicio = Number.isNaN(kmParaServicio) ? 0 : kmParaServicio;
  const finalNextServiceKm = Number.isNaN(nextServiceKm) ? 0 : nextServiceKm;

  return {
    intervalDays: defaultIntervalDays,
    intervalKm: defaultIntervalKm,
    avgDailyKm: defaultAvgDailyKm,
    currentKm: safeCurrentKm,
    lastServiceKm: safeLastServiceKm,
    lastServiceDate: lastDate,
    nextServiceKm: finalNextServiceKm,
    serviceByKmDate,
    kmParaServicio: finalKmParaServicio,
    serviceByTimeDate,
    forecastDate,
    isOverdue,
    overdueIntensity,
  };
};

export const formatDate = (date: Date): string =>
  date.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });
