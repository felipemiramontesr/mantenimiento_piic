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

const HEARTBEAT_INTERVAL_MS = 30_000;

export function useRealtimeTelemetry(): UseTelemetryResult {
  const [units, setUnits] = useState<TelemetryUnit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  const sendHeartbeat = useCallback(async () => {
    try {
      await api.get('/telemetry/heartbeat');
    } catch {
      // keepalive — silently ignore failures
    }
  }, []);

  useEffect(() => {
    const pollIntervalMs = Number(import.meta.env.VITE_TELEMETRY_INTERVAL_MS) || 10_000;

    fetchUnits().catch(() => undefined);
    pollRef.current = setInterval(() => fetchUnits().catch(() => undefined), pollIntervalMs);
    heartbeatRef.current = setInterval(
      () => sendHeartbeat().catch(() => undefined),
      HEARTBEAT_INTERVAL_MS
    );

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, [fetchUnits, sendHeartbeat]);

  return { units, isLoading, error, lastRefresh };
}
