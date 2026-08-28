import { FleetUnit } from '../../../types/fleet';
import { RouteLog } from './types';

/** Litros consumidos en la ruta, a partir de niveles de tanque y carga (FC163 F2B4 Sub-Batch 4B-2). */
export function computeConsumedLiters(log: RouteLog, unit: FleetUnit | undefined): number | null {
  if (!log.end_time) return null;
  const tankCap = unit?.fuelTankCapacity || 0;
  if (tankCap <= 0) return null;
  const startPct = Number(log.fuel_level_start || 0);
  const endPct = Number(log.fuel_level_end ?? log.fuel_level_start ?? 100);
  const loadedLiters = Number(log.fuel_liters_loaded || 0);

  const startLiters = (startPct / 100) * tankCap;
  const endLiters = (endPct / 100) * tankCap;

  const consumed = startLiters - endLiters + loadedLiters;
  return Math.max(0, consumed);
}

/** Kilómetros recorridos por litro consumido (FC163 F2B4 Sub-Batch 4B-2). */
export function computeKmPerLiter(log: RouteLog, consumedLiters: number | null): number | null {
  if (log.end_km === null || log.end_km === undefined || !consumedLiters || consumedLiters <= 0)
    return null;
  const distance = log.end_km - log.start_km;
  if (distance <= 0) return null;
  return distance / consumedLiters;
}

/** Costo de combustible por kilómetro recorrido (FC163 F2B4 Sub-Batch 4B-2). */
export function computeCostPerKm(log: RouteLog): number | null {
  if (
    log.end_km === null ||
    log.end_km === undefined ||
    log.fuel_amount === null ||
    log.fuel_amount === undefined
  )
    return null;
  const distance = log.end_km - log.start_km;
  if (distance <= 0) return null;
  return log.fuel_amount / distance;
}

export interface RouteLogStatus {
  label: string;
  color: string;
  bg: string;
  border: string;
}

/** Estado visual de la ruta (en ruta/finalizada, con o sin incidencia) (FC163 F2B4 Sub-Batch 4B-2). */
export function getRouteLogStatus(l: RouteLog): RouteLogStatus {
  if (l.incident_count && l.incident_count > 0) {
    return {
      label: l.end_time ? 'FINALIZADA' : 'EN RUTA',
      color: 'text-[#ef4444]',
      bg: 'bg-[#ef444415]',
      border: 'border-[#ef4444]/25',
    };
  }
  if (!l.end_time) {
    return {
      label: 'EN RUTA',
      color: 'text-[#3b82f6]',
      bg: 'bg-[#3b82f615]',
      border: 'border-[#3b82f6]/25',
    };
  }
  return {
    label: 'FINALIZADA',
    color: 'text-[#10b981]',
    bg: 'bg-[#10b98115]',
    border: 'border-[#10b981]/25',
  };
}
