import React, { useEffect } from 'react';
import { useNavigate } from 'react-router';
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
import ArchonAppTile from '../../components/Common/ArchonAppTile';

/**
 * FC170/171/172/173/174 — System_Settings_Modular_Chassis_And_Sidebar_Integration.
 * Chasis Plug-and-Play para `/dashboard/system-settings`. FC172 F1: las
 * opciones se presentan como grid de `ArchonAppTile` (estilo Odoo
 * App-Launcher). FC173 F1: el tile activo de Consola Forense navega a su
 * propia página en vez de abrir un panel flotante. FC174 F1: exclusión mutua
 * ESTRICTA (XOR) — GrayMan (`isOmegaStrict()`) ve ÚNICAMENTE
 * `SovereignConsoleSection`; un tenant (permiso de flota) ve ÚNICAMENTE
 * `TenantUniverseSection` (hoy "Universo FMS", scaffolding para el
 * `universeType` real cuando existan más tipos de universo). El tile de
 * Cosmología pasa a `active`, navegando a `/dashboard/cosmology` (FC161,
 * ya existente).
 */

/** FC174: la descripción del header refleja SOLO la sección que el actor
 *  realmente ve (exclusión mutua), no ambas a la vez. */
function useSystemSettingsSectionHeader(omega: boolean): void {
  const { setSectionData } = useSovereignLayout();
  useEffect(() => {
    setSectionData(
      'Configuración del Sistema',
      omega ? 'Capacidades Soberanas de Plataforma' : 'Umbrales y Parámetros del Universo FMS'
    );
  }, [setSectionData, omega]);
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

/** Sección Universo Tenant — hoy siempre "Universo FMS" (scaffolding para
 *  `universeType` real cuando existan más tipos de universo). FC174: única
 *  sección visible para un tenant, exclusiva de la Consola Soberana. */
function TenantUniverseSection(): React.ReactElement {
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
  readonly onOpenForensics: () => void;
  readonly onOpenCosmology: () => void;
}

/** Grid de tiles de la Consola Soberana — extraído para que `SovereignConsoleSection` se mantenga bajo presupuesto (Gate 2). */
function SovereignConsoleTiles({
  onOpenForensics,
  onOpenCosmology,
}: SovereignConsoleTilesProps): React.ReactElement {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <ArchonAppTile
        id="archon-doctor-console"
        title="Consola Forense Archon Doctor"
        description="Diagnóstico de red, memoria y errores en vivo"
        icon={Stethoscope}
        status="active"
        onClick={onOpenForensics}
        dataTestId="sovereign-console-doctor-trigger"
      />
      <ArchonAppTile
        id="cosmology"
        title="Cosmología & Multiverso"
        description="Creación y gobernanza de universos y cúmulos"
        icon={Globe}
        status="active"
        onClick={onOpenCosmology}
        dataTestId="sovereign-console-cosmology-trigger"
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

/** Sección Consola Soberana — FC174: única sección visible para GrayMan
 *  (`isOmegaStrict()`), exclusiva de cualquier sección de universo tenant. */
function SovereignConsoleSection(): React.ReactElement {
  const navigate = useNavigate();

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
      <SovereignConsoleTiles
        onOpenForensics={(): void => {
          navigate('/dashboard/system-settings/forensics');
        }}
        onOpenCosmology={(): void => {
          navigate('/dashboard/cosmology');
        }}
      />
    </div>
  );
}

/** FC174 F1 — root page for `/dashboard/system-settings`, exclusión mutua
 *  estricta: Ω ve SOLO la Consola Soberana; un tenant con permiso de flota
 *  ve SOLO su sección de Universo; sin ninguno de los dos, fallback. */
const SystemSettingsModule: React.FC = (): React.ReactElement => {
  const { isOmegaStrict, hasAnyPermission } = usePermissions();
  const canSeeFms = hasAnyPermission(['fleet:unit:view:any', 'fleet:unit:view:own']);
  const omega = isOmegaStrict();
  useSystemSettingsSectionHeader(omega);

  if (!omega && !canSeeFms) {
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
          {omega ? <SovereignConsoleSection /> : <TenantUniverseSection />}
        </div>
      </section>
    </div>
  );
};

export default SystemSettingsModule;
