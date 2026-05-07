import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
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
  // 1. World Class Data Sourcing (DRY Protocol)
  const {
    data: units,
    isSyncing: unitsSyncing,
    refresh: refreshUnits,
  } = useSilkHydration<FleetUnit>({
    key: 'fleet_units',
    endpoint: '/fleet',
  });

  const {
    data: incidents,
    isSyncing: incidentsSyncing,
    refresh: refreshIncidents,
  } = useSilkHydration<{ status: string }>({
    key: 'system_incidents',
    endpoint: '/incidents',
  });

  const [isInitialHydrationComplete, setIsInitialHydrationComplete] = useState(false);

  useEffect(() => {
    if (!unitsSyncing && !incidentsSyncing) {
      setIsInitialHydrationComplete(true);
    }
  }, [unitsSyncing, incidentsSyncing]);

  const loading = !isInitialHydrationComplete;

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
