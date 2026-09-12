import React, { useEffect, useState } from 'react';
import {
  Globe,
  ShieldCheck,
  Wrench,
  BellRing,
  Navigation,
  Stethoscope,
  ClipboardCheck,
} from 'lucide-react';
import { useSovereignLayout } from '../../context/SovereignLayoutContext';
import usePermissions from '../../hooks/usePermissions';
import ArchonDoctor from '../../ArchonDoctor';
import ArchonAppTile from '../../components/Common/ArchonAppTile';

/**
 * FC170/171/172 — System_Settings_Modular_Chassis_And_Sidebar_Integration.
 * Chasis Plug-and-Play para `/dashboard/system-settings`: tarjeta Universo
 * FMS (gate: mismo permiso que ve Fleet — Cond.R-170 R3) + Consola Soberana
 * GrayMan (gate: `isOmegaStrict()` — Cond.R-170 R2). FC172 F1: las opciones
 * de cada tarjeta se presentan como grid de `ArchonAppTile` (estilo Odoo
 * App-Launcher) en vez de texto plano — scaffolding extensible para fases
 * futuras.
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

const FMS_CAPABILITY_TILES = [
  {
    id: 'preventive-maintenance',
    title: 'Mantenimiento Preventivo',
    description: 'Umbrales y calendarios de servicio de flota',
    icon: Wrench,
  },
  {
    id: 'fleet-alerts',
    title: 'Alertas y Telemetría',
    description: 'Parámetros de notificación operativa',
    icon: BellRing,
  },
  {
    id: 'routes-checkpoints',
    title: 'Rutas y Checkpoints',
    description: 'Configuración de itinerarios y control',
    icon: Navigation,
  },
] as const;

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {FMS_CAPABILITY_TILES.map((tile) => (
          <ArchonAppTile
            key={tile.id}
            id={tile.id}
            title={tile.title}
            description={tile.description}
            icon={tile.icon}
            status="coming_soon"
          />
        ))}
      </div>
    </div>
  );
}

interface SovereignConsoleTilesProps {
  readonly onOpenDoctor: () => void;
}

/** Grid de tiles de la Consola Soberana — extraído para que `SovereignConsoleCard` se mantenga bajo presupuesto (Gate 2). */
function SovereignConsoleTiles({ onOpenDoctor }: SovereignConsoleTilesProps): React.ReactElement {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <ArchonAppTile
        id="archon-doctor-console"
        title="Consola Forense Archon Doctor"
        description="Diagnóstico de red, memoria y errores en vivo"
        icon={Stethoscope}
        status="active"
        onClick={onOpenDoctor}
        dataTestId="sovereign-console-doctor-trigger"
      />
      <ArchonAppTile
        id="cosmology"
        title="Cosmología"
        description="Gobernanza de universos y cúmulos"
        icon={Globe}
        status="coming_soon"
      />
      <ArchonAppTile
        id="protocol-audit"
        title="Auditoría de Protocolo"
        description="Trazabilidad del Protocolo L"
        icon={ClipboardCheck}
        status="coming_soon"
      />
    </div>
  );
}

/** Tarjeta Consola Soberana — visible SOLO si `isOmegaStrict()` (Cond.R-170 R2). */
function SovereignConsoleCard(): React.ReactElement {
  const [isDoctorOpen, setIsDoctorOpen] = useState(false);

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
      <SovereignConsoleTiles onOpenDoctor={(): void => setIsDoctorOpen(true)} />
      <ArchonDoctor isOpen={isDoctorOpen} onClose={(): void => setIsDoctorOpen(false)} />
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
