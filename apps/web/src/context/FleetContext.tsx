import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import api from '../api/client';
import { FleetUnit } from '../types/fleet';

interface FleetStats {
  total: number;
  available: number;
  inRoute: number;
  maintenance: number;
  discontinued: number;
  maintenanceIndex: number;
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

    return {
      total,
      available,
      inRoute,
      maintenance,
      discontinued,
      maintenanceIndex,
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
