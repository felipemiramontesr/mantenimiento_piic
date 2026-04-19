import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import api from '../api/client';
import { FleetUnit } from '../types/fleet';

interface CategorizedMetrics {
  availability: number;
  mtbf: number;
  mttr: number;
  backlog: number;
}

interface FleetStats {
  total: number;
  available: number;
  inRoute: number;
  maintenance: number;
  discontinued: number;
  maintenanceIndex: number;
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
}

const FleetContext = createContext<FleetContextType | undefined>(undefined);

export const FleetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [units, setUnits] = useState<FleetUnit[]>(() => {
    try {
      const cached = localStorage.getItem('archon_fleet_cache');
      // ⚡ AGGRESSIVE HYDRATION: Immediate memory population from cache
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const [loading, setLoading] = useState<boolean>(() => {
    // If we have cache, we don't 'block' with a total loading state
    const cached = localStorage.getItem('archon_fleet_cache');
    return !cached;
  });

  const isMountedRef = React.useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return (): void => {
      isMountedRef.current = false;
    };
  }, []);

  const refreshUnits = async (): Promise<void> => {
    try {
      const response = await api.get('/fleet');
      if (isMountedRef.current && response.data.success) {
        const freshData = response.data.data;
        setUnits(freshData);
        localStorage.setItem('archon_fleet_cache', JSON.stringify(freshData));
      }
    } catch (error) {
      // Noise reduction for Sovereign operations
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  /**
   * Silk Hydration: Background Refresh
   * This happens silently if cache is already present.
   */
  useEffect(() => {
    refreshUnits();
  }, []);

  const stats = useMemo(() => {
    const total = units.length;
    const available = units.filter((u) => u.status === 'Disponible').length;
    const inRoute = units.filter((u) => u.status === 'En Ruta').length;
    const maintenance = units.filter((u) => u.status === 'En Mantenimiento').length;
    const discontinued = units.filter((u) => u.status === 'Descontinuada').length;

    const maintenanceIndex = total > 0 ? Math.round((available / total) * 100) : 0;

    // 🛡️ ANALYTICAL AGGREGATION ENGINE (v.22.1.2)
    const computeAverages = (subset: FleetUnit[]): CategorizedMetrics => {
      const validMTBF = subset.filter((u) => (u.mtbf_hours || 0) > 0);
      const validMTTR = subset.filter((u) => (u.mttr_hours || 0) > 0);
      const validAvail = subset.filter((u) => (u.availability_index || 0) > 0);

      const mtbf =
        validMTBF.length > 0
          ? Math.round(
              validMTBF.reduce((acc, u) => acc + (u.mtbf_hours || 0), 0) / validMTBF.length
            )
          : 0;

      const mttr =
        validMTTR.length > 0
          ? Number(
              (
                validMTTR.reduce((acc, u) => acc + (u.mttr_hours || 0), 0) / validMTTR.length
              ).toFixed(1)
            )
          : 0;

      const availability =
        validAvail.length > 0
          ? Math.round(
              validAvail.reduce((acc, u) => acc + (u.availability_index || 0), 0) /
                validAvail.length
            )
          : 0;

      const backlog = subset.reduce((acc, u) => acc + (u.backlog_count || 0), 0);

      return { mtbf, mttr, availability, backlog };
    };

    const globalMetrics = computeAverages(units);

    // Grouping by Asset Type (v.21.3.1 Relational Architecture)
    const vehiculos = units.filter((u) => u.asset_type === 'Vehiculo');
    const maquinaria = units.filter((u) => u.asset_type === 'Maquinaria');
    const herramienta = units.filter((u) => u.asset_type === 'Herramienta');

    return {
      total,
      available,
      inRoute,
      maintenance,
      discontinued,
      maintenanceIndex,
      globalMTBF: globalMetrics.mtbf,
      globalMTTR: globalMetrics.mttr,
      globalAvailability: globalMetrics.availability,
      categories: {
        vehiculo: computeAverages(vehiculos),
        maquinaria: computeAverages(maquinaria),
        herramienta: computeAverages(herramienta),
      },
    };
  }, [units]);

  return (
    <FleetContext.Provider value={{ units, stats, loading, refreshUnits }}>
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
