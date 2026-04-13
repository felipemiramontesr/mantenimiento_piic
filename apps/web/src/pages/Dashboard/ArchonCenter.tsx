import React from 'react';
import { ArrowRight, Gauge, LayoutDashboard } from 'lucide-react';

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
      {/* Sistema de Cuadrícula Sentinel (3 Columnas estrictas en duro) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '32px', width: '100%' }}>
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
              className="text-[14px] font-bold" 
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
