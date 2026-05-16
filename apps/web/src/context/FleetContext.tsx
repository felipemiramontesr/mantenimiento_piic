/* eslint-disable */
import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import api from '../api/client';
import { FleetUnit } from '../types/fleet';
import useSilkHydration from '../hooks/useSilkHydration';

import {
  ASSET_TYPE_MAP,
  FUEL_TYPE_MAP,
  DEPT_MAP,
  ENGINE_MAP,
} from '../constants/fleetConstants';

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

export const FleetContext = createContext<FleetContextType | undefined>(undefined);

export const FleetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 🔱 PROTOCOL L: NORMALIZATION LAYER (Sovereign Transformation)
  const transformUnits = useMemo(
    () =>
      (raw: unknown): FleetUnit[] => {
        // 🔱 SOVEREIGN DATA EXTRACTION (Resilience Tier)
        const data = Array.isArray(raw) 
          ? raw 
          : (raw && typeof raw === 'object' && Array.isArray((raw as any).data)) 
            ? (raw as any).data 
            : [];

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
            capacidadCarga: getVal('capacidadCarga', 'capacidad_carga') as number,
            fuelTankCapacity: getVal('fuelTankCapacity', 'fuel_tank_capacity') as number,
          };

          return {
            ...normalizedUnit,
            // 🔱 Normalization Tier (Labels)
            assetType:
              normalizedUnit.assetType || ASSET_TYPE_MAP[normalizedUnit.assetTypeId!] || 'S/D',
            fuelType: normalizedUnit.fuelType || FUEL_TYPE_MAP[normalizedUnit.fuelTypeId!] || 'S/D',
            departamento:
              normalizedUnit.departamento || DEPT_MAP[normalizedUnit.departmentId!] || 'General',
            motor: normalizedUnit.motor || ENGINE_MAP[normalizedUnit.engineTypeId!] || 'S/D',
            tireBrand:
              normalizedUnit.tireBrand ||
              (Number(normalizedUnit.tireBrandId) === 243 ? 'MICHELIN' : 'S/D'),
            status: String(normalizedUnit.status || 'Disponible'),
            placas: String(normalizedUnit.placas || 'S/P'),

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
  const unitsOptions = useMemo(() => ({
    key: 'fleet_units',
    endpoint: '/fleet',
    transform: transformUnits,
  }), [transformUnits]);

  const {
    data: units,
    setData: setUnits,
    isSyncing: unitsSyncing,
    refresh: refreshUnits,
    error: unitsError,
  } = useSilkHydration<FleetUnit>(unitsOptions);

  const incidentsOptions = useMemo(() => ({
    key: 'system_incidents',
    endpoint: '/incidents',
  }), []);

  const { 
    data: incidents, 
    refresh: refreshIncidents,
    error: incidentsError,
  } = useSilkHydration<{ status: string }>(incidentsOptions);

  const loading = unitsSyncing && !units.length;

  const incidentsCount = useMemo(
    () => (Array.isArray(incidents) ? incidents.filter((i: any) => i.status === 'OPEN').length : 0),
    [incidents]
  );

  // 🔱 ARCHITECTURAL REFACTOR: Defensive Aggregation Engine (v.23.0.0)
  const stats = useMemo((): FleetStats => {
    // 🛡️ Safe-Baseline (Zero-Noise)
    const initialStats: FleetStats = {
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
        vehiculo: { count: 0, availablePercent: 0, maintenanceCount: 0, avgMtbf: 0, avgMttr: 0, backlog: 0 },
        maquinaria: { count: 0, availablePercent: 0, maintenanceCount: 0, avgMtbf: 0, avgMttr: 0, backlog: 0 },
        herramienta: { count: 0, availablePercent: 0, maintenanceCount: 0, avgMtbf: 0, avgMttr: 0, backlog: 0 },
      },
    };

    if (!Array.isArray(units) || units.length === 0) {
      return initialStats;
    }

    try {
      const total = units.length;
      
      const computeAverages = (subset: FleetUnit[]): CategorizedMetrics => {
        const count = subset.length;
        if (count === 0) return { count: 0, availablePercent: 0, maintenanceCount: 0, avgMtbf: 0, avgMttr: 0, backlog: 0 };

        const maintenanceCount = subset.filter((u) => 
          ['Mantenimiento', 'En Mantenimiento'].includes(String(u?.status || '').trim())
        ).length;
        
        const availableCount = subset.filter((u) => {
          const s = String(u?.status || '').trim();
          return s === 'Disponible' || s === 'Asignada' || s === '';
        }).length;

        const availablePercent = Math.round((availableCount / count) * 100);

        const validMTBF = subset.filter((u) => (Number(u?.mtbfHours) || 0) > 0);
        const validMTTR = subset.filter((u) => (Number(u?.mttrHours) || 0) > 0);

        const avgMtbf = validMTBF.length > 0
          ? Math.round(validMTBF.reduce((acc, u) => acc + (Number(u.mtbfHours) || 0), 0) / validMTBF.length)
          : 0;

        const avgMttr = validMTTR.length > 0
          ? Number((validMTTR.reduce((acc, u) => acc + (Number(u.mttrHours) || 0), 0) / validMTTR.length).toFixed(1))
          : 0;

        const backlog = subset.reduce((acc, u) => acc + (Number(u?.backlogCount) || 0), 0);

        return { count, availablePercent, maintenanceCount, avgMtbf, avgMttr, backlog };
      };

      const globalMetrics = computeAverages(units);
      const available = units.filter(u => ['Disponible', 'Asignada', ''].includes(String(u?.status || '').trim())).length;
      const inRoute = units.filter(u => String(u?.status || '').trim() === 'En Ruta').length;
      const maintenance = units.filter(u => ['Mantenimiento', 'En Mantenimiento'].includes(String(u?.status || '').trim())).length;
      const discontinued = units.filter(u => String(u?.status || '').trim() === 'Descontinuada').length;

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
          vehiculo: computeAverages(units.filter(u => Number(u?.assetTypeId) === 1)),
          maquinaria: computeAverages(units.filter(u => Number(u?.assetTypeId) === 2)),
          herramienta: computeAverages(units.filter(u => Number(u?.assetTypeId) === 3)),
        },
      };
    } catch (err) {
      console.error('🔱 [Archon Stats] Aggregation Failure:', err);
      return initialStats;
    }
  }, [units, incidentsCount]);

  // 🔱 Forensic Bridge Injection (Doctor V4 Support)
  useEffect(() => {
    const integrity = {
      total: units.length,
      corrupt: 0, // Placeholder for future logic
      lastValidId: units[0]?.id || 'N/A',
    };

    (window as any).__ARCHON_FLEET_CONTEXT__ = {
      units,
      stats,
      integrity,
      isSyncing: unitsSyncing,
      lastUpdate: new Date().toLocaleTimeString(),
    };
  }, [units, stats, unitsSyncing]);

  const value = {
    units,
    stats,
    loading,
    error: unitsError,
    refreshUnits,
  };



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

  /**
   * 🔱 Atomic Hydration Engine
   * Fetches full unit data (including images) on demand.
   */
  const getUnitDetails = useCallback(async (id: string): Promise<FleetUnit | null> => {
    try {
      const response = await api.get(`/fleet/${id}`);
      const rawUnit = response.data?.data;
      if (!rawUnit) return null;

      // 🔱 Atomic Data Injection
      const transformed = transformUnits([rawUnit]);
      const fullUnit = transformed[0];

      if (fullUnit) {
        setUnits((prev: FleetUnit[]) => 
          prev.map((u: FleetUnit) => u.id === id ? { ...u, images: fullUnit.images } : u)
        );
      }

      return fullUnit || null;
    } catch (error) {
      console.error(`[Archon FleetContext] Failed to fetch unit details for ${id}:`, error);
      return null;
    }
  }, [transformUnits, setUnits]);

  return (
    <FleetContext.Provider
      value={{ units, stats, loading, refreshUnits, error: unitsError, startRoute, finishRoute, reportIncident, getUnitDetails }}
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
