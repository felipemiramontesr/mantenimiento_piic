import React, { createContext, useContext, useEffect, useMemo, useCallback } from 'react';
import api from '../api/client';
import { FleetUnit } from '../types/fleet';
import useSilkHydration from '../hooks/useSilkHydration';
import usePermissions from '../hooks/usePermissions';

import { ASSET_TYPE_MAP, FUEL_TYPE_MAP, DEPT_MAP, ENGINE_MAP } from '../constants/fleetConstants';

interface CategorizedMetrics {
  count: number;
  availablePercent: number;
  maintenanceCount: number;
  avgMtbf: number;
  avgMttr: number;
  backlog: number;
}

interface FleetStats {
  total: number;
  available: number;
  inRoute: number;
  maintenance: number;
  discontinued: number;
  totalInactive: number;
  maintenanceIndex: number;
  openIncidents: number;
  // 🔱 Analytical Tier (v.22.1.2)
  globalMTBF: number;
  globalMTTR: number;
  globalAvailability: number;
  categories: {
    vehiculo: CategorizedMetrics;
    maquinaria: CategorizedMetrics;
    herramienta: CategorizedMetrics;
  };
}

interface FleetContextType {
  units: FleetUnit[];
  stats: FleetStats;
  loading: boolean;
  refreshUnits: () => Promise<void>;
  error: Error | null;
  startRoute: (payload: import('../types/route').StartRoutePayload) => Promise<void>;
  finishRoute: (
    uuid: string,
    payload: import('../types/route').FinishRoutePayload
  ) => Promise<void>;
  reportIncident: (
    uuid: string,
    payload: import('../types/route').ReportIncidentPayload
  ) => Promise<void>;
  getUnitDetails: (id: string) => Promise<FleetUnit | null>;
}

/** Extrae el array de unidades de una respuesta ya sea directa (array) o
 * envuelta en `{ data: [...] }` (FC166 Track D S6606/no-nested-ternary). */
function extractUnitsArray(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object' && Array.isArray((raw as { data?: unknown }).data)) {
    return (raw as { data: unknown[] }).data;
  }
  return [];
}

export const FleetContext = createContext<FleetContextType | undefined>(undefined);

// ─── transformUnits (S6606/no-nested-ternary + Gate 2 max-lines-per-function) ──
// Todo el motor de normalización se mueve a funciones de módulo puras (no
// cierran sobre nada del componente) — reemplaza el
// `useMemo(() => (raw) => data.map(...), [])` anterior: una función de
// módulo pura ya es siempre-estable, no necesita memoización. Mismo
// comportamiento verbatim en cada pieza, solo el sitio cambió.

/** `getVal` de `transformUnits` (camelCase con fallback a snake_case) —
 * ahora recibe `unit` explícitamente en vez de vivir en un closure. */
function getUnitFieldValue(unit: Record<string, unknown>, camel: string, snake: string): unknown {
  return unit[camel] !== undefined ? unit[camel] : unit[snake];
}

/** `getVal` + `Number(...)` con fallback a 0 — extraída de
 * `normalizeFleetUnitFields` para respetar el cap de 50 líneas de Gate 2
 * (FC166 Track D); mismo comportamiento verbatim (0 si el campo es
 * null/undefined en ambas variantes camel/snake). */
function getUnitNumericFieldOrZero(
  unit: Record<string, unknown>,
  camel: string,
  snake: string
): number {
  const raw = getUnitFieldValue(unit, camel, snake);
  return raw != null ? Number(raw) : 0;
}

