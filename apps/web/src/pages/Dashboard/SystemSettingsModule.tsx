import React, { useEffect } from 'react';
import { Globe, ShieldCheck } from 'lucide-react';
import { useSovereignLayout } from '../../context/SovereignLayoutContext';
import usePermissions from '../../hooks/usePermissions';
import ArchonDoctor from '../../ArchonDoctor';

/**
 * FC170 F1 — System_Settings_Modular_Chassis_And_Sidebar_Integration.
 * Chasis Plug-and-Play para `/dashboard/system-settings`: tarjeta Universo
 * FMS (gate: mismo permiso que ve Fleet — Cond.R-170 R3) + Consola Soberana
 * GrayMan (gate: `isOmegaStrict()` — Cond.R-170 R2). F1 es display-only, sin
 * formularios de mutación (Cond.R-170 R6) — las tarjetas listan las áreas de
 * capacidad como scaffolding extensible para fases futuras.
 */

function useSystemSettingsSectionHeader(): void {
  const { setSectionData } = useSovereignLayout();
  useEffect(() => {
    setSectionData(
      'Configuración del Sistema',
      'Universo FMS y Capacidades Soberanas de Plataforma'
    );
  }, [setSectionData]);
}

const FMS_CAPABILITY_AREAS = [
  'Umbrales de mantenimiento preventivo',
  'Parámetros de alertas de flota',
  'Configuración de rutas y checkpoints',
];

/** Tarjeta Universo FMS — visible con el mismo gate de permiso que el nav-item Unidades. */
function FmsUniverseCard(): React.ReactElement {
  return (
    <div className="card-archon-sovereign space-y-4" data-testid="system-settings-fms-card">
      <div className="flex items-center gap-3 pb-2 border-b border-slate-200">
        <div className="w-8 h-8 rounded-[4px] bg-pinnacle-navy/10 flex items-center justify-center">
          <Globe size={16} className="text-pinnacle-navy" />
        </div>
        <div>
          <h2 className="text-archon-lg font-black text-pinnacle-navy uppercase tracking-widest">
            Universo FMS
          </h2>
          <p className="text-archon-base text-pinnacle-navy/50 font-medium">
            Umbrales y parámetros de operación vehicular
          </p>
        </div>
      </div>
      <ul className="space-y-2 text-archon-base text-pinnacle-navy/70">
        {FMS_CAPABILITY_AREAS.map((area) => (
          <li key={area} className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-pinnacle-yellow shrink-0" />
            {area}
          </li>
        ))}
      </ul>
      <p className="text-[11px] uppercase tracking-widest font-bold text-pinnacle-navy/30">
        Próximamente — fase de configuración editable
      </p>
    </div>
  );
}

/** Tarjeta Consola Soberana — visible SOLO si `isOmegaStrict()` (Cond.R-170 R2). */
function SovereignConsoleCard(): React.ReactElement {
  return (
    <div className="card-archon-sovereign space-y-4" data-testid="system-settings-sovereign-card">
      <div className="flex items-center gap-3 pb-2 border-b border-slate-200">
        <div className="w-8 h-8 rounded-[4px] bg-pinnacle-navy/10 flex items-center justify-center">
          <ShieldCheck size={16} className="text-pinnacle-navy" />
        </div>
        <div>
          <h2 className="text-archon-lg font-black text-pinnacle-navy uppercase tracking-widest">
            Consola Soberana GrayMan
          </h2>
          <p className="text-archon-base text-pinnacle-navy/50 font-medium">
            Panel de capacidades avanzadas de plataforma
          </p>
        </div>
      </div>
      <p className="text-archon-base text-pinnacle-navy/70">
        Exclusivo de Ω (role_id = 0) — gobernanza de plataforma, cosmología y auditoría de
        protocolo, extensible en fases futuras del Chasis Modular.
      </p>
      <div
        className="pt-2 border-t border-slate-100"
        data-testid="sovereign-console-doctor-trigger"
      >
        <p className="text-[11px] uppercase tracking-widest font-bold text-pinnacle-navy/40 mb-2">
          Consola Forense Archon Doctor
        </p>
        <ArchonDoctor />
      </div>
    </div>
  );
}

/** FC170 F1 — root page for `/dashboard/system-settings`. */
const SystemSettingsModule: React.FC = (): React.ReactElement => {
  const { isOmegaStrict, hasAnyPermission } = usePermissions();
  useSystemSettingsSectionHeader();

  const canSeeFms = hasAnyPermission(['fleet:unit:view:any', 'fleet:unit:view:own']);
  const omega = isOmegaStrict();

  if (!canSeeFms && !omega) {
    return (
      <div className="animate-in fade-in duration-700">
        <div className="card-archon-sovereign text-center py-12 text-pinnacle-navy/40 text-sm font-medium">
          Sin acceso — sin capacidades de configuración disponibles para tu rol.
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-700">
      <section className="archon-workspace-chassis">
        <div className="archon-axial-container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {canSeeFms && <FmsUniverseCard />}
            {omega && <SovereignConsoleCard />}
          </div>
        </div>
      </section>
    </div>
  );
};

export default SystemSettingsModule;
