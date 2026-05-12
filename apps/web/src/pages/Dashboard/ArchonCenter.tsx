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
 * Implementation: Sovereign Command Center View
 * Objective: High-density predictive analytics and fleet health orchestration.
 * v.78.100.50 - Sovereign Layout Integrated
 */

const ArchonCenter: React.FC = (): React.ReactElement => {
  const navigate = useNavigate();
  const { stats, loading } = useFleet();
  const { users } = useUsers();
  const { setSectionData } = useSovereignLayout();
  const [isAccessControlOpen, setIsAccessControlOpen] = useState<boolean>(false);

  // Set Section Metadata on Mount
  useEffect(() => {
    setSectionData(
      'Centro de Comando',
      'Análisis Predictivo de Segmentos Operativos',
      null // No subheader actions for this view yet
    );
  }, [setSectionData]);

  const activePersonnelCount = users.filter((u) => u.is_active && u.username !== 'Archon').length;

  const renderKPI = (
    label: string,
    value: string | number,
    Icon: React.ElementType,
    color: string,
    description: string,
    variant: 'navy' | 'violet' | 'emerald' | 'sky' | 'yellow' | 'red',
    path?: string
  ): React.ReactElement => (
    <div
      className="glass-card-pro archon-instrument-tile animate-in fade-in duration-500"
      style={{ borderTop: `4px solid ${color}` }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          marginBottom: '20px',
          width: '100%',
        }}
      >
        <Icon size={24} style={{ color }} />
        <span className="text-instrument-header text-[#0f2a44] opacity-90">{label}</span>
      </div>

      <div className="archon-tile-payload flex flex-col items-center justify-center pb-6">
        {loading ? (
          <div className="archon-shimmer h-24 w-full rounded" />
        ) : (
          <div className="flex flex-col items-center justify-center text-center w-full space-y-2">
            <h3 className="text-kpi-black text-[#0f2a44] text-center w-full">{value}</h3>
            <p className="text-[12px] font-bold opacity-60 uppercase tracking-[0.2em] text-[#0f2a44] text-center w-full">
              {description}
            </p>
          </div>
        )}
      </div>

      <div className="archon-tile-action">
        <button
          onClick={(): void => {
            if (path) navigate(path);
          }}
          className={`btn-sentinel btn-sentinel-${variant} w-full text-[11px] font-black py-3`}
        >
          VER REPORTE <ArrowRight size={12} className="text-white ml-2" />
        </button>
      </div>
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
        className="glass-card-pro archon-instrument-tile animate-in fade-in duration-700"
        style={{ borderTop: '4px solid #0f2a44' }}
      >
        <div className="flex items-center gap-4 mb-4">
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '4px',
              backgroundColor: `${accentColor}15`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `2px solid ${accentColor}40`,
            }}
          >
            <Icon size={26} style={{ color: accentColor }} />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-widest opacity-40 text-[#0f2a44]">
              Segmento Operativo
            </span>
            <h3 className="text-xl font-black text-[#0f2a44] tracking-tight">{title}</h3>
          </div>
          <div className="ml-auto flex flex-col items-end">
            <span className="text-3xl font-black text-[#0f2a44]">{data.count}</span>
            <span className="text-[9px] font-black uppercase opacity-30">Activos</span>
          </div>
        </div>

        <div
          className="analytics-grid-quadrant"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            borderTop: '1px solid rgba(15, 42, 68, 0.05)',
            marginBottom: '16px',
          }}
        >
          <div
            className="quadrant-item border-r border-b flex flex-col items-center justify-center text-center"
            style={{ padding: '20px', borderColor: 'rgba(15, 42, 68, 0.05)' }}
          >
            <span className="text-[11px] font-black uppercase tracking-widest opacity-40 block mb-2 w-full">
              Disponibilidad
            </span>
            <div className="flex items-center justify-center gap-2 w-full">
              <span className="text-2xl font-black text-[#0f2a44]">{data.availablePercent}%</span>
              <div className={`w-2 h-2 rounded-[4px] transition-all duration-500 ${dotColor}`} />
            </div>
          </div>
          <div
            className="quadrant-item border-b flex flex-col items-center justify-center text-center"
            style={{ padding: '20px', borderColor: 'rgba(15, 42, 68, 0.05)' }}
          >
            <span className="text-[11px] font-black uppercase tracking-widest opacity-40 block mb-2 w-full">
              Estado Crítico
            </span>
            <span className="text-2xl font-black text-red-500 w-full">{data.maintenanceCount}</span>
          </div>
          <div
            className="quadrant-item border-r flex flex-col items-center justify-center text-center"
            style={{ padding: '20px', borderColor: 'rgba(15, 42, 68, 0.05)' }}
          >
            <span className="text-[11px] font-black uppercase tracking-widest opacity-40 block mb-2 w-full">
              MTBF Promedio
            </span>
            <div className="flex items-center justify-center gap-1 w-full">
              <Activity size={12} className="text-sky-500" />
              <span className="text-lg font-black text-[#0f2a44]">
                {formatTimeMetric(data.avgMtbf)}
              </span>
            </div>
          </div>
          <div
            className="quadrant-item flex flex-col items-center justify-center text-center"
            style={{ padding: '20px', borderColor: 'rgba(15, 42, 68, 0.05)' }}
          >
            <span className="text-[11px] font-black uppercase tracking-widest opacity-40 block mb-2 w-full">
              MTTR Táctico
            </span>
            <div className="flex items-center justify-center gap-1 w-full">
              <History size={12} className="text-amber-500" />
              <span className="text-lg font-black text-[#0f2a44]">
                {formatTimeMetric(data.avgMttr)}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="archon-axial-container animate-in fade-in duration-700">
      <div className="archon-grid-3">
        {renderCategoryAnalyticalColumn('Vehículos de Flota', 'vehiculo', '#8b5cf6')}
        {renderCategoryAnalyticalColumn('Maquinaria Pesada', 'maquinaria', '#f2b705')}
        {renderCategoryAnalyticalColumn('Herramienta Menor', 'herramienta', '#0ea5e9')}
        {renderKPI(
          'Fuerza Operativa',
          activePersonnelCount,
          Users,
          '#0f2a44',
          'Personal habilitado en sitio',
          'navy'
        )}
        {renderKPI(
          'Salud de Flota',
          `${stats.maintenanceIndex}%`,
          Gauge,
          '#0f2a44',
          'Índice global de operatividad',
          'navy'
        )}
        {renderKPI(
          'Activos Totales',
          stats.total,
          Truck,
          '#0f2a44',
          'Unidades totales en inventario',
          'navy'
        )}
        {renderKPI(
          'Disponibilidad',
          stats.available,
          ShieldCheck,
          '#10b981',
          'Unidades listas para operación',
          'emerald'
        )}
        {renderKPI(
          'Despliegue en Ruta',
          stats.inRoute,
          Navigation,
          '#0ea5e9',
          'Unidades en tránsito operativo',
          'sky'
        )}
        {renderKPI(
          'Mantenimiento',
          stats.maintenance,
          Wrench,
          '#f2b705',
          'Unidades en mantenimiento activo',
          'yellow'
        )}
        {renderKPI(
          'Incidencias en Ruta',
          stats.openIncidents,
          ShieldAlert,
          '#ef4444',
          'Alertas Sentinel sin resolver',
          'red',
          '/routes'
        )}
        {renderKPI(
          'Mermas Operativas',
          stats.totalInactive,
          ShieldAlert,
          '#8b5cf6',
          'Unidades fuera de servicio',
          'violet'
        )}
      </div>

      <AccessControlSlideOver
        isOpen={isAccessControlOpen}
        onClose={(): void => setIsAccessControlOpen(false)}
      />
    </div>
  );
};

export default ArchonCenter;
