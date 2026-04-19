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
  intervalDays: number,
  intervalKm: number,
  avgDailyKm: number,
  currentKm: number,
  lastServiceKm: number,
  lastServiceDateStr: string | null | Date
): MaintenanceForecast | null => {
  if (!lastServiceDateStr) return null;

  const lastDate = new Date(lastServiceDateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // 1. KM Calculations
  const nextServiceKm = (lastServiceKm || 0) + (intervalKm || 10000);
  const kmParaServicio = nextServiceKm - (currentKm || 0);

  // 2. Date Calculations
  // Avoid division by zero and handle infinity
  const safeAvgDaily = avgDailyKm > 0 ? avgDailyKm : 1;
  const daysByKm = Math.floor((intervalKm || 10000) / safeAvgDaily);
  const serviceByKmDate = addDays(lastDate, daysByKm);
  const serviceByTimeDate = addDays(lastDate, intervalDays || 180);

  // 3. Final Forecast (The limiting factor)
  const forecastDate = serviceByKmDate < serviceByTimeDate ? serviceByKmDate : serviceByTimeDate;

  // 4. Overdue Logic
  const isOverdue = kmParaServicio <= 0 || forecastDate < today;

  // Calculate intensity based on how much it is overdue
  let overdueIntensity = 0;
  if (isOverdue) {
    const diffTime = Math.abs(today.getTime() - forecastDate.getTime());
    const daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const kmOverdue = Math.max(0, (currentKm || 0) - nextServiceKm);
    overdueIntensity = Math.min(1, daysOverdue / 45 + kmOverdue / 2000);
  }

  return {
    intervalDays,
    intervalKm,
    avgDailyKm,
    currentKm,
    lastServiceKm,
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
