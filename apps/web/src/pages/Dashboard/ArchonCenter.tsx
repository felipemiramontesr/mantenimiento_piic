import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Gauge, ShieldCheck, Navigation, ShieldAlert, Users } from 'lucide-react';
import { useFleet } from '../../context/FleetContext';
import { useUsers } from '../../context/UserContext';
import { useSovereignLayout } from '../../context/SovereignLayoutContext';
import AccessControlSlideOver from '../../components/Identity/AccessControlSlideOver';
import CategoryAnalyticsCard from '../../components/Dashboard/CategoryAnalyticsCard';

interface CenterModuleCardProps {
  label: string;
  value: string | number;
  Icon: React.ElementType;
  color: string;
  description: string;
  path?: string;
  loading: boolean;
  onNavigate: (path?: string) => void;
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

/**
 * 🔱 Archon Component: ArchonCenter
 * Implementation: Sovereign Command Center View (V.78.100.87)
 * Objective: High-density predictive analytics and fleet health orchestration.
 * Migration: 100% Sovereign Inner Architecture (DRY).
 */
const ArchonCenter: React.FC = (): React.ReactElement => {
  const navigate = useNavigate();
  const { stats, loading } = useFleet();
  const { users } = useUsers();
  const { setSectionData } = useSovereignLayout();
  const [isAccessControlOpen, setIsAccessControlOpen] = useState<boolean>(false);

  useEffect(() => {
    setSectionData('Centro de Comando', 'Análisis Predictivo de Segmentos Operativos', null);
  }, [setSectionData]);

  const activePersonnelCount = users.filter((u) => u.is_active && u.username !== 'Archon').length;

  const handleViewDetails = (categoryKey: string): void => {
    navigate(`/dashboard/fleet?categoria=${categoryKey}`);
  };

  const handleNavigate = (path?: string): void => {
    if (path) navigate(path);
  };

  const categoryModules = buildCategoryModules(stats);
  const kpiModules = buildKpiModules(stats, activePersonnelCount);

  return (
    <div className="animate-in fade-in duration-700">
      <section className="archon-workspace-chassis">
        <div className="archon-axial-container">
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <div className="archon-grid-sovereign">
              {categoryModules.map((c) => (
                <CategoryAnalyticsCard
                  key={c.categoryKey}
                  {...c}
                  onViewDetails={handleViewDetails}
                />
              ))}
              {kpiModules.map((k) => (
                <CenterModuleCard
                  key={k.label}
                  {...k}
                  loading={loading}
                  onNavigate={handleNavigate}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <AccessControlSlideOver
        isOpen={isAccessControlOpen}
        onClose={(): void => setIsAccessControlOpen(false)}
      />
    </div>
  );
};

export default ArchonCenter;
