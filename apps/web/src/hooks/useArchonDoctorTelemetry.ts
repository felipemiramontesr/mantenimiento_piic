import { useState, useEffect } from 'react';

export interface TelemetryLog {
  id: number;
  msg: string;
  type: 'info' | 'warn' | 'err' | 'data';
  ts: string;
}

// Contador monotónico para claves React genuinamente únicas (S6479 — evita
// usar el índice del array como key, ya que los logs se insertan al frente
// y el índice de cada entrada cambia en cada `addLog`).
let telemetryLogIdCounter = 0;

/** Forma laxa del bridge de depuración expuesto por FleetContext (misma
 * naturaleza intrínsecamente no tipada que cualquier propiedad global de
 * diagnóstico — no hay tipos de lib que la declaren). */
export interface DoctorFleetContext {
  isSyncing?: boolean;
  units?: unknown[];
  integrity?: { corrupt?: number };
  stats?: { total?: number };
}

export interface ArchonDoctorTelemetry {
  logs: TelemetryLog[];
  context: DoctorFleetContext | null;
  addLog: (msg: string, type?: TelemetryLog['type']) => void;
}

/**
 * FC171 F1 — Estado de telemetría (logs/context) + sus 2 efectos (polling del
 * bridge `__ARCHON_FLEET_CONTEXT__` cada 1s + captura global de errores).
 * `enabled` gatea AMBOS efectos (Cond.R-Doctor D2): cuando es `false` (actor
 * no-Ω), 0 listeners/intervalos se registran — retorna estado inactivo sin
 * overhead. Extraído de `ArchonDoctor.tsx` (antes función interna) para que
 * `ArchonDoctorProvider` pueda montarlo UNA sola vez, globalmente, gateado a
 * `isOmegaStrict()` — la UI del panel forense vive solo en la Consola
 * Soberana, pero la captura de errores en background sigue activa en
 * cualquier página mientras el actor sea Ω.
 */
export default function useArchonDoctorTelemetry(enabled: boolean): ArchonDoctorTelemetry {
  const [logs, setLogs] = useState<TelemetryLog[]>([]);
  const [context, setContext] = useState<DoctorFleetContext | null>(null);

  useEffect(() => {
    if (!enabled) return undefined;
    const interval = setInterval((): void => {
      // eslint-disable-next-line no-underscore-dangle -- bridge de depuración global deliberado (mismo patrón que __ARCHON_FLEET__)
      const fleetContext = (window as unknown as Record<string, unknown>).__ARCHON_FLEET_CONTEXT__;
      if (fleetContext) {
        setContext(fleetContext as DoctorFleetContext);
      }
    }, 1000);
    return (): void => clearInterval(interval);
  }, [enabled]);

  const addLog = (msg: string, type: TelemetryLog['type'] = 'info'): void => {
    telemetryLogIdCounter += 1;
    const entry: TelemetryLog = {
      id: telemetryLogIdCounter,
      msg,
      type,
      ts: new Date().toLocaleTimeString(),
    };
    setLogs((prev) => [entry, ...prev].slice(0, 50));
  };

  // Capture global errors for the ERR tab
  useEffect(() => {
    if (!enabled) return undefined;
    const handleError = (event: ErrorEvent): void => {
      addLog(`CRASH: ${event.message}`, 'err');
    };
    window.addEventListener('error', handleError);
    return (): void => window.removeEventListener('error', handleError);
  }, [enabled]);

  return { logs, context, addLog };
}
