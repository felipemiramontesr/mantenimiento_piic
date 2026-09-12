import React, { createContext, useContext, ReactNode } from 'react';
import usePermissions from '../hooks/usePermissions';
import useArchonDoctorTelemetry, { ArchonDoctorTelemetry } from '../hooks/useArchonDoctorTelemetry';

/**
 * FC171 F1 — ArchonDoctor_Relocation_To_SovereignConsole.
 * Monta `useArchonDoctorTelemetry` UNA sola vez, gateado a `isOmegaStrict()`
 * (Cond.R-Doctor D2) — la captura de errores en background sigue activa en
 * cualquier página del dashboard mientras el actor sea Ω, aunque el panel
 * forense (UI) ya no vive en el footer global sino solo dentro de la
 * Consola Soberana (`/dashboard/system-settings`), que lo consume vía
 * `useArchonDoctorContext()`.
 */
const ArchonDoctorContext = createContext<ArchonDoctorTelemetry | undefined>(undefined);

/** Monta el hook de telemetría gateado una sola vez y lo expone a los descendientes. */
export const ArchonDoctorProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isOmegaStrict } = usePermissions();
  const telemetry = useArchonDoctorTelemetry(isOmegaStrict());
  return <ArchonDoctorContext.Provider value={telemetry}>{children}</ArchonDoctorContext.Provider>;
};

/** Consume la telemetría de `ArchonDoctorProvider`; lanza si se usa fuera del Provider. */
export function useArchonDoctorContext(): ArchonDoctorTelemetry {
  const ctx = useContext(ArchonDoctorContext);
  if (!ctx) {
    throw new Error('useArchonDoctorContext must be used within ArchonDoctorProvider');
  }
  return ctx;
}
