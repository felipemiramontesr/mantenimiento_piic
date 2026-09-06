import { FleetUnit } from '../../../types/fleet';
import { ActivityLog } from './types';

/** 🛡️ REGLA DE ORO: Normalización Forense de ID (Archon Resolver). */
export function normalizeId(id: string | number | undefined): string {
  return id
    ? String(id)
        .replace(/^(ASM-|UN-|0+)/gi, '')
        .trim()
        .toLowerCase()
    : '';
}

/** 🏗️ REGISTRO DE IDENTIDAD (Look-up O(1) con Triple Redundancia): mapea
 * tanto el `id` como el `uuid` normalizados de cada unidad a la unidad
 * misma. */
export function buildUnitLookup(units: FleetUnit[]): Map<string, FleetUnit> {
  const unitMap = new Map<string, FleetUnit>();
  units.forEach((u) => {
    const labelKey = normalizeId(u.id);
    const uuidKey = normalizeId(u.uuid);
    if (labelKey) unitMap.set(labelKey, u);
    if (uuidKey) unitMap.set(uuidKey, u);
  });
  return unitMap;
}

/** ⛽ MOTOR DE DETECCIÓN MULTI-VECTOR (Hardened): true si el consumo
 * registrado en `log` excede lo físicamente plausible por cualquiera de
 * los 4 vectores (porcentaje, evidencia observada, capacidad teórica,
 * heurístico sin unidad resuelta). */
export function detectFuelAnomaly(
  log: ActivityLog,
  unit: FleetUnit | undefined,
  observedMax: number
): boolean {
  const theoreticalCap = unit?.fuelTankCapacity || 0;

  const isPercentageAnomaly = log.fuel_level_after !== null && Number(log.fuel_level_after) > 100.1;
  // Si tenemos evidencia de que el tanque se llena con menos (ej: 22.5L), 40L es robo.
  const isObservedAnomaly = observedMax > 0 && Number(log.fuel_after) > observedMax + 0.1;
  // Si excede la capacidad teórica de la base de datos
  const isTheoreticalAnomaly = theoreticalCap > 0 && Number(log.fuel_after) > theoreticalCap;
  // Heurístico: Cualquier cambio sospechoso sin unidad resuelta
  const isSuspicious = !unit && Number(log.fuel_after) > 45;

  return isPercentageAnomaly || isObservedAnomaly || isTheoreticalAnomaly || isSuspicious;
}

/** Limpia prefijos/frases redundantes y aplica el fallback por tipo de
 * evento cuando la descripción queda vacía. */
export function resolveDisplayDescription(log: ActivityLog): string {
  let displayDesc = log.description || '';
  // 🔱 Clean Redundancy
  displayDesc = displayDesc.replace(/^MODIFICACIÓN:\s*/i, '');
  displayDesc = displayDesc.replace(/Modificación de todas las filas es redundante/gi, '');

  if (!displayDesc) {
    if (log.event_type === 'ROUTE_START') return 'Despliegue operativo iniciado.';
    if (log.event_type === 'ROUTE_FINISH') return 'Cierre de misión logístico.';
    return '—';
  }
  return displayDesc;
}
