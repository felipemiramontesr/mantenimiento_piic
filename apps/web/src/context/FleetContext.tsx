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
        const fuelMap: Record<number, string> = {
          10: 'Diésel',
          11: 'Gasolina',
          12: 'Eléctrico',
          219: 'Mezcla (2 Tiempos)',
          220: 'Batería (Li-Ion)',
          221: 'Neumático (Aire)',
          1040: 'Gas LP / Natural',
        };
        const deptMap: Record<number, string> = {
          222: 'Administración',
          223: 'Exploración',
          224: 'Geología',
          225: 'Laboratorio',
          226: 'Mantenimiento Eléctrico',
          227: 'Mantenimiento Planta',
          228: 'Medio Ambiente',
          229: 'Operación Mina',
          230: 'Operación Planta',
          231: 'Planeación',
          232: 'Relaciones Comunitarias',
          233: 'Seguridad Patrimonial',
          234: 'Seguridad Industrial',
        };
        const engineMap: Record<number, string> = {
          1024: 'L4 2.8L Turbo Intercooled',
          1026: 'L4 2.5L DOHC Multipunto',
          1027: 'V8 6.4L HEMI MDS',
          1028: 'L4 2.4L MIVEC Turbo',
          1029: 'L4 2.0L CTI Turbo',
          1030: 'L4 1.4L TSI Turbo',
          1031: 'L4 1.3L Firefly',
          1032: 'L4 1.6L DOHC',
          1033: 'L4 1.5L DOHC',
          1034: 'L6 6.7L Cummins Turbo',
          1035: 'Electric Dual-Motor',
          1036: 'L4 2.5L Turbo (2KD-FTV)',
        };
        const colorMap: Record<number, string> = {
          1000: 'Blanco',
          1001: 'Negro',
          1002: 'Gris',
          1003: 'Rojo',
          1004: 'Azul',
          1005: 'Verde',
          1006: 'Amarillo',
          1007: 'Naranja',
          1008: 'Café',
          1009: 'Beige',
          1010: 'Plateado',
          1011: 'Dorado',
        };
        const tireBrandMap: Record<number, string> = {
          243: 'MICHELIN',
          244: 'BF GOODRICH',
          264: 'ZMAX',
          265: 'PIRELLI',
          266: 'BRIDGESTONE',
          267: 'YOKOHAMA',
          268: 'GOODYEAR',
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
            placas: getVal('placas', 'placas') as string,
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
            fuelType: normalizedUnit.fuelType || fuelMap[normalizedUnit.fuelTypeId!] || 'S/D',
            departamento:
              normalizedUnit.departamento || deptMap[normalizedUnit.departmentId!] || 'General',
            motor: normalizedUnit.motor || engineMap[normalizedUnit.engineTypeId!] || 'S/D',
            color: normalizedUnit.color || colorMap[normalizedUnit.colorId!] || 'S/D',
            tireBrand:
              normalizedUnit.tireBrand || tireBrandMap[normalizedUnit.tireBrandId!] || 'S/D',

            // 🔱 Forensic Image Parser (Base64 & Path Support)
            images: ((): string[] => {
              const rawImages = getVal('images', 'images');
              if (!rawImages) return ['/img/archon-blueprint.png'];
              if (Array.isArray(rawImages)) return rawImages as string[];
              try {
                const parsed = JSON.parse(rawImages as string);
                return Array.isArray(parsed) && parsed.length > 0
                  ? (parsed as string[])
                  : ['/img/archon-blueprint.png'];
              } catch (e) {
                // If it's not JSON, it might be a single string path or base64
                if (typeof rawImages === 'string' && rawImages.length > 0) {
                  return [rawImages];
                }
                return ['/img/archon-blueprint.png'];
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
