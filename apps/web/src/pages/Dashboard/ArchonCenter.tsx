import React from 'react';
import { ArrowRight, Gauge, LayoutDashboard, Truck, ShieldCheck, Wrench, Ban, Navigation } from 'lucide-react';

const ArchonCenter: React.FC = () => (
  <main className="workspace-container-pro animate-in fade-in duration-700">
    {/* 🚀 HEADER SOBERANO (Flexible) - ALINEACIÓN QUIRÚRGICA V.4.7.1 */}
    <header className="workspace-header-pro flex flex-col items-start justify-center">
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <LayoutDashboard size={28} style={{ color: '#f2b705', display: 'block' }} />
        <h2 className="text-[#0f2a44] tracking-tighter font-black text-2xl" style={{ margin: 0, padding: 0, lineHeight: 1 }}>
          Centro de Comando
        </h2>
      </div>
      <p className="text-[#0f2a44] text-[10px] font-bold uppercase tracking-[0.2em] opacity-60">
        Eje de Control de Flota & Telemetría Táctica de Inteligencia
      </p>
    </header>

    {/* 📊 BODY MODULAR (80vh) - GRID 3x3 SYSTEM */}
    <section className="workspace-body-pro">
      {/* Sistema de Cuadrícula Sentinel (3 Columnas estrictas en duro con constraint minmax para matar scroll horizontal) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '20px', width: '100%' }}>
        {/* KPI MÓDULO: Índice de Mantenimiento de Flotilla */}
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
          {/* Header de Tarjeta: Icono + Texto INLINE CENTRADO */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '16px', width: '100%' }}>
            <Gauge size={20} style={{ color: '#f2b705' }} />
            <span className="text-instrument-header text-[#0f2a44] opacity-80">
              Índice de Mantenimiento
            </span>
          </div>

          {/* Cuerpo de Tarjeta: Valor KPI + Descripción */}
          <div className="mb-24" style={{ width: '100%' }}>
            <h3 className="text-kpi-black text-[#0f2a44]">
              94.2<span className="text-xl ml-4 opacity-20">%</span>
            </h3>
            <p 
              className="text-[11px] tracking-wide font-bold"  
              style={{ 
                color: '#0f2a44', 
                whiteSpace: 'nowrap', 
                marginTop: '16px' 
              }}
            >
              Estado operativo de la flota en tiempo real
            </p>
          </div>

          {/* Acción de Tarjeta: Botón Sentinel */}
          <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'center', width: '100%' }}>
            <button className="btn-sentinel-yellow">
              Ver detalles tácticos <ArrowRight size={10} className="text-[#0f2a44]" />
            </button>
          </div>
        </div>

        {/* KPI MÓDULO 2: Nuestra Flotilla */}
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
            <Truck size={20} style={{ color: '#0f2a44' }} />
            <span className="text-instrument-header text-[#0f2a44] opacity-80">
              Nuestra Flotilla
            </span>
          </div>
          <div className="mb-24" style={{ width: '100%' }}>
            <h3 className="text-kpi-black text-[#0f2a44]">
              153
            </h3>
            <p className="text-[11px] tracking-wide font-bold" style={{ color: '#0f2a44', whiteSpace: 'nowrap', marginTop: '16px' }}>
              Unidades totales registradas
            </p>
          </div>
          <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'center', width: '100%' }}>
            <button className="btn-sentinel-yellow" style={{ backgroundColor: '#0f2a44', color: 'white', boxShadow: '0 4px 12px rgba(15, 42, 68, 0.3)' }}>
              Ver detalles tácticos <ArrowRight size={10} className="text-white" />
            </button>
          </div>
        </div>

        {/* KPI MÓDULO 3: Flotilla disponible */}
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
              128
            </h3>
            <p className="text-[11px] tracking-wide font-bold" style={{ color: '#0f2a44', whiteSpace: 'nowrap', marginTop: '16px' }}>
              Unidades aptas y listas para despliegue
            </p>
          </div>
          <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'center', width: '100%' }}>
            <button className="btn-sentinel-yellow" style={{ backgroundColor: '#10b981', color: 'white', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)' }}>
              Ver detalles tácticos <ArrowRight size={10} className="text-white" />
            </button>
          </div>
        </div>

        {/* KPI MÓDULO 4: Flotilla en ruta */}
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
              47
            </h3>
            <p className="text-[11px] tracking-wide font-bold" style={{ color: '#0f2a44', whiteSpace: 'nowrap', marginTop: '16px' }}>
              Unidades en operación
            </p>
          </div>
          <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'center', width: '100%' }}>
            <button className="btn-sentinel-yellow" style={{ backgroundColor: '#0ea5e9', color: 'white', boxShadow: '0 4px 12px rgba(14, 165, 233, 0.3)' }}>
              Ver detalles tácticos <ArrowRight size={10} className="text-white" />
            </button>
          </div>
        </div>

        {/* KPI MÓDULO 5: Flotilla en mantenimiento */}
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
              21
            </h3>
            <p className="text-[11px] tracking-wide font-bold" style={{ color: '#0f2a44', whiteSpace: 'nowrap', marginTop: '16px' }}>
              Unidades en taller o reparación activa
            </p>
          </div>
          <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'center', width: '100%' }}>
            <button className="btn-sentinel-yellow">
              Ver detalles tácticos <ArrowRight size={10} className="text-[#0f2a44]" />
            </button>
          </div>
        </div>

        {/* KPI MÓDULO 6: Flotilla descontinuada */}
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
              4
            </h3>
            <p className="text-[11px] tracking-wide font-bold" style={{ color: '#0f2a44', whiteSpace: 'nowrap', marginTop: '16px' }}>
              Aparatos inactivos, mermas o baja definitiva
            </p>
          </div>
          <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'center', width: '100%' }}>
            <button className="btn-sentinel-yellow" style={{ backgroundColor: '#ef4444', color: 'white', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)' }}>
              Ver detalles tácticos <ArrowRight size={10} className="text-white" />
            </button>
          </div>
        </div>
      </div>
    </section>

    {/* ⚓ FOOTER SENTINEL (10vh) - FORMATO ORACIÓN V.4.7.1 */}
    <footer className="workspace-footer-pro">
      <p>© Todos los derechos reservados por ArchonCore.</p>
      <p className="text-[#0f2a44]">ArchonCore Sovereign v.4.7.1.</p>
    </footer>
  </main>
);

export default ArchonCenter;
