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
  // 🔱 Fallback Constants (Standard Parity)
  const defaultIntervalDays = intervalDays || 180;
  const defaultIntervalKm = intervalKm || 10000;
  const defaultAvgDailyKm = avgDailyKm || 30;
  const safeCurrentKm = currentKm || 0;
  const safeLastServiceKm = lastServiceKm || 0;

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
  // Avoid division by zero and handle infinity
  const safeAvgDaily = defaultAvgDailyKm > 0 ? defaultAvgDailyKm : 1;
  const daysByKm = Math.floor(defaultIntervalKm / safeAvgDaily);
  const serviceByKmDate = addDays(lastDate, daysByKm);
  const serviceByTimeDate = addDays(lastDate, defaultIntervalDays);

  // 3. Final Forecast (The limiting factor)
  const forecastDate = serviceByKmDate < serviceByTimeDate ? serviceByKmDate : serviceByTimeDate;

  // 4. Overdue Logic
  const isOverdue = kmParaServicio <= 0 || forecastDate < today;

  // Calculate intensity based on how much it is overdue
  let overdueIntensity = 0;
  if (isOverdue) {
    const diffTime = Math.abs(today.getTime() - forecastDate.getTime());
    const daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const kmOverdue = Math.max(0, safeCurrentKm - nextServiceKm);
    overdueIntensity = Math.min(1, daysOverdue / 45 + kmOverdue / 2000);
  }

  return {
    intervalDays: defaultIntervalDays,
    intervalKm: defaultIntervalKm,
    avgDailyKm: defaultAvgDailyKm,
    currentKm: safeCurrentKm,
    lastServiceKm: safeLastServiceKm,
    lastServiceDate: lastDate,
    nextServiceKm,
    serviceByKmDate,
    kmParaServicio,
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
