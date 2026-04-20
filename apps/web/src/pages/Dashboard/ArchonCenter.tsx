import React, { useState } from 'react';
import { useNavigate, NavigateFunction } from 'react-router-dom';
import {
  ArrowRight,
  Gauge,
  LayoutDashboard,
  Truck,
  ShieldCheck,
  Wrench,
  Ban,
  Navigation,
  User,
  Settings,
  LogOut,
  Zap,
  History,
  Activity,
  Layers,
} from 'lucide-react';
import { useFleet } from '../../context/FleetContext';
import { SYSTEM_VERSION, BRANDING_NAME } from '../../constants/versionConstants';

const ArchonCenter: React.FC = (): React.ReactElement => {
  const navigate: NavigateFunction = useNavigate();
  const { stats, loading } = useFleet();
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);

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
   * Renders data-dense instruments with skeleton support.
   */
  const renderKPI = (
    label: string,
    value: number | string,
    Icon: React.ElementType,
    color: string,
    description: string,
    mode: 'navy' | 'violet' | 'emerald' | 'sky' | 'yellow' | 'red'
  ): React.ReactElement => (
    <div
      className={`glass-card-pro archon-instrument-tile card-hover-${mode}`}
      style={{
        borderTop: `4px solid ${color}`,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          marginBottom: '16px',
          width: '100%',
        }}
      >
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
              {label.includes('Índice') && !loading && (
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
          onClick={(): void => {
            if (label === 'Gestión de Personal') {
              navigate('/dashboard/users');
            } else {
              navigate('/dashboard/fleet');
            }
          }}
          className={`btn-sentinel-${mode}`}
        >
          VER DETALLES <ArrowRight size={10} className="ml-2" />
        </button>
      </div>
    </div>
  );

  /**
   * 🕒 ANALYTICAL FORMATTER
   * Converts hours to days if magnitude is sufficient for high-level insight.
   */
  const formatTimeMetric = (hours: number): string => {
    if (hours === 0) return '0h';
    if (hours >= 48) {
      const days = Number((hours / 24).toFixed(1));
      return `${days}d`;
    }
    return `${hours}h`;
  };

  /**
   * 📊 CATEGORY ANALYTICAL COLUMN (2x2 Quadrant Design)
   */
  const renderCategoryAnalyticalColumn = (
    title: string,
    categoryKey: 'vehiculo' | 'maquinaria' | 'herramienta',
    accentColor: string
  ): React.ReactElement => {
    const data = stats.categories[categoryKey];
    return (
      <div
        className="glass-card-pro archon-instrument-tile flex flex-col p-20 card-hover-navy"
        style={{
          borderTop: '4px solid #0f2a44',
          height: '240px', // Standardized height for instrument parity
        }}
      >
        {/* Header Section: Parity with renderKPI */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            marginBottom: '16px',
            width: '100%',
          }}
        >
          <Truck size={18} style={{ color: accentColor }} />
          <span className="text-instrument-header text-[#0f2a44] opacity-80 uppercase tracking-[0.1em] text-[12px] font-black">
            {title}
          </span>
        </div>

        {/* Quadrants Section: Compact & High Density */}
        <div className="grid grid-cols-2 grid-rows-2 flex-1 border border-[#0f2a44]/10 rounded-md overflow-hidden bg-gray-50/5">
          {/* Q1: DISP */}
          <div className="flex flex-col items-center justify-center p-8 border-b border-r border-[#0f2a44]/10 hover:bg-gray-50/50 transition-colors">
            <div className="flex items-center gap-1.5 opacity-40 mb-0.5 text-[#0f2a44]">
              <ShieldCheck size={12} className="text-emerald-500" />
              <span className="text-[9px] font-black uppercase tracking-tighter">DISP</span>
            </div>
            <div className="flex items-baseline gap-0.5">
              <span className="font-black text-[#0f2a44] text-xl">
                {loading ? '--' : data.availability}
              </span>
              <span className="text-[10px] font-bold opacity-30 text-[#0f2a44]">%</span>
            </div>
          </div>

          {/* Q2: MTBF */}
          <div className="flex flex-col items-center justify-center p-8 border-b border-[#0f2a44]/10 hover:bg-gray-50/50 transition-colors">
            <div className="flex items-center gap-1.5 opacity-40 mb-0.5 text-[#0f2a44]">
              <Zap size={12} className="text-yellow-500" />
              <span className="text-[9px] font-black uppercase tracking-tighter">MTBF</span>
            </div>
            <span className="font-black text-[#0f2a44] text-xl">
              {loading ? '--' : formatTimeMetric(data.mtbf)}
            </span>
          </div>

          {/* Q3: MTTR */}
          <div className="flex flex-col items-center justify-center p-8 border-r border-[#0f2a44]/10 hover:bg-gray-50/50 transition-colors">
            <div className="flex items-center gap-1.5 opacity-40 mb-0.5 text-[#0f2a44]">
              <History size={12} className="text-violet-500" />
              <span className="text-[9px] font-black uppercase tracking-tighter">MTTR</span>
            </div>
            <span className="font-black text-[#0f2a44] text-xl">
              {loading ? '--' : formatTimeMetric(data.mttr)}
            </span>
          </div>

          {/* Q4: BCK */}
          <div className="flex flex-col items-center justify-center p-8 hover:bg-gray-50/50 transition-colors">
            <div className="flex items-center gap-1.5 opacity-40 mb-0.5 text-[#0f2a44]">
              <Layers size={12} className="text-gray-400" />
              <span className="text-[9px] font-black uppercase tracking-tighter">BCK</span>
            </div>
            <span className="font-black text-[#0f2a44] text-xl">
              {loading ? '--' : data.backlog}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <main className="workspace-container-pro animate-in fade-in duration-700">
      {/* 🚀 HEADER SOBERANO (Dual Panel) */}
      <header className="workspace-header-pro" style={{ position: 'relative', minHeight: '12vh' }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
          }}
        >
          {/* Left Panel: Operational Context */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '8px',
              }}
            >
              <LayoutDashboard size={28} style={{ color: '#f2b705' }} />
              <h2
                className="text-[#0f2a44] tracking-tighter font-black text-2xl"
                style={{ margin: 0, padding: 0, lineHeight: 1 }}
              >
                Centro de Comando
              </h2>
            </div>
            <p className="text-[#0f2a44] text-[10px] font-bold uppercase tracking-[0.2em] opacity-60">
              Eje de Control de personal, unidades & Telemetría de Inteligencia
            </p>
          </div>

          {/* Right Panel: Identity & Access */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', position: 'relative' }}>
            <h1
              style={{
                fontSize: '26px',
                fontWeight: 900,
                margin: 0,
                letterSpacing: '-0.03em',
                fontFamily: 'Inter, system-ui, sans-serif',
                color: '#0f2a44',
              }}
            >
              Archon
            </h1>

            <button
              onClick={toggleMenu}
              aria-label="User Menu"
              className="avatar-trigger-pro"
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '4px',
                border: '2px solid #f2b705',
                backgroundColor: '#0f2a44',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                boxShadow: isMenuOpen ? '0 0 0 4px rgba(242, 183, 5, 0.2)' : 'none',
                transform: isMenuOpen ? 'scale(0.95)' : 'scale(1)',
                padding: 0,
              }}
            >
              <svg width="24" height="24" viewBox="0 0 100 100">
                <path
                  d="M50 8L86.5 29V71L50 92L13.5 71V29L50 8Z"
                  stroke="#f2b705"
                  strokeWidth="16"
                  fill="none"
                />
              </svg>
            </button>

            {isMenuOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '60px',
                  right: '0',
                  width: '180px',
                  backgroundColor: '#ffffff',
                  borderRadius: '4px',
                  boxShadow: '0 10px 30px rgba(15, 42, 68, 0.15)',
                  border: '1px solid rgba(15, 42, 68, 0.08)',
                  zIndex: 100,
                  padding: '4px 0',
                  animation: 'fade-in 0.2s ease-out',
                }}
              >
                <div
                  style={{ padding: '8px 16px', borderBottom: '1px solid rgba(15, 42, 68, 0.05)' }}
                >
                  <span
                    style={{
                      fontSize: '9px',
                      fontWeight: 900,
                      color: '#f2b705',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                    }}
                  >
                    Sovereign Access
                  </span>
                </div>
                <button className="dropdown-item-mock" onClick={closeMenu}>
                  <User size={14} /> Perfil
                </button>
                <button className="dropdown-item-mock" onClick={closeMenu}>
                  <Settings size={14} /> Ajustes
                </button>
                <div
                  style={{ height: '1px', background: 'rgba(15, 42, 68, 0.05)', margin: '4px 0' }}
                />
                <button
                  className="dropdown-item-mock dropdown-item-mock-danger"
                  onClick={handleLogout}
                >
                  <LogOut size={14} /> Cerrar Sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 📊 BODY MODULAR */}
      <section className="archon-workspace-chassis space-y-[20px]">
        {/* 🛡️ INDEPENDENT ANALYTICAL INSTRUMENTS (Consolidated Logic, Independent Display) */}
        <div className="animate-in slide-in-from-top-12 duration-1000">
          <div className="flex items-center gap-12 mb-10 px-8">
            <Activity size={20} style={{ color: '#0f2a44' }} />
            <h2 className="text-[#0f2a44] font-black tracking-tighter text-xl uppercase">
              Inteligencia Operativa
            </h2>
          </div>

          <div className="grid grid-cols-3 gap-24">
            {renderCategoryAnalyticalColumn('Vehículos', 'vehiculo', '#8b5cf6')}
            {renderCategoryAnalyticalColumn('Maquinaria', 'maquinaria', '#f59e0b')}
            {renderCategoryAnalyticalColumn('Herramientas', 'herramienta', '#10b981')}
          </div>
        </div>

        {/* 🚀 GLOBAL STATUS INSTRUMENTS */}
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
            'Unidades descontinuadas',
            stats.discontinued,
            Ban,
            '#ef4444',
            'Unidades inactivas o mermas',
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
    </main>
  );
};

export default ArchonCenter;