/** Normaliza los ~20 campos camelCase/snake_case de una unidad cruda. */
function normalizeFleetUnitFields(unit: Record<string, unknown>): FleetUnit {
  const getVal = (camel: string, snake: string): unknown => getUnitFieldValue(unit, camel, snake);
  const getNum = (camel: string, snake: string): number =>
    getUnitNumericFieldOrZero(unit, camel, snake);
  return {
    ...(unit as unknown as FleetUnit),
    assetTypeId: getVal('assetTypeId', 'asset_type_id') as number,
    departmentId: getVal('departmentId', 'department_id') as number,
    fuelTypeId: getVal('fuelTypeId', 'fuel_type_id') as number,
    engineTypeId: getVal('engineTypeId', 'engine_type_id') as number,
    colorId: getVal('colorId', 'color_id') as number,
    traccionId: getVal('traccionId', 'traccion_id') as number,
    transmisionId: getVal('transmisionId', 'transmision_id') as number,
    tireBrandId: getVal('tireBrandId', 'tire_brand_id') as number,
    tireSpec: getVal('tireSpec', 'tire_spec') as string,
    tireBrand: getVal('tireBrand', 'tire_brand') as string,
    circulationCardNumber: getVal('circulationCardNumber', 'circulation_card_number') as string,
    numeroSerie: getVal('numeroSerie', 'numero_serie') as string,
    lastServiceReading: getVal('lastServiceReading', 'last_service_reading') as number,
    lastServiceDate: getVal('lastServiceDate', 'last_service_date') as string,
    nextServiceReading: getVal('nextServiceReading', 'next_service_reading') as number,
    nextServiceKmTarget: getVal('nextServiceKmTarget', 'next_service_km_target') as number,
    maintIntervalDays: getVal('maintIntervalDays', 'maint_interval_days') as number,
    maintIntervalKm: getVal('maintIntervalKm', 'maint_interval_km') as number,
    dailyUsageAvg: getVal('dailyUsageAvg', 'daily_usage_avg') as number,
    accountingAccount: getVal('accountingAccount', 'accounting_account') as string,
    insurancePolicyNumber: getVal('insurancePolicyNumber', 'insurance_policy_number') as string,
    lastEnvironmentalVerification: getVal(
      'lastEnvironmentalVerification',
      'last_environmental_verification'
    ) as string,
    lastMechanicalVerification: getVal(
      'lastMechanicalVerification',
      'last_mechanical_verification'
    ) as string,
    environmentalHologram: getVal('environmentalHologram', 'environmental_hologram') as string,
    insuranceExpiryDate: getVal('insuranceExpiryDate', 'insurance_expiry_date') as string,
    capacidadCarga: getNum('capacidadCarga', 'capacidad_carga'),
    fuelTankCapacity: getNum('fuelTankCapacity', 'fuel_tank_capacity'),
    // 🔱 FC165 F2B2.1 dead-branch purge (246_AN/247_AN): el segundo getVal de
    // cada campo comparaba 'initialFuelLevel' contra si mismo (mismo par
    // camel/camel) -- si el primer getVal(camel,snake) ya falla (camel
    // undefined confirmado), el segundo NUNCA puede resolver distinto, es
    // matemáticamente inalcanzable.
    initialFuelLevel: getNum('initialFuelLevel', 'initial_fuel_level'),
    lastFuelLevel: getNum('lastFuelLevel', 'last_fuel_level'),
  };
}

