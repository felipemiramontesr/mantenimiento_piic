import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import api from '../../api/client';
import { FleetUnit } from '../../types/fleet';

const ArchonCenter: React.FC = (): React.ReactElement => {
  const navigate: NavigateFunction = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [units, setUnits] = useState<FleetUnit[]>(() => {
    try {
      const cached = localStorage.getItem('archon_fleet_cache');
      // ⚡ AGGRESSIVE HYDRATION: Return cached data immediately
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState<boolean>(true);

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
   * High-Performance Hydration Engine
   * Fetches fresh tactical data and persists it for instant future loads.
   */
  const fetchStats = async (): Promise<void> => {
    try {
      // If we have cached units, we don't 'flash' the loading state
      const hasCache = units.length > 0;
      if (!hasCache) setLoading(true);

      const response = await api.get('/fleet');
      if (response.data.success) {
        const freshData = response.data.data;
        setUnits(freshData);
        // 🛡️ SYMMETRY ENFORCEMENT: Update central cache
        localStorage.setItem('archon_fleet_cache', JSON.stringify(freshData));
      }
    } catch (error) {
      // Noise reduction for Sovereign operations
    } finally {
      setLoading(false);
    }
  };

  useEffect((): void => {
    fetchStats();
  }, []);

  const stats = {
    total: units.length,
    available: units.filter((u: FleetUnit): boolean => u.status === 'Disponible').length,
    inRoute: units.filter((u: FleetUnit): boolean => u.status === 'En Ruta').length,
    maintenance: units.filter((u: FleetUnit): boolean => u.status === 'En Mantenimiento').length,
    discontinued: units.filter((u: FleetUnit): boolean => u.status === 'Descontinuada').length,
  };

  /**
   * KPI Presentation Engine (V.7.1.2)
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
          onClick={(): void => navigate('/dashboard/fleet')}
          className={`btn-sentinel-${mode}`}
        >
          VER DETALLES <ArrowRight size={10} className="ml-2" />
        </button>
      </div>
    </div>
  );

  return (
    <main className="workspace-container-pro animate-in fade-in duration-700">
      {/* 🚀 HEADER SOBERANO (Dual Panel) - V.7.1.2 */}
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
              Eje de Control de Flota & Telemetría de Inteligencia
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

      {/* 📊 BODY MODULAR (80vh) - GRID 3x3 SYSTEM (Chasis v.8.0.0) */}
      <section className="archon-workspace-chassis">
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
            '0.0',
            Gauge,
            '#0f2a44',
            'Estado operativo de la flota',
            'navy'
          )}
          {renderKPI(
            'Nuestra Flotilla',
            stats.total,
            Truck,
            '#8b5cf6',
            'Unidades totales registradas',
            'violet'
          )}
          {renderKPI(
            'Flotilla disponible',
            stats.available,
            ShieldCheck,
            '#10b981',
            'Unidades aptas para despliegue',
            'emerald'
          )}
          {renderKPI(
            'Flotilla en ruta',
            stats.inRoute,
            Navigation,
            '#0ea5e9',
            'Unidades en operación',
            'sky'
          )}
          {renderKPI(
            'Flotilla en mantenimiento',
            stats.maintenance,
            Wrench,
            '#f2b705',
            'Unidades en taller o reparación',
            'yellow'
          )}
          {renderKPI(
            'Flotilla descontinuada',
            stats.discontinued,
            Ban,
            '#ef4444',
            'Aparatos inactivos o mermas',
            'red'
          )}
        </div>
      </section>

      <footer className="workspace-footer-pro">
        <p>© Todos los derechos reservados por ArchonCore by Dreamtek.</p>
        <p className="text-[#0f2a44]">ArchonCore Sovereign v.8.0.0</p>
      </footer>
    </main>
  );
};

export default ArchonCenter;
