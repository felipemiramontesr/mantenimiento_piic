import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../api/client';

export interface TelemetryUnit {
  unitId: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  updatedAt: string;
}

interface UseTelemetryResult {
  units: TelemetryUnit[];
  isLoading: boolean;
  error: string | null;
  lastRefresh: Date | null;
}

const POLL_INTERVAL_MS = 10_000;

export function useRealtimeTelemetry(): UseTelemetryResult {
  const [units, setUnits] = useState<TelemetryUnit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchUnits = useCallback(async () => {
    try {
      const res = await api.get<{ units: TelemetryUnit[] }>('/telemetry/units');
      setUnits(res.data.units);
      setError(null);
      setLastRefresh(new Date());
    } catch {
      setError('Error al obtener posiciones en tiempo real');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUnits().catch(() => undefined);
    intervalRef.current = setInterval(() => {
      fetchUnits().catch(() => undefined);
    }, POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchUnits]);

  return { units, isLoading, error, lastRefresh };
}
