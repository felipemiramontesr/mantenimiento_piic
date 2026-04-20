import React, { useState } from 'react';
import { useNavigate, NavigateFunction } from 'react-router-dom';
import {
  ArrowRight,
  Gauge,
  Truck,
  ShieldCheck,
  Wrench,
  ShieldAlert,
  Navigation,
  User,
  LogOut,
  Zap,
  History,
  Activity,
  Layers,
} from 'lucide-react';
import { useFleet } from '../../context/FleetContext';
import { SYSTEM_VERSION, BRANDING_NAME } from '../../constants/versionConstants';
import AccessControlSlideOver from '../../components/Identity/AccessControlSlideOver';

const ArchonCenter: React.FC = (): React.ReactElement => {
  const navigate: NavigateFunction = useNavigate();
  const { stats, loading } = useFleet();
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [isAccessControlOpen, setIsAccessControlOpen] = useState<boolean>(false);

  const toggleMenu = (): void => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = (): void => {
    setIsMenuOpen(false);
  };

  const handleLogout = (): void => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    navigate('/login');
  };

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
    accentColor: string
  ): React.ReactElement => {
    const data = stats.categories[categoryKey];

    const categoryIcons: Record<string, React.ElementType> = {
      vehiculo: Truck,
      maquinaria: Layers,
      herramienta: Wrench,
    };

    const Icon = categoryIcons[categoryKey];

    return (
      <div className="analytics-card-column animate-in fade-in duration-500">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded flex items-center justify-center text-white shadow-lg"
              style={{ backgroundColor: accentColor }}
            >
              <Icon size={24} />
            </div>
            <div className="flex flex-col">
              <h4 className="text-[10px] font-black uppercase tracking-widest opacity-40">
                Segmento Operativo
              </h4>
              <h3 className="text-xl font-black text-[#0f2a44] tracking-tight">{title}</h3>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-2xl font-black text-[#0f2a44]">{data.count}</span>
            <span className="text-[8px] font-black uppercase tracking-widest opacity-30">
              Activos Totales
            </span>
          </div>
        </div>

        <div className="analytics-grid-quadrant">
          <div className="quadrant-item border-r border-b border-gray-100 p-6">
            <span className="text-[9px] font-black uppercase tracking-widest opacity-30 block mb-2">
              Disponibilidad
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-[#0f2a44]">{data.available_percent}%</span>
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
          </div>
          <div className="quadrant-item border-b border-gray-100 p-6">
            <span className="text-[9px] font-black uppercase tracking-widest opacity-30 block mb-2">
              Estado Crítico
            </span>
            <span className="text-2xl font-black text-[#ef4444]">{data.maintenance_count}</span>
          </div>
          <div className="quadrant-item border-r border-gray-100 p-6">
            <span className="text-[9px] font-black uppercase tracking-widest opacity-30 block mb-2">
              MTBF Promedio
            </span>
            <div className="flex items-center gap-2">
              <Activity size={12} className="text-sky-500" />
              <span className="text-lg font-black text-[#0f2a44]">
                {formatTimeMetric(data.avg_mtbf)}
              </span>
            </div>
          </div>
          <div className="quadrant-item p-6">
            <span className="text-[9px] font-black uppercase tracking-widest opacity-30 block mb-2">
              MTTR Táctico
            </span>
            <div className="flex items-center gap-2">
              <History size={12} className="text-amber-500" />
              <span className="text-lg font-black text-[#0f2a44]">
                {formatTimeMetric(data.avg_mttr)}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <main className="archon-center-viewport">
      <nav className="archon-sentinel-nav shadow-2xl">
        <div className="workspace-identity">
          <div className="archon-logo-mark">
            <Layers size={24} className="text-[#f2b705]" />
          </div>
          <div className="flex flex-col">
            <h1 className="archon-title uppercase">Sentinel Command</h1>
            <p className="archon-subtitle uppercase tracking-widest">Digital Fortress Management</p>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <div className="nav-actions-pro">
            <div className="search-pill-mock">
              <Activity size={14} className="text-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black tracking-widest uppercase">
                System Online
              </span>
            </div>
          </div>

          <div className="relative">
            <button
              onClick={toggleMenu}
              aria-label="User Menu"
              className={`user-avatar-pro transition-all ${
                isMenuOpen ? 'ring-4 ring-[#0f2a44]/10 scale-110' : ''
              }`}
            >
              <User size={20} className="text-[#0f2a44]" />
            </button>

            {isMenuOpen && (
              <div
                className="archon-dropdown-pro animate-in zoom-in-95 duration-200"
                style={{ top: '100%', right: 0, marginTop: '16px' }}
              >
                <div className="dropdown-header-pro">
                  <span className="text-[10px] uppercase font-black tracking-widest opacity-40">
                    Sovereign Access
                  </span>
                </div>
                <button
                  className="dropdown-item-mock"
                  onClick={(): void => {
                    setIsAccessControlOpen(true);
                    closeMenu();
                  }}
                >
                  <ShieldCheck size={14} /> Control de Acceso
                </button>
                <div className="border-t border-gray-100 my-2" />
                <button
                  className="dropdown-item-mock text-red-600 hover:bg-red-50"
                  onClick={handleLogout}
                >
                  <LogOut size={14} /> Desconexión
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <section className="strategy-viewfinder bg-white rounded-xl shadow-inner border border-gray-100 p-12 mb-12">
        <div className="flex items-end justify-between mb-16 border-l-4 border-[#0f2a44] pl-8">
          <div>
            <h2 className="strategy-title uppercase">Métricas Decisivas</h2>
            <p className="strategy-subtitle uppercase opacity-40 tracking-widest">
              Análisis Predictivo de Segmentos Operativos
            </p>
          </div>
          <div className="flex gap-4">
            <div className="kpi-micro-pill">
              <Zap size={12} className="text-yellow-500" />
              <span>Real-Time Engine</span>
            </div>
          </div>
        </div>

        <div className="analytics-grid-pro max-w-5xl mx-auto">
          {renderCategoryAnalyticalColumn('Vehículos de Flota', 'vehiculo', '#8b5cf6')}
          {renderCategoryAnalyticalColumn('Maquinaria Pesada', 'maquinaria', '#f2b705')}
          {renderCategoryAnalyticalColumn('Herramienta Menor', 'herramienta', '#0ea5e9')}
        </div>
      </section>

      <section className="global-instrument-cluster p-12">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: '20px',
            width: '100%',
          }}
        >
          {renderKPI(
            'Índice de Mantenimiento',
            stats.maintenanceIndex,
            Gauge,
            '#0f2a44',
            'Salud global de activos',
            'navy'
          )}
          {renderKPI(
            'Nuestras Unidades',
            stats.total,
            Truck,
            '#8b5cf6',
            'Total de activos registrados',
            'violet'
          )}
          {renderKPI(
            'Unidades disponibles',
            stats.available,
            ShieldCheck,
            '#10b981',
            'Estatus de operación inmediata',
            'emerald'
          )}
          {renderKPI(
            'Unidades en ruta',
            stats.inRoute,
            Navigation,
            '#0ea5e9',
            'Unidades en operación',
            'sky'
          )}
          {renderKPI(
            'Unidades en mantenimiento',
            stats.maintenance,
            Wrench,
            '#f2b705',
            'Protocolos técnicos activos',
            'yellow'
          )}
          {renderKPI(
            'Mermas de Flota',
            stats.total_inactive,
            ShieldAlert,
            '#ef4444',
            'Unidades inactivas o mermas',
            'red'
          )}
        </div>
      </section>

      <AccessControlSlideOver
        isOpen={isAccessControlOpen}
        onClose={(): void => setIsAccessControlOpen(false)}
      />

      <footer className="workspace-footer-pro">
        <p>© Todos los derechos reservados por ArchonCore by Dreamtek.</p>
        <p className="text-[#0f2a44]">
          {BRANDING_NAME} {SYSTEM_VERSION}
        </p>
      </footer>
    </main>
  );
};

export default ArchonCenter;
