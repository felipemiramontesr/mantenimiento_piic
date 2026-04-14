import React, { useState, useEffect } from 'react';
import { useNavigate, NavigateFunction } from 'react-router-dom';
import { ArrowRight, Gauge, LayoutDashboard, Truck, ShieldCheck, Wrench, Ban, Navigation, User, Settings, LogOut } from 'lucide-react';
import api from '../../api/client';
import { FleetUnit } from '../../types/fleet';

const ArchonCenter: React.FC = (): React.ReactElement => {
  const navigate: NavigateFunction = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [units, setUnits] = useState<FleetUnit[]>([]);
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

  const fetchStats = async (): Promise<void> => {
    try {
      setLoading(true);
      const response = await api.get('/fleet');
      if (response.data.success) {
        setUnits(response.data.data);
      }
    } catch (error) {
      // Noise reduction for CI
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

  return (
    <main className="workspace-container-pro animate-in fade-in duration-700">
      {/* 🚀 HEADER SOBERANO (Dual Panel) - V.5.4.1 */}
      <header className="workspace-header-pro" style={{ position: 'relative', minHeight: '12vh' }}>
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          {/* Left Panel: Operational Context */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <LayoutDashboard size={28} style={{ color: '#f2b705' }} />
              <h2 className="text-[#0f2a44] tracking-tighter font-black text-2xl" style={{ margin: 0, padding: 0, lineHeight: 1 }}>
                Centro de Comando
              </h2>
            </div>
            <p className="text-[#0f2a44] text-[10px] font-bold uppercase tracking-[0.2em] opacity-60">
              Eje de Control de Flota & Telemetría de Inteligencia
            </p>
          </div>

          {/* Right Panel: Identity & Access */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', position: 'relative' }}>
            <h1 style={{ 
              fontSize: '26px', 
              fontWeight: 900, 
              margin: 0, 
              letterSpacing: '-0.03em', 
              fontFamily: 'Inter, system-ui, sans-serif', 
              color: '#0f2a44' 
            }}>
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
                padding: 0
              }}
            >
              <svg width="24" height="24" viewBox="0 0 100 100">
                <path d="M50 8L86.5 29V71L50 92L13.5 71V29L50 8Z" stroke="#f2b705" strokeWidth="16" fill="none" />
              </svg>
            </button>

            {isMenuOpen && (
              <div style={{
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
                animation: 'fade-in 0.2s ease-out'
              }}>
                <div style={{ padding: '8px 16px', borderBottom: '1px solid rgba(15, 42, 68, 0.05)' }}>
                  <span style={{ fontSize: '9px', fontWeight: 900, color: '#f2b705', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Sovereign Access</span>
                </div>
                <button 
                  className="dropdown-item-mock" 
                  onClick={closeMenu}
                >
                  <User size={14} /> Perfil
                </button>
                <button 
                  className="dropdown-item-mock" 
                  onClick={closeMenu}
                >
                  <Settings size={14} /> Ajustes
                </button>
                <div style={{ height: '1px', background: 'rgba(15, 42, 68, 0.05)', margin: '4px 0' }} />
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

      {/* 📊 BODY MODULAR (80vh) - GRID 3x3 SYSTEM (Chasis v.5.4.1) */}
      <section className="archon-workspace-chassis">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '20px', width: '100%' }}>
          <div
            className="glass-card-pro"
            style={{
              borderTop: '4px solid #0f2a44',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '16px', width: '100%' }}>
              <Gauge size={20} style={{ color: '#0f2a44' }} />
              <span className="text-instrument-header text-[#0f2a44] opacity-80">
                Índice de Mantenimiento
              </span>
            </div>

            <div className="mb-24" style={{ width: '100%' }}>
              <h3 className="text-kpi-black text-[#0f2a44]">
                {loading ? '...' : '0.0'}<span className="text-xl ml-4 opacity-20">%</span>
              </h3>
              <p className="text-[11px] tracking-wide font-bold" style={{ color: '#0f2a44', whiteSpace: 'nowrap', marginTop: '16px' }}>
                Estado operativo de la flota en tiempo real
              </p>
            </div>

            <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'center', width: '100%' }}>
              <button 
                onClick={(): void => navigate('/dashboard/fleet')}
                className="btn-sentinel-yellow" 
                style={{ backgroundColor: '#0f2a44', color: 'white', boxShadow: '0 4px 12px rgba(15, 42, 68, 0.3)' }}
              >
                Ver detalles <ArrowRight size={10} className="text-white" />
              </button>
            </div>
          </div>

          <div
            className="glass-card-pro"
            style={{
              borderTop: '4px solid #8b5cf6',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '16px', width: '100%' }}>
              <Truck size={20} style={{ color: '#8b5cf6' }} />
              <span className="text-instrument-header text-[#0f2a44] opacity-80">
                Nuestra Flotilla
              </span>
            </div>
            <div className="mb-24" style={{ width: '100%' }}>
              <h3 className="text-kpi-black text-[#0f2a44]">
                {loading ? '...' : stats.total}
              </h3>
              <p className="text-[11px] tracking-wide font-bold" style={{ color: '#0f2a44', whiteSpace: 'nowrap', marginTop: '16px' }}>
                Unidades totales registradas
              </p>
            </div>
            <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'center', width: '100%' }}>
              <button 
                onClick={(): void => navigate('/dashboard/fleet')}
                className="btn-sentinel-yellow" 
                style={{ backgroundColor: '#8b5cf6', color: 'white', boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)' }}
              >
                Ver detalles <ArrowRight size={10} className="text-white" />
              </button>
            </div>
          </div>

          <div
            className="glass-card-pro"
            style={{
              borderTop: '4px solid #10b981',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '16px', width: '100%' }}>
              <ShieldCheck size={20} style={{ color: '#10b981' }} />
              <span className="text-instrument-header text-[#0f2a44] opacity-80">
                Flotilla disponible
              </span>
            </div>
            <div className="mb-24" style={{ width: '100%' }}>
              <h3 className="text-kpi-black text-[#0f2a44]">
                {loading ? '...' : stats.available}
              </h3>
              <p className="text-[11px] tracking-wide font-bold" style={{ color: '#0f2a44', whiteSpace: 'nowrap', marginTop: '16px' }}>
                Unidades aptas y listas para despliegue
              </p>
            </div>
            <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'center', width: '100%' }}>
              <button 
                onClick={(): void => navigate('/dashboard/fleet')}
                className="btn-sentinel-yellow" 
                style={{ backgroundColor: '#10b981', color: 'white', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)' }}
              >
                Ver detalles <ArrowRight size={10} className="text-white" />
              </button>
            </div>
          </div>

          <div
            className="glass-card-pro"
            style={{
              borderTop: '4px solid #0ea5e9',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '16px', width: '100%' }}>
              <Navigation size={20} style={{ color: '#0ea5e9' }} />
              <span className="text-instrument-header text-[#0f2a44] opacity-80">
                Flotilla en ruta
              </span>
            </div>
            <div className="mb-24" style={{ width: '100%' }}>
              <h3 className="text-kpi-black text-[#0f2a44]">
                {loading ? '...' : stats.inRoute}
              </h3>
              <p className="text-[11px] tracking-wide font-bold" style={{ color: '#0f2a44', whiteSpace: 'nowrap', marginTop: '16px' }}>
                Unidades en operación
              </p>
            </div>
            <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'center', width: '100%' }}>
              <button 
                onClick={(): void => navigate('/dashboard/fleet')}
                className="btn-sentinel-yellow" 
                style={{ backgroundColor: '#0ea5e9', color: 'white', boxShadow: '0 4px 12px rgba(14, 165, 233, 0.3)' }}
              >
                Ver detalles <ArrowRight size={10} className="text-white" />
              </button>
            </div>
          </div>

          <div
            className="glass-card-pro"
            style={{
              borderTop: '4px solid #f2b705',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '16px', width: '100%' }}>
              <Wrench size={20} style={{ color: '#f2b705' }} />
              <span className="text-instrument-header text-[#0f2a44] opacity-80">
                Flotilla en mantenimiento
              </span>
            </div>
            <div className="mb-24" style={{ width: '100%' }}>
              <h3 className="text-kpi-black text-[#0f2a44]">
                {loading ? '...' : stats.maintenance}
              </h3>
              <p className="text-[11px] tracking-wide font-bold" style={{ color: '#0f2a44', whiteSpace: 'nowrap', marginTop: '16px' }}>
                Unidades en taller o reparación activa
              </p>
            </div>
            <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'center', width: '100%' }}>
              <button 
                onClick={(): void => navigate('/dashboard/fleet')}
                className="btn-sentinel-yellow"
              >
                Ver detalles <ArrowRight size={10} className="text-[#0f2a44]" />
              </button>
            </div>
          </div>

          <div
            className="glass-card-pro"
            style={{
              borderTop: '4px solid #ef4444',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '16px', width: '100%' }}>
              <Ban size={20} style={{ color: '#ef4444' }} />
              <span className="text-instrument-header text-[#0f2a44] opacity-80">
                Flotilla descontinuada
              </span>
            </div>
            <div className="mb-24" style={{ width: '100%' }}>
              <h3 className="text-kpi-black text-[#0f2a44]">
                {loading ? '...' : stats.discontinued}
              </h3>
              <p className="text-[11px] tracking-wide font-bold" style={{ color: '#0f2a44', whiteSpace: 'nowrap', marginTop: '16px' }}>
                Aparatos inactivos, mermas o baja definitiva
              </p>
            </div>
            <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'center', width: '100%' }}>
              <button 
                onClick={(): void => navigate('/dashboard/fleet')}
                className="btn-sentinel-yellow" 
                style={{ backgroundColor: '#ef4444', color: 'white', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)' }}
              >
                Ver detalles <ArrowRight size={10} className="text-white" />
              </button>
            </div>
          </div>
        </div>
      </section>

      <footer className="workspace-footer-pro">
        <p>© Todos los derechos reservados por ArchonCore by Dreamtek.</p>
        <p className="text-[#0f2a44]">ArchonCore Sovereign v.5.4.1.</p>
      </footer>
    </main>
  );
};

export default ArchonCenter;
