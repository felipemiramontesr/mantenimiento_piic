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

interface ResolvedForecastInputs {
  defaultIntervalDays: number;
  defaultIntervalKm: number;
  defaultAvgDailyKm: number;
  safeCurrentKm: number;
  safeLastServiceKm: number;
  today: Date;
  lastDate: Date;
}

/** Normaliza intervalos/kilometraje/fecha con sus defaults de paridad estándar (FC165 F2B2.1, split). */
function resolveForecastInputs(
  intervalDays: number | null | undefined,
  intervalKm: number | null | undefined,
  avgDailyKm: number | null | undefined,
  currentKm: number | null | undefined,
  lastServiceKm: number | null | undefined,
  lastServiceDateStr: string | null | Date | undefined
): ResolvedForecastInputs {
  const defaultIntervalDays =
    intervalDays !== null && intervalDays !== undefined ? Number(intervalDays) : 180;
  const defaultIntervalKm =
    intervalKm !== null && intervalKm !== undefined ? Number(intervalKm) : 10000;
  const defaultAvgDailyKm =
    avgDailyKm !== null && avgDailyKm !== undefined ? Number(avgDailyKm) : 30;
  const safeCurrentKm = Number(currentKm) || 0;
  const safeLastServiceKm = Number(lastServiceKm) || 0;

  // If no date is provided, we assume the unit is due based on today - standard interval
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const lastDate = lastServiceDateStr
    ? new Date(lastServiceDateStr)
    : addDays(today, -defaultIntervalDays);

  return {
    defaultIntervalDays,
    defaultIntervalKm,
    defaultAvgDailyKm,
    safeCurrentKm,
    safeLastServiceKm,
    today,
    lastDate,
  };
}

/** Intensidad de retraso (0-1) para alertas visuales cuando la unidad está vencida (FC165 F2B2.1, split). */
function computeOverdueIntensity(
  isOverdue: boolean,
  today: Date,
  forecastDate: Date,
  safeCurrentKm: number,
  nextServiceKm: number
): number {
  if (!isOverdue) return 0;
  const diffTime = Math.abs(today.getTime() - forecastDate.getTime());
  const daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const kmOverdue = Math.max(0, safeCurrentKm - nextServiceKm);
  return Math.min(1, daysOverdue / 45 + kmOverdue / 2000);
}

interface ForecastCore {
  nextServiceKm: number;
  kmParaServicio: number;
  serviceByKmDate: Date;
  serviceByTimeDate: Date;
  forecastDate: Date;
  isOverdue: boolean;
}

/** Cálculo KM/fecha del pronóstico + lógica de vencido (FC165 F2B2.1, split). */
function computeForecastCore(inputs: ResolvedForecastInputs): ForecastCore {
  const {
    defaultIntervalKm,
    defaultAvgDailyKm,
    defaultIntervalDays,
    safeCurrentKm,
    safeLastServiceKm,
    today,
    lastDate,
  } = inputs;

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

  return {
    nextServiceKm,
    kmParaServicio,
    serviceByKmDate,
    serviceByTimeDate,
    forecastDate,
    isOverdue,
  };
}

/** Combina inputs resueltos + núcleo de pronóstico en el `MaintenanceForecast` final, con guardas anti-NaN (FC165 F2B2.1, split). */
function assembleForecast(inputs: ResolvedForecastInputs, core: ForecastCore): MaintenanceForecast {
  const overdueIntensity = computeOverdueIntensity(
    core.isOverdue,
    inputs.today,
    core.forecastDate,
    inputs.safeCurrentKm,
    core.nextServiceKm
  );
  return {
    intervalDays: inputs.defaultIntervalDays,
    intervalKm: inputs.defaultIntervalKm,
    avgDailyKm: inputs.defaultAvgDailyKm,
    currentKm: inputs.safeCurrentKm,
    lastServiceKm: inputs.safeLastServiceKm,
    lastServiceDate: inputs.lastDate,
    nextServiceKm: Number.isNaN(core.nextServiceKm) ? 0 : core.nextServiceKm,
    serviceByKmDate: core.serviceByKmDate,
    kmParaServicio: Number.isNaN(core.kmParaServicio) ? 0 : core.kmParaServicio,
    serviceByTimeDate: core.serviceByTimeDate,
    forecastDate: core.forecastDate,
    isOverdue: core.isOverdue,
    overdueIntensity,
  };
}

/** Pronóstico de mantenimiento (KM/fecha, vencido, intensidad) para una unidad (FC165 F2B2.1, JSDoc). */
export const calculateMaintForecast = (
  intervalDays: number | null | undefined,
  intervalKm: number | null | undefined,
  avgDailyKm: number | null | undefined,
  currentKm: number | null | undefined,
  lastServiceKm: number | null | undefined,
  lastServiceDateStr: string | null | Date | undefined
): MaintenanceForecast => {
  const resolvedInputs = resolveForecastInputs(
    intervalDays,
    intervalKm,
    avgDailyKm,
    currentKm,
    lastServiceKm,
    lastServiceDateStr
  );
  const core = computeForecastCore(resolvedInputs);
  return assembleForecast(resolvedInputs, core);
};

export const formatDate = (date: Date | null | undefined): string => {
  if (!date || Number.isNaN(date.getTime())) return '---';
  return date.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};
