import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Gauge,
  Truck,
  ShieldCheck,
  Wrench,
  Navigation,
  ShieldAlert,
  History,
  Activity,
  Layers,
  Users,
} from 'lucide-react';
import { useFleet } from '../../context/FleetContext';
import { useUsers } from '../../context/UserContext';
import { useSovereignLayout } from '../../context/SovereignLayoutContext';
import AccessControlSlideOver from '../../components/Identity/AccessControlSlideOver';

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

  const renderKPI = (
    label: string,
    value: string | number,
    Icon: React.ElementType,
    color: string,
    description: string,
    path?: string
  ): React.ReactElement => (
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
        onClick={(): void => {
          if (path) navigate(path);
        }}
        className="btn-archon-card-action"
      >
        VER REPORTE <ArrowRight size={12} className="ml-2" />
      </button>
    </div>
  );

  const formatTimeMetric = (hours: number): string => {
    if (hours === 0) return '0h';
    if (hours >= 48) {
      const days = Number((hours / 24).toFixed(1));
      return `${days}d`;
    }
    return `${hours}h`;
  };

  const renderCategoryAnalyticalColumn = (
    title: string,
    categoryKey: 'vehiculo' | 'maquinaria' | 'herramienta',
    accentColor: string
  ): React.ReactElement => {
    const data = stats.categories[categoryKey];
    const avail = data.availablePercent;

    let dotColor = 'bg-red-500 animate-pulse';
    if (avail >= 90) dotColor = 'bg-emerald-500';
    else if (avail >= 75) dotColor = 'bg-amber-500 animate-pulse';

    const categoryIcons: Record<string, React.ElementType> = {
      vehiculo: Truck,
      maquinaria: Layers,
      herramienta: Wrench,
    };

    const Icon = categoryIcons[categoryKey];

    return (
      <div
        className="card-archon-sovereign animate-in fade-in duration-700"
        style={{ '--card-accent': accentColor } as React.CSSProperties}
      >
        <div className="flex items-center gap-4 mb-6">
          <div
            className="w-14 h-14 rounded-[4px] flex items-center justify-center border-2"
            style={{
              backgroundColor: `${accentColor}10`,
              borderColor: `${accentColor}30`,
            }}
          >
            <Icon size={24} style={{ color: accentColor }} />
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-pinnacle-navy opacity-40">
              Segmento Operativo
            </span>
            <h3 className="text-lg font-black text-pinnacle-navy tracking-tight">{title}</h3>
          </div>
          <div className="ml-auto flex flex-col items-end">
            <span className="text-2xl font-black text-pinnacle-navy">{data.count}</span>
            <span className="text-[8px] font-black uppercase opacity-30">Activos</span>
          </div>
        </div>

        <div className="card-sovereign-quadrant-grid">
          <div className="card-sovereign-quadrant-item">
            <span className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-2">
              Disponibilidad
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black text-pinnacle-navy">
                {data.availablePercent}%
              </span>
              <div className={`w-2 h-2 rounded-full ${dotColor}`} />
            </div>
          </div>
          <div className="card-sovereign-quadrant-item">
            <span className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-2">
              Estado Crítico
            </span>
            <span className="text-xl font-black text-red-500">{data.maintenanceCount}</span>
          </div>
          <div className="card-sovereign-quadrant-item">
            <span className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-2">
              MTBF Promedio
            </span>
            <div className="flex items-center gap-1">
              <Activity size={10} className="text-sky-500" />
              <span className="text-base font-black text-pinnacle-navy">
                {formatTimeMetric(data.avgMtbf)}
              </span>
            </div>
          </div>
          <div className="card-sovereign-quadrant-item">
            <span className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-2">
              MTTR Táctico
            </span>
            <div className="flex items-center gap-1">
              <History size={10} className="text-amber-500" />
              <span className="text-base font-black text-pinnacle-navy">
                {formatTimeMetric(data.avgMttr)}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={(): void => navigate(`/dashboard/fleet?categoria=${categoryKey}`)}
          className="btn-archon-card-action"
        >
          VER DETALLES <ArrowRight size={12} className="ml-2" />
        </button>
      </div>
    );
  };

  return (
    <div className="animate-in fade-in duration-700">
      {/* 📊 COMMAND CENTER CHASSIS */}
      <section className="archon-workspace-chassis">
        <div className="archon-axial-container">
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <div className="archon-grid-sovereign">
              {renderCategoryAnalyticalColumn('Vehículos de Flota', 'vehiculo', '#8b5cf6')}
              {renderCategoryAnalyticalColumn('Maquinaria Pesada', 'maquinaria', '#f2b705')}
              {renderCategoryAnalyticalColumn('Herramienta Menor', 'herramienta', '#0ea5e9')}

              {renderKPI(
                'Fuerza Operativa',
                activePersonnelCount,
                Users,
                '#0f2a44',
                'Personal habilitado en sitio',
                '/dashboard/users'
              )}
              {renderKPI(
                'Salud de Flota',
                `${stats.maintenanceIndex}%`,
                Gauge,
                '#0f2a44',
                'Índice global de operatividad',
                '/dashboard/maintenance'
              )}
              {renderKPI(
                'Disponibilidad',
                stats.available,
                ShieldCheck,
                '#10b981',
                'Unidades listas para operación',
                '/dashboard/fleet?status=Disponible'
              )}
              {renderKPI(
                'Despliegue en Ruta',
                stats.inRoute,
                Navigation,
                '#0ea5e9',
                'Unidades en tránsito operativo',
                '/dashboard/routes'
              )}
              {renderKPI(
                'Incidencias en Ruta',
                stats.openIncidents,
                ShieldAlert,
                '#ef4444',
                'Alertas Sentinel activas',
                '/dashboard/routes'
              )}
              {renderKPI(
                'Mermas Operativas',
                stats.totalInactive,
                ShieldAlert,
                '#8b5cf6',
                'Unidades fuera de servicio',
                '/dashboard/fleet?status=Descontinuada'
              )}
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
