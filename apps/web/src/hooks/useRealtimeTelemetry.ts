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

    // Ambos refs se asignan de forma síncrona arriba, en este mismo cuerpo de
    // efecto, antes de que React pueda invocar este cleanup (unmount o
    // re-ejecución por cambio de deps) — el guard `if (ref.current)` era, por
    // construcción, incapaz de ver `null` aquí (FC165 F3 Slice3.2 Batch1,
    // purga de guard inalcanzable).
    return (): void => {
      clearInterval(pollRef.current as ReturnType<typeof setInterval>);
      clearInterval(heartbeatRef.current as ReturnType<typeof setInterval>);
    };
  }, [fetchUnits, sendHeartbeat]);

  return { units, isLoading, error, lastRefresh };
}