/** Parsea el campo `images` (ya sea array o JSON string codificado). */
function parseFleetUnitImages(rawImages: unknown): string[] {
  if (!rawImages) return [];
  if (Array.isArray(rawImages)) return rawImages as string[];
  try {
    const parsed = JSON.parse(rawImages as string);
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

/** Deriva las labels normalizadas (assetType/fuelType/etc.) + parsea las
 * imágenes de una unidad ya normalizada. */
function finalizeFleetUnit(rawUnit: Record<string, unknown>): FleetUnit {
  const normalizedUnit = normalizeFleetUnitFields(rawUnit);
  const rawImages = getUnitFieldValue(rawUnit, 'images', 'images');

  return {
    ...normalizedUnit,
    // 🔱 Normalization Tier (Labels)
    assetType: normalizedUnit.assetType || ASSET_TYPE_MAP[normalizedUnit.assetTypeId!] || 'S/D',
    fuelType: normalizedUnit.fuelType || FUEL_TYPE_MAP[normalizedUnit.fuelTypeId!] || 'S/D',
    departamento:
      normalizedUnit.departamento || DEPT_MAP[normalizedUnit.departmentId!] || 'General',
    motor: normalizedUnit.motor || ENGINE_MAP[normalizedUnit.engineTypeId!] || 'S/D',
    tireBrand:
      normalizedUnit.tireBrand || (Number(normalizedUnit.tireBrandId) === 243 ? 'MICHELIN' : 'S/D'),
    status: String(normalizedUnit.status || 'Disponible') as FleetUnit['status'],
    placas: String(normalizedUnit.placas || 'S/P'),
    // 🔱 Forensic Image Parser
    images: parseFleetUnitImages(rawImages),
  };
}

/** 🔱 PROTOCOL L: NORMALIZATION LAYER (Sovereign Transformation) — transform
 * completo para `useSilkHydration('/fleet')`; función de módulo pura y
 * siempre-estable, ya no necesita `useMemo`. */
function transformFleetUnits(raw: unknown): FleetUnit[] {
  // 🔱 SOVEREIGN DATA EXTRACTION (Resilience Tier)
  const data = extractUnitsArray(raw);
  return data.map((item) => finalizeFleetUnit(item as Record<string, unknown>));
}

// ─── stats (Gate 2 max-lines-per-function) ─────────────────────────────────
// 🔱 ARCHITECTURAL REFACTOR: Defensive Aggregation Engine (v.23.0.0) — el
// cuerpo del `useMemo` se mueve a funciones de módulo puras; mismo
// comportamiento verbatim en cada pieza.

const EMPTY_CATEGORY_METRICS: CategorizedMetrics = {
  count: 0,
  availablePercent: 0,
  maintenanceCount: 0,
  avgMtbf: 0,
  avgMttr: 0,
  backlog: 0,
};

/** 🛡️ Safe-Baseline (Zero-Noise) para `stats`. */
function buildInitialFleetStats(incidentsCount: number): FleetStats {
  return {
    total: 0,
    available: 0,
    inRoute: 0,
    maintenance: 0,
    discontinued: 0,
    totalInactive: 0,
    maintenanceIndex: 0,
    openIncidents: incidentsCount,
    globalMTBF: 0,
    globalMTTR: 0,
    globalAvailability: 0,
    categories: {
      vehiculo: { ...EMPTY_CATEGORY_METRICS },
      maquinaria: { ...EMPTY_CATEGORY_METRICS },
      herramienta: { ...EMPTY_CATEGORY_METRICS },
    },
  };
}

/** Promedios de un subconjunto de unidades (MTBF/MTTR/backlog/disponibilidad). */
function computeFleetCategoryAverages(subset: FleetUnit[]): CategorizedMetrics {
  const count = subset.length;
  if (count === 0) return { ...EMPTY_CATEGORY_METRICS };

  // FC165 F2 Boundary Sanitization Pattern (Bravo 249_AN): `status` llega ya
  // saneado por transformUnits (`String(x || 'Disponible')`) y
  // `FleetUnit.status` es no-opcional en el tipo -- `u?.` y el fallback
  // `|| ''` eran redundantes.
  const maintenanceCount = subset.filter((u) =>
    ['Mantenimiento', 'En Mantenimiento'].includes(u.status.trim())
  ).length;

  const availableCount = subset.filter((u) => {
    const s = u.status.trim();
    return s === 'Disponible' || s === 'Asignada' || s === '';
  }).length;

  const availablePercent = Math.round((availableCount / count) * 100);

  const validMTBF = subset.filter((u) => (Number(u?.mtbfHours) || 0) > 0);
  const validMTTR = subset.filter((u) => (Number(u?.mttrHours) || 0) > 0);

  // Dead-Branch Purge: dentro de este reduce, `u` viene ya filtrado por
  // `validMTBF`/`validMTTR` arriba -- `Number(u.mtbfHours) > 0` (resp.
  // mttrHours) ya esta garantizado por esa misma funcion, el fallback `|| 0`
  // era inalcanzable.
  const avgMtbf =
    validMTBF.length > 0
      ? Math.round(validMTBF.reduce((acc, u) => acc + Number(u.mtbfHours), 0) / validMTBF.length)
      : 0;

  const avgMttr =
    validMTTR.length > 0
      ? Number(
          (validMTTR.reduce((acc, u) => acc + Number(u.mttrHours), 0) / validMTTR.length).toFixed(1)
        )
      : 0;

  const backlog = subset.reduce((acc, u) => acc + (Number(u?.backlogCount) || 0), 0);

  return { count, availablePercent, maintenanceCount, avgMtbf, avgMttr, backlog };
}

/** Cuerpo completo de `stats` — extraído del `useMemo` por el mismo motivo
 * (Gate 2); mismo comportamiento verbatim (fail-soft a `initialStats` en
 * catch). */
function computeFleetStats(units: FleetUnit[], incidentsCount: number): FleetStats {
  const initialStats = buildInitialFleetStats(incidentsCount);
  if (!Array.isArray(units) || units.length === 0) {
    return initialStats;
  }

  try {
    const total = units.length;
    const globalMetrics = computeFleetCategoryAverages(units);
    const available = units.filter((u) =>
      ['Disponible', 'Asignada', ''].includes(u.status.trim())
    ).length;
    const inRoute = units.filter((u) => u.status.trim() === 'En Ruta').length;
    const maintenance = units.filter((u) =>
      ['Mantenimiento', 'En Mantenimiento'].includes(u.status.trim())
    ).length;
    const discontinued = units.filter((u) => u.status.trim() === 'Descontinuada').length;

    return {
      total,
      available,
      inRoute,
      maintenance,
      discontinued,
      totalInactive: discontinued,
      maintenanceIndex: globalMetrics.availablePercent,
      openIncidents: incidentsCount,
      globalMTBF: globalMetrics.avgMtbf,
      globalMTTR: globalMetrics.avgMttr,
      globalAvailability: globalMetrics.availablePercent,
      categories: {
        vehiculo: computeFleetCategoryAverages(units.filter((u) => Number(u?.assetTypeId) === 1)),
        maquinaria: computeFleetCategoryAverages(units.filter((u) => Number(u?.assetTypeId) === 2)),
        herramienta: computeFleetCategoryAverages(
          units.filter((u) => Number(u?.assetTypeId) === 3)
        ),
      },
    };
  } catch (err) {
    // eslint-disable-next-line no-console -- diagnostico critico intencional
    console.error('🔱 [Archon Stats] Aggregation Failure:', err);
    return initialStats;
  }
}

// ─── Hydration + acciones (Gate 2 max-lines-per-function) ──────────────────

/** Hydration de `/fleet` vía Silk — extraída de `FleetProvider` por el mismo
 * motivo (Gate 2); mismo comportamiento verbatim. */
function useFleetUnitsHydration(): {
  units: FleetUnit[];
  setUnits: React.Dispatch<React.SetStateAction<FleetUnit[]>>;
  unitsSyncing: boolean;
  refreshUnits: () => Promise<void>;
  unitsError: Error | null;
} {
  const unitsOptions = useMemo(
    () => ({
      key: 'fleet_units',
      endpoint: '/fleet',
      transform: transformFleetUnits,
    }),
    []
  );

  const {
    data: units,
    setData: setUnits,
    isSyncing: unitsSyncing,
    refresh: refreshUnits,
    error: unitsError,
  } = useSilkHydration<FleetUnit>(unitsOptions);

  return { units, setUnits, unitsSyncing, refreshUnits, unitsError };
}

/** Hydration de `/incidents` (role-gated) vía Silk — extraída del mismo
 * motivo (Gate 2); mismo comportamiento verbatim. */
function useFleetIncidentsHydration(hasPermission: (slug: string) => boolean): {
  incidentsCount: number;
  refreshIncidents: () => Promise<void>;
} {
  const incidentsOptions = useMemo(
    () => ({
      key: 'system_incidents',
      endpoint: hasPermission('route:view') ? '/incidents' : null,
    }),
    [hasPermission]
  );

  const { data: incidents, refresh: refreshIncidents } = useSilkHydration<{ status: string }>(
    incidentsOptions
  );

  const incidentsCount = useMemo(
    () => (Array.isArray(incidents) ? incidents.filter((i) => i.status === 'OPEN').length : 0),
    [incidents]
  );

  return { incidentsCount, refreshIncidents };
}

/** 🔱 Forensic Bridge Injection (Doctor V4 Support) — extraída del mismo
 * motivo (Gate 2); mismo comportamiento verbatim. */
function useFleetContextBridge(units: FleetUnit[], stats: FleetStats, unitsSyncing: boolean): void {
  useEffect(() => {
    const integrity = {
      total: units.length,
      corrupt: 0, // Placeholder for future logic
      lastValidId: units[0]?.id || 'N/A',
    };

    // eslint-disable-next-line no-underscore-dangle -- bridge de depuración global deliberado (mismo patrón que __ARCHON_FLEET__/ArchonDoctor)
    (window as unknown as Record<string, unknown>).__ARCHON_FLEET_CONTEXT__ = {
      units,
      stats,
      integrity,
      isSyncing: unitsSyncing,
      lastUpdate: new Date().toLocaleTimeString(),
    };
  }, [units, stats, unitsSyncing]);
}

/** `startRoute`/`finishRoute`/`reportIncident` — extraída del mismo motivo
 * (Gate 2); mismo comportamiento verbatim (cada una re-sincroniza el
 * dataset correspondiente tras la escritura). */
function useFleetRouteActions(
  refreshUnits: () => Promise<void>,
  refreshIncidents: () => Promise<void>
): {
  startRoute: (payload: import('../types/route').StartRoutePayload) => Promise<void>;
  finishRoute: (
    uuid: string,
    payload: import('../types/route').FinishRoutePayload
  ) => Promise<void>;
  reportIncident: (
    uuid: string,
    payload: import('../types/route').ReportIncidentPayload
  ) => Promise<void>;
} {
  const startRoute = useCallback(
    async (payload: import('../types/route').StartRoutePayload): Promise<void> => {
      await api.post('/routes/start', payload);
      await refreshUnits(); // Automatic sync of unit status to "En Ruta"
    },
    [refreshUnits]
  );

  const finishRoute = useCallback(
    async (uuid: string, payload: import('../types/route').FinishRoutePayload): Promise<void> => {
      await api.patch(`/routes/${uuid}/finish`, payload);
      await refreshUnits(); // Automatic sync of unit status to "Disponible" and new reading
    },
    [refreshUnits]
  );

  const reportIncident = useCallback(
    async (
      uuid: string,
      payload: import('../types/route').ReportIncidentPayload
    ): Promise<void> => {
      await api.post(`/routes/${uuid}/incidents`, payload);
      await refreshIncidents();
    },
    [refreshIncidents]
  );

  return { startRoute, finishRoute, reportIncident };
}

/**
 * 🔱 Atomic Hydration Engine — extraída del mismo motivo (Gate 2); mismo
 * comportamiento verbatim (fetches full unit data including images on
 * demand).
 */
function useGetUnitDetails(
  setUnits: React.Dispatch<React.SetStateAction<FleetUnit[]>>
): (id: string) => Promise<FleetUnit | null> {
  return useCallback(
    async (id: string): Promise<FleetUnit | null> => {
      try {
        const response = await api.get(`/fleet/${id}`);
        const rawUnit = response.data?.data;
        if (!rawUnit) return null;

        // 🔱 Atomic Data Injection
        // FC165 F2B2.1 dead-branch purge (246_AN/247_AN): transformFleetUnits([x])
        // sobre un `rawUnit` YA verificado truthy (guard arriba) siempre
        // produce exactamente 1 elemento truthy -- el chequeo `if(fullUnit)`
        // y el fallback `|| null` eran inalcanzables (transformed[0] nunca
        // es undefined/falsy en este path, ya confirmado por TypeScript sin
        // noUncheckedIndexedAccess).
        const transformed = transformFleetUnits([rawUnit]);
        const fullUnit = transformed[0];

        setUnits((prev: FleetUnit[]) =>
          prev.map((u: FleetUnit) => (u.id === id ? { ...u, images: fullUnit.images } : u))
        );

        return fullUnit;
      } catch (error) {
        // eslint-disable-next-line no-console -- diagnostico intencional
        console.error(`[Archon FleetContext] Failed to fetch unit details for ${id}:`, error);
        return null;
      }
    },
    [setUnits]
  );
}

/** Orquesta hydration de unidades/incidentes + stats agregados + bridge
 * forense + acciones de ruta + `getUnitDetails` — ver hooks/funciones de
 * módulo arriba para cada pieza. */
export const FleetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { hasPermission } = usePermissions();

  const { units, setUnits, unitsSyncing, refreshUnits, unitsError } = useFleetUnitsHydration();
  const { incidentsCount, refreshIncidents } = useFleetIncidentsHydration(hasPermission);

  const loading = unitsSyncing && !units.length;
  const stats = useMemo(() => computeFleetStats(units, incidentsCount), [units, incidentsCount]);

  useFleetContextBridge(units, stats, unitsSyncing);

  const { startRoute, finishRoute, reportIncident } = useFleetRouteActions(
    refreshUnits,
    refreshIncidents
  );
  const getUnitDetails = useGetUnitDetails(setUnits);

  // FC166 Track D (S6481) — el objeto `value` del Provider se recreaba en
  // cada render; mismo patrón ya usado en Auth/User/SovereignLayoutContext.
  const contextValue = useMemo<FleetContextType>(
    () => ({
      units,
      stats,
      loading,
      refreshUnits,
      error: unitsError,
      startRoute,
      finishRoute,
      reportIncident,
      getUnitDetails,
    }),
    [
      units,
      stats,
      loading,
      refreshUnits,
      unitsError,
      startRoute,
      finishRoute,
      reportIncident,
      getUnitDetails,
    ]
  );

  return <FleetContext.Provider value={contextValue}>{children}</FleetContext.Provider>;
};

export const useFleet = (): FleetContextType => {
  const context = useContext(FleetContext);
  if (context === undefined) {
    throw new Error('useFleet must be used within a FleetProvider');
  }
  return context;
};
