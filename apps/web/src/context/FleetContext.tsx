import React, { createContext, useContext, useMemo } from 'react';
import api from '../api/client';
import { FleetUnit } from '../types/fleet';
import useSilkHydration from '../hooks/useSilkHydration';

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
  startRoute: (payload: import('../types/route').StartRoutePayload) => Promise<void>;
  finishRoute: (
    uuid: string,
    payload: import('../types/route').FinishRoutePayload
  ) => Promise<void>;
  reportIncident: (
    uuid: string,
    payload: import('../types/route').ReportIncidentPayload
  ) => Promise<void>;
}

export const FleetContext = createContext<FleetContextType | undefined>(undefined);

export const FleetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 🔱 PROTOCOL L: NORMALIZATION LAYER (Sovereign Transformation)
  const transformUnits = useMemo(
    () =>
      (raw: unknown): FleetUnit[] => {
        const data = Array.isArray(raw) ? raw : [];

        // 🔱 ARCHON CATALOG MAPPING (Safety Shield)
        const assetTypeMap: Record<number, string> = {
          1: 'Vehiculo',
          2: 'Maquinaria',
          3: 'Herramienta',
        };
        const fuelTypeMap: Record<number, string> = {
          10: 'Diésel',
          11: 'Gasolina',
          12: 'Eléctrico',
          219: 'Mezcla 2T',
          1040: 'Gas LP',
        };
        const deptMap: Record<number, string> = {
          222: 'Administración',
          223: 'Exploración',
          224: 'Geología',
          225: 'Laboratorio',
          226: 'Mant. Eléctrico',
          227: 'Mant. Planta',
          228: 'Medio Ambiente',
          229: 'Operación Mina',
          230: 'Operación Planta',
        };
        const engineMap: Record<number, string> = {
          1024: 'L4 2.8L Turbo',
          1026: 'L4 2.5L DOHC',
          1027: 'V8 6.4L HEMI',
          1028: 'L4 2.4L MIVEC',
          1029: 'L4 2.0L CTI',
          1030: 'L4 1.4L TSI',
        };

        return data.map((item: unknown) => {
          const unit = item as Record<string, unknown>;
          // 🔱 SOVEREIGN CASE NORMALIZER (Resilience Layer)
          const getVal = (camel: string, snake: string): unknown =>
            unit[camel] !== undefined ? unit[camel] : unit[snake];

          const normalizedUnit: FleetUnit = {
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
            circulationCardNumber: getVal(
              'circulationCardNumber',
              'circulation_card_number'
            ) as string,
            numeroSerie: getVal('numeroSerie', 'numero_serie') as string,
            lastServiceReading: getVal('lastServiceReading', 'last_service_reading') as number,
            lastServiceDate: getVal('lastServiceDate', 'last_service_date') as string,
            nextServiceReading: getVal('nextServiceReading', 'next_service_reading') as number,
            maintIntervalDays: getVal('maintIntervalDays', 'maint_interval_days') as number,
            maintIntervalKm: getVal('maintIntervalKm', 'maint_interval_km') as number,
            dailyUsageAvg: getVal('dailyUsageAvg', 'daily_usage_avg') as number,
            accountingAccount: getVal('accountingAccount', 'accounting_account') as string,
            insurancePolicyNumber: getVal(
              'insurancePolicyNumber',
              'insurance_policy_number'
            ) as string,
            lastEnvironmentalVerification: getVal(
              'lastEnvironmentalVerification',
              'last_environmental_verification'
            ) as string,
            lastMechanicalVerification: getVal(
              'lastMechanicalVerification',
              'last_mechanical_verification'
            ) as string,
            environmentalHologram: getVal(
              'environmentalHologram',
              'environmental_hologram'
            ) as string,
            insuranceExpiryDate: getVal('insuranceExpiryDate', 'insurance_expiry_date') as string,
          };

          return {
            ...normalizedUnit,
            // 🔱 Normalization Tier (Labels)
            assetType:
              normalizedUnit.assetType || assetTypeMap[normalizedUnit.assetTypeId!] || 'S/D',
            fuelType: normalizedUnit.fuelType || fuelTypeMap[normalizedUnit.fuelTypeId!] || 'S/D',
            departamento:
              normalizedUnit.departamento || deptMap[normalizedUnit.departmentId!] || 'General',
            motor: normalizedUnit.motor || engineMap[normalizedUnit.engineTypeId!] || 'S/D',
            tireBrand:
              normalizedUnit.tireBrand ||
              (Number(normalizedUnit.tireBrandId) === 243 ? 'MICHELIN' : 'S/D'),

            // 🔱 Forensic Image Parser
            images: ((): string[] => {
              const rawImages = getVal('images', 'images');
              if (!rawImages) return [];
              if (Array.isArray(rawImages)) return rawImages as string[];
              try {
                const parsed = JSON.parse(rawImages as string);
                return Array.isArray(parsed) ? (parsed as string[]) : [];
              } catch (e) {
                return [];
              }
            })(),
          };
        });
      },
    []
  );

  // 1. World Class Data Sourcing (DRY Protocol)
  const {
    data: units,
    isSyncing: unitsSyncing,
    refresh: refreshUnits,
  } = useSilkHydration<FleetUnit>({
    key: 'fleet_units',
    endpoint: '/fleet',
    transform: transformUnits,
  });

  const { data: incidents, refresh: refreshIncidents } = useSilkHydration<{ status: string }>({
    key: 'system_incidents',
    endpoint: '/incidents',
  });

  const loading = unitsSyncing && !units.length;

  const incidentsCount = useMemo(
    () => incidents.filter((i) => i.status === 'OPEN').length,
    [incidents]
  );

  const stats = useMemo((): FleetStats => {
    const total = units.length;
    const available = units.filter((u: FleetUnit): boolean => {
      const s = (u.status || '').trim();
      return s === 'Disponible' || s === 'Asignada' || s === '';
    }).length;
    const inRoute = units.filter(
      (u: FleetUnit): boolean => (u.status || '').trim() === 'En Ruta'
    ).length;
    const maintenance = units.filter(
      (u: FleetUnit): boolean => (u.status || '').trim() === 'En Mantenimiento'
    ).length;
    const discontinued = units.filter(
      (u: FleetUnit): boolean => (u.status || '').trim() === 'Descontinuada'
    ).length;

    const maintenanceIndex = total > 0 ? Math.round(((available + inRoute) / total) * 100) : 0;
    const openIncidents = incidentsCount;

    // 🛡️ ANALYTICAL AGGREGATION ENGINE (v.22.1.2)
    const computeAverages = (subset: FleetUnit[]): CategorizedMetrics => {
      const count = subset.length;
      const maintenanceCount = subset.filter(
        (u: FleetUnit): boolean => (u.status || '').trim() === 'En Mantenimiento'
      ).length;
      const availableCount = subset.filter((u: FleetUnit): boolean => {
        const s = (u.status || '').trim();
        return s === 'Disponible' || s === 'Asignada' || s === '';
      }).length;
      const availablePercent = count > 0 ? Math.round((availableCount / count) * 100) : 0;

      const validMTBF = subset.filter((u: FleetUnit): boolean => (u.mtbfHours || 0) > 0);
      const validMTTR = subset.filter((u: FleetUnit): boolean => (u.mttrHours || 0) > 0);

      const avgMtbf =
        validMTBF.length > 0
          ? Math.round(
              validMTBF.reduce((acc: number, u: FleetUnit): number => acc + (u.mtbfHours || 0), 0) /
                validMTBF.length
            )
          : 0;

      const avgMttr =
        validMTTR.length > 0
          ? Number(
              (
                validMTTR.reduce(
                  (acc: number, u: FleetUnit): number => acc + (u.mttrHours || 0),
                  0
                ) / validMTTR.length
              ).toFixed(1)
            )
          : 0;

      const backlog = subset.reduce(
        (acc: number, u: FleetUnit): number => acc + (u.backlogCount || 0),
        0
      );

      return { count, availablePercent, maintenanceCount, avgMtbf, avgMttr, backlog };
    };

    const globalMetrics = computeAverages(units);

    // Grouping by Asset Type (v.21.3.1 Relational Architecture - Using Catalog IDs)
    const vehiculos = units.filter((u: FleetUnit): boolean => u.assetTypeId === 1);
    const maquinaria = units.filter((u: FleetUnit): boolean => u.assetTypeId === 2);
    const herramienta = units.filter((u: FleetUnit): boolean => u.assetTypeId === 3);

    return {
      total,
      available,
      inRoute,
      maintenance,
      discontinued,
      totalInactive: discontinued,
      maintenanceIndex,
      openIncidents,
      globalMTBF: globalMetrics.avgMtbf,
      globalMTTR: globalMetrics.avgMttr,
      globalAvailability: globalMetrics.availablePercent,
      categories: {
        vehiculo: computeAverages(vehiculos),
        maquinaria: computeAverages(maquinaria),
        herramienta: computeAverages(herramienta),
      },
    };
  }, [units, incidentsCount]);

  const startRoute = async (payload: import('../types/route').StartRoutePayload): Promise<void> => {
    await api.post('/routes/start', payload);
    await refreshUnits(); // Automatic sync of unit status to "En Ruta"
  };

  const finishRoute = async (
    uuid: string,
    payload: import('../types/route').FinishRoutePayload
  ): Promise<void> => {
    await api.patch(`/routes/${uuid}/finish`, payload);
    await refreshUnits(); // Automatic sync of unit status to "Disponible" and new reading
  };

  const reportIncident = async (
    uuid: string,
    payload: import('../types/route').ReportIncidentPayload
  ): Promise<void> => {
    await api.post(`/routes/${uuid}/incidents`, payload);
    await refreshIncidents();
  };

  return (
    <FleetContext.Provider
      value={{ units, stats, loading, refreshUnits, startRoute, finishRoute, reportIncident }}
    >
      {children}
    </FleetContext.Provider>
  );
};

export const useFleet = (): FleetContextType => {
  const context = useContext(FleetContext);
  if (context === undefined) {
    throw new Error('useFleet must be used within a FleetProvider');
  }
  return context;
};
