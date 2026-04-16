import React from 'react';
import { Users, User, ArrowRight, Search, Database, Activity } from 'lucide-react';

// ============================================================================
// 🚀 USERS MODULE (v.12.0.0)
// ============================================================================
const UsersModule: React.FC = (): React.ReactElement => (
  <main className="workspace-container-pro animate-in fade-in duration-700">
    {/* 🚀 HEADER SOBERANO (Zen Mode) - V.12.0.0 */}
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
        {/* Left Panel: Administrative Context */}
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
            <Users size={28} style={{ color: '#f2b705' }} />
            <h2
              className="text-[#0f2a44] tracking-tighter font-black text-2xl"
              style={{ margin: 0, padding: 0, lineHeight: 1 }}
            >
              Administrar Usuarios
            </h2>
          </div>
          <p className="text-[#0f2a44] text-[10px] font-bold uppercase tracking-[0.2em] opacity-60">
            Gestión de Operadores y Personal del Sistema
          </p>
        </div>

        {/* Right Panel: Identity (Sync with ArchonCenter) */}
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
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '4px',
              border: '2px solid #f2b705',
              backgroundColor: '#0f2a44',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
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
          </div>
        </div>
      </div>
    </header>

    {/* 📊 ÁREA DE TRABAJO DINÁMICA (Chasis) */}
    <section className="archon-workspace-chassis">
      <div className="archon-grid-3 h-full">
        {/* Card 1: Logística Humana (RELOCALIZADO) */}
        <div
          className={`glass-card-pro archon-instrument-tile card-hover-emerald`}
          style={{
            borderTop: '4px solid #10b981',
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
            <User size={20} style={{ color: '#10b981' }} />
            <span className="text-instrument-header text-[#0f2a44] opacity-80">
              Logística Humana
            </span>
          </div>

          <div className="archon-tile-payload space-y-8 pb-16">
            <div
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid rgba(16, 185, 129, 0.4)',
              }}
            >
              <Users size={40} style={{ color: '#10b981' }} />
            </div>
            <div className="flex flex-col items-center space-y-1 mb-12">
              <h3
                className="text-[#0f2a44] font-black uppercase tracking-[0.15em]"
                style={{ fontSize: '14px' }}
              >
                Gestión Operadores
              </h3>
              <p className="text-[10px] font-bold opacity-60 uppercase tracking-[0.2em] text-[#0f2a44]">
                Directorio de Control
              </p>
            </div>
          </div>

          <div className="archon-tile-action">
            <button className="btn-sentinel-emerald">
              Ver Directorio <ArrowRight size={10} className="text-white" />
            </button>
          </div>
        </div>

        {/* Card 2: Slot de Expansión (Placeholder) */}
        <div
          className={`glass-card-pro archon-instrument-tile opacity-40`}
          style={{
            borderTop: '4px solid rgba(15, 42, 68, 0.1)',
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
            <Search size={20} className="text-[#0f2a44] opacity-20" />
            <span className="text-instrument-header text-[#0f2a44] opacity-40">Próximamente</span>
          </div>

          <div className="archon-tile-payload flex items-center justify-center h-40">
            <Database size={40} className="text-[#0f2a44] opacity-10" />
          </div>

          <div className="archon-tile-action">
            <button disabled className="btn-sentinel-disabled">
              Bloqueado <ArrowRight size={10} />
            </button>
          </div>
        </div>

        {/* Card 3: Slot de Expansión (Placeholder) */}
        <div
          className={`glass-card-pro archon-instrument-tile opacity-40`}
          style={{
            borderTop: '4px solid rgba(15, 42, 68, 0.1)',
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
            <Activity size={20} className="text-[#0f2a44] opacity-20" />
            <span className="text-instrument-header text-[#0f2a44] opacity-40">Próximamente</span>
          </div>

          <div className="archon-tile-payload flex items-center justify-center h-40">
            <Database size={40} className="text-[#0f2a44] opacity-10" />
          </div>

          <div className="archon-tile-action">
            <button disabled className="btn-sentinel-disabled">
              Bloqueado <ArrowRight size={10} />
            </button>
          </div>
        </div>
      </div>
    </section>

    {/* ⚓ FOOTER SENTINEL (10vh) */}
    <footer className="workspace-footer-pro">
      <p>© Todos los derechos reservados por ArchonCore by Dreamtek.</p>
      <p className="text-[#0f2a44]">ArchonCore Sovereign v.12.0.0</p>
    </footer>
  </main>
);

export default UsersModule;
