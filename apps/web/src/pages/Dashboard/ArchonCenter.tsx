import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  ArrowRight,
  Gauge,
  ShieldCheck,
  Navigation,
  ShieldAlert,
  Sparkles,
  Users,
} from 'lucide-react';
import { useFleet } from '../../context/FleetContext';
import { useUsers } from '../../context/UserContext';
import usePermissions from '../../hooks/usePermissions';
import { useSovereignLayout } from '../../context/SovereignLayoutContext';
import AccessControlSlideOver from '../../components/Identity/AccessControlSlideOver';
import CategoryAnalyticsCard from '../../components/Dashboard/CategoryAnalyticsCard';

interface CenterModuleCardProps {
  readonly label: string;
  readonly value: string | number;
  readonly Icon: React.ElementType;
  readonly color: string;
  readonly description: string;
  readonly path: string;
  readonly loading: boolean;
  readonly onNavigate: (path: string) => void;
}

/** Tarjeta de KPI del centro de comando, con estado de carga y navegación (FC163 F2B4 Sub-Batch 4B-1). */
function CenterModuleCard({
  label,
  value,
  Icon,
  color,
  description,
  path,
  loading,
  onNavigate,
}: CenterModuleCardProps): React.ReactElement {
  return (
    <div
      className="card-archon-sovereign animate-in fade-in duration-500"
      style={{ '--card-accent': color } as React.CSSProperties}
    >
      <div className="card-sovereign-header">
        <Icon size={20} style={{ color }} />
        <span className="card-sovereign-title">{label}</span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center pb-8">
        {loading ? (
          <div className="w-full h-12 bg-pinnacle-navy/5 animate-pulse rounded-[4px]" />
        ) : (
          <div className="flex flex-col items-center justify-center text-center w-full space-y-1">
            <h3 className="card-sovereign-kpi-value">{value}</h3>
            <p className="card-sovereign-kpi-label">{description}</p>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={(): void => onNavigate(path)}
        className="btn-archon-card-action"
      >
        VER REPORTE <ArrowRight size={12} className="ml-2" />
      </button>
    </div>
  );
}

interface CategoryModuleDef {
  title: string;
  categoryKey: 'vehiculo' | 'maquinaria' | 'herramienta';
  accentColor: string;
  data: ReturnType<typeof useFleet>['stats']['categories']['vehiculo'];
}

interface KpiModuleDef {
  label: string;
  value: string | number;
  Icon: React.ElementType;
  color: string;
  description: string;
  path: string;
}

function buildCategoryModules(stats: ReturnType<typeof useFleet>['stats']): CategoryModuleDef[] {
  return [
    {
      title: 'Vehículos de Flota',
      categoryKey: 'vehiculo',
      accentColor: '#8b5cf6',
      data: stats.categories.vehiculo,
    },
    {
      title: 'Maquinaria Pesada',
      categoryKey: 'maquinaria',
      accentColor: '#f2b705',
      data: stats.categories.maquinaria,
    },
    {
      title: 'Herramienta Menor',
      categoryKey: 'herramienta',
      accentColor: '#0ea5e9',
      data: stats.categories.herramienta,
    },
  ];
}

function buildKpiModulesPrimary(
  stats: ReturnType<typeof useFleet>['stats'],
  activePersonnelCount: number
): KpiModuleDef[] {
  return [
    {
      label: 'Fuerza Operativa',
      value: activePersonnelCount,
      Icon: Users,
      color: '#0f2a44',
      description: 'Personal habilitado en sitio',
      path: '/dashboard/users',
    },
    {
      label: 'Salud de Flota',
      value: `${stats.maintenanceIndex}%`,
      Icon: Gauge,
      color: '#0f2a44',
      description: 'Índice global de operatividad',
      path: '/dashboard/maintenance',
    },
    {
      label: 'Disponibilidad',
      value: stats.available,
      Icon: ShieldCheck,
      color: '#10b981',
      description: 'Unidades listas para operación',
      path: '/dashboard/fleet?status=Disponible',
    },
  ];
}

function buildKpiModulesSecondary(stats: ReturnType<typeof useFleet>['stats']): KpiModuleDef[] {
  return [
    {
      label: 'Despliegue en Ruta',
      value: stats.inRoute,
      Icon: Navigation,
      color: '#0ea5e9',
      description: 'Unidades en tránsito operativo',
      path: '/dashboard/routes',
    },
    {
      label: 'Incidencias en Ruta',
      value: stats.openIncidents,
      Icon: ShieldAlert,
      color: '#ef4444',
      description: 'Alertas Sentinel activas',
      path: '/dashboard/incidents',
    },
    {
      label: 'Mermas Operativas',
      value: stats.totalInactive,
      Icon: ShieldAlert,
      color: '#8b5cf6',
      description: 'Unidades fuera de servicio',
      path: '/dashboard/fleet?status=Descontinuada',
    },
  ];
}

function buildKpiModules(
  stats: ReturnType<typeof useFleet>['stats'],
  activePersonnelCount: number
): KpiModuleDef[] {
  return [
    ...buildKpiModulesPrimary(stats, activePersonnelCount),
    ...buildKpiModulesSecondary(stats),
  ];
}

interface NavigateProps {
  readonly onNavigate: (path: string) => void;
}

/** Tablero de flota y personal: solo se monta con `fleet:unit:view:any` (FC207 F3 · F-OBS2). */
function FleetCommandGrid({ onNavigate }: NavigateProps): React.ReactElement {
  const { stats, loading } = useFleet();
  const { users } = useUsers();
  const activePersonnelCount = users.filter((u) => u.is_active && u.username !== 'Archon').length;
  const categoryModules = buildCategoryModules(stats);
  const kpiModules = buildKpiModules(stats, activePersonnelCount);
  const handleViewDetails = (categoryKey: string): void =>
    onNavigate(`/dashboard/fleet?categoria=${categoryKey}`);

  return (
    <section className="archon-workspace-chassis">
      <div className="archon-axial-container">
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <div className="archon-grid-sovereign">
            {categoryModules.map((c) => (
              <CategoryAnalyticsCard key={c.categoryKey} {...c} onViewDetails={handleViewDetails} />
            ))}
            {kpiModules.map((k) => (
              <CenterModuleCard key={k.label} {...k} loading={loading} onNavigate={onNavigate} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/** Bienvenida del cosmonauta sin permisos de flota: sin peticiones de flota ni de personal, con
 *  acceso directo a Arcsial (FC207 F3 · F-OBS2). */
function CosmonautWelcome({ onNavigate }: NavigateProps): React.ReactElement {
  return (
    <section className="archon-workspace-chassis" data-testid="cosmonaut-welcome">
      <div className="archon-axial-container">
        <div className="card-archon-sovereign max-w-xl mx-auto text-center">
          <div className="card-sovereign-header">
            <Sparkles size={20} className="text-pinnacle-navy" />
            <span className="card-sovereign-title">Bienvenido a Archon</span>
          </div>
          <p className="text-pinnacle-navy/70 py-6">
            Tu cuenta todavía no opera la flota de un Universo. Mientras tanto, la red Arcsial está
            abierta para ti.
          </p>
          <button
            type="button"
            className="btn-archon-primary"
            onClick={(): void => onNavigate('/dashboard/social')}
          >
            Ir a Arcsial <ArrowRight size={12} className="ml-2" />
          </button>
        </div>
      </div>
    </section>
  );
}

/**
 * 🔱 Archon Component: ArchonCenter
 * Implementation: Sovereign Command Center View (V.78.100.87)
 * Objective: High-density predictive analytics and fleet health orchestration.
 * FC207 F3 (F-OBS2): sin `fleet:unit:view:any` muestra la bienvenida del cosmonauta.
 */
const ArchonCenter: React.FC = (): React.ReactElement => {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const { setSectionData } = useSovereignLayout();
  const [isAccessControlOpen, setIsAccessControlOpen] = useState<boolean>(false);

  useEffect(() => {
    setSectionData('Centro de Comando', 'Análisis Predictivo de Segmentos Operativos', null);
  }, [setSectionData]);

  const handleNavigate = (path: string): void => {
    void navigate(path);
  };

  return (
    <div className="animate-in fade-in duration-700">
      {hasPermission('fleet:unit:view:any') ? (
        <FleetCommandGrid onNavigate={handleNavigate} />
      ) : (
        <CosmonautWelcome onNavigate={handleNavigate} />
      )}

      <AccessControlSlideOver
        isOpen={isAccessControlOpen}
        onClose={(): void => setIsAccessControlOpen(false)}
      />
    </div>
  );
};

export default ArchonCenter;
