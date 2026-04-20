import React, { useState } from 'react';
import {
  ArrowRight,
  Gauge,
  Truck,
  ShieldCheck,
  Wrench,
  ShieldAlert,
  Navigation,
  History,
  Activity,
  Layers,
} from 'lucide-react';
import { useFleet } from '../../context/FleetContext';
import { SYSTEM_VERSION, BRANDING_NAME } from '../../constants/versionConstants';
import AccessControlSlideOver from '../../components/Identity/AccessControlSlideOver';

const ArchonCenter: React.FC = (): React.ReactElement => {
  const { stats, loading } = useFleet();
  const [isAccessControlOpen, setIsAccessControlOpen] = useState<boolean>(false);

  /**
   * KPI Presentation Engine
   */
  const renderKPI = (
    label: string,
    value: number | string,
    Icon: React.ElementType,
    color: string,
    description: string,
    mode: 'navy' | 'violet' | 'emerald' | 'sky' | 'yellow' | 'red'
  ): React.ReactElement => {
    const isMaintenanceIndex = label.includes('Índice');

    return (
      <div
        className={`glass-card-pro archon-instrument-tile card-hover-${mode}`}
        style={{ borderTop: `4px solid ${color}` }}
      >
        <div className="flex items-center justify-center gap-3 mb-4 w-full">
          <Icon size={20} style={{ color }} />
          <span className="text-instrument-header text-[#0f2a44] opacity-80">{label}</span>
        </div>

        <div className="archon-tile-payload flex flex-col items-center justify-center pb-16">
          {loading ? (
            <div className="archon-shimmer h-40 w-full rounded" />
          ) : (
            <div className="flex flex-col items-center mb-8">
              <div className="flex items-baseline justify-center">
                <h2 className="text-[#0f2a44] font-black text-[64px] leading-none">{value}</h2>
                {isMaintenanceIndex && (
                  <span className="text-2xl font-bold ml-2 opacity-30 text-[#0f2a44]">%</span>
                )}
              </div>
              <p className="text-[11px] tracking-[0.2em] font-bold uppercase opacity-60 text-[#0f2a44] mt-2">
                {description}
              </p>
            </div>
          )}
        </div>

        <div className="archon-tile-action">
          <button
            className="btn-sentinel-pro w-full flex items-center justify-center gap-2"
            style={{ backgroundColor: color }}
            onClick={(): void => {
              /* Navigation detail: Future extension */
            }}
          >
            Ver Detalle <ArrowRight size={12} />
          </button>
        </div>
      </div>
    );
  };

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
    accentColor: string,
    variant: 'violet' | 'yellow' | 'sky'
  ): React.ReactElement => {
    const data = stats.categories[categoryKey];

    const categoryIcons: Record<string, React.ElementType> = {
      vehiculo: Truck,
      maquinaria: Layers,
      herramienta: Wrench,
    };

    const Icon = categoryIcons[categoryKey];

    return (
      <div
        className={`glass-card-pro archon-instrument-tile card-hover-${variant} animate-in fade-in duration-700`}
        style={{ borderTop: `4px solid ${accentColor}`, height: 'auto', minHeight: '440px' }}
      >
        <div className="flex items-center gap-4 mb-8">
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: `${accentColor}15`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `2px solid ${accentColor}40`,
            }}
          >
            <Icon size={22} style={{ color: accentColor }} />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-widest opacity-40 text-[#0f2a44]">
              Segmento Operativo
            </span>
            <h3 className="text-lg font-black text-[#0f2a44] tracking-tight">{title}</h3>
          </div>
          <div className="ml-auto flex flex-col items-end">
            <span className="text-2xl font-black text-[#0f2a44]">{data.count}</span>
            <span className="text-[8px] font-black uppercase opacity-30">Activos</span>
          </div>
        </div>

        <div
          className="analytics-grid-quadrant"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            borderTop: '1px solid rgba(15, 42, 68, 0.05)',
            marginBottom: '24px',
          }}
        >
          <div
            className="quadrant-item border-r border-b"
            style={{ padding: '20px', borderColor: 'rgba(15, 42, 68, 0.05)' }}
          >
            <span className="text-[9px] font-black uppercase tracking-widest opacity-40 block mb-1">
              Disponibilidad
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-black text-[#0f2a44]">{data.availablePercent}%</span>
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
          </div>
          <div
            className="quadrant-item border-b"
            style={{ padding: '20px', borderColor: 'rgba(15, 42, 68, 0.05)' }}
          >
            <span className="text-[9px] font-black uppercase tracking-widest opacity-40 block mb-1">
              Estado Crítico
            </span>
            <span className="text-xl font-black text-red-500">{data.maintenanceCount}</span>
          </div>
          <div
            className="quadrant-item border-r"
            style={{ padding: '20px', borderColor: 'rgba(15, 42, 68, 0.05)' }}
          >
            <span className="text-[9px] font-black uppercase tracking-widest opacity-40 block mb-1">
              MTBF Promedio
            </span>
            <div className="flex items-center gap-1">
              <Activity size={10} className="text-sky-500" />
              <span className="text-base font-black text-[#0f2a44]">
                {formatTimeMetric(data.avgMtbf)}
              </span>
            </div>
          </div>
          <div
            className="quadrant-item"
            style={{ padding: '20px', borderColor: 'rgba(15, 42, 68, 0.05)' }}
          >
            <span className="text-[9px] font-black uppercase tracking-widest opacity-40 block mb-1">
              MTTR Táctico
            </span>
            <div className="flex items-center gap-1">
              <History size={10} className="text-amber-500" />
              <span className="text-base font-black text-[#0f2a44]">
                {formatTimeMetric(data.avgMttr)}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-auto">
          <button className={`btn-sentinel-${variant} w-full`}>
            GESTIONAR SEGMENTO <ArrowRight size={10} className="text-white ml-2" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <main className="workspace-container-pro animate-in fade-in duration-700">
      <header className="workspace-header-pro">
        <div className="flex flex-row items-center justify-between w-full">
          <div className="flex flex-col items-start">
            <div className="flex flex-row items-center gap-3 mb-2">
              <Layers size={28} className="text-[#f2b705]" />
              <h2 className="text-[#0f2a44] tracking-tighter font-black text-2xl m-0 p-0 leading-none">
                Centro de Comando
              </h2>
            </div>
            <p className="text-[#0f2a44] text-[10px] font-bold uppercase tracking-[0.2em] opacity-60">
              Análisis Predictivo de Segmentos Operativos
            </p>
          </div>

          <div className="flex items-center gap-6 relative">
            <h1 className="text-[26px] font-black tracking-tighter m-0 text-[#0f2a44] font-['Inter']">
              Archon
            </h1>
            <div className="w-[44px] h-[44px] rounded-[4px] border-2 border-[#f2b705] bg-[#0f2a44] flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 100 100">
                <path
                  d="M50 8L86.5 29V71L50 92L13.5 71V29L50 8Z"
                  stroke="#f2b705"
                  strokeWidth="16"
                  fill="none"
                />
              </svg>
            </div>
          </div>
        </div>
      </header>

      <section className="archon-workspace-chassis">
        <div className="archon-grid-3 mb-8">
          {renderCategoryAnalyticalColumn('Vehículos de Flota', 'vehiculo', '#8b5cf6', 'violet')}
          {renderCategoryAnalyticalColumn('Maquinaria Pesada', 'maquinaria', '#f2b705', 'yellow')}
          {renderCategoryAnalyticalColumn('Herramienta Menor', 'herramienta', '#0ea5e9', 'sky')}
        </div>

        <div className="archon-grid-3">
          {renderKPI(
            'Salud de Flota',
            stats.maintenanceIndex,
            Gauge,
            '#0f2a44',
            'Índice global de operatividad',
            'navy'
          )}
          {renderKPI(
            'Activos Totales',
            stats.total,
            Truck,
            '#8b5cf6',
            'Unidades totales en inventario',
            'violet'
          )}
          {renderKPI(
            'Diponibilidad Inmediata',
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
            'Protocolos de Mejora',
            stats.maintenance,
            Wrench,
            '#f2b705',
            'Unidades en mantenimiento activo',
            'yellow'
          )}
          {renderKPI(
            'Mermas Operativas',
            stats.totalInactive,
            ShieldAlert,
            '#ef4444',
            'Unidades fuera de servicio',
            'red'
          )}
        </div>
      </section>

      <footer className="workspace-footer-pro">
        <p>© Todos los derechos reservados por ArchonCore by Dreamtek.</p>
        <p className="text-[#0f2a44]">
          {BRANDING_NAME} {SYSTEM_VERSION}
        </p>
      </footer>

      <AccessControlSlideOver
        isOpen={isAccessControlOpen}
        onClose={(): void => setIsAccessControlOpen(false)}
      />
    </main>
  );
};

export default ArchonCenter;
