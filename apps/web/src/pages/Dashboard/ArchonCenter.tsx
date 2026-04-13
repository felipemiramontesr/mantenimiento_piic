import React from 'react';
import { ArrowRight, Wrench, LayoutDashboard } from 'lucide-react';

const ArchonCenter: React.FC = () => (
  <main className="workspace-container-pro animate-in fade-in duration-700">
    
    {/* 🚀 HEADER SOBERANO (10vh) - ALINEACIÓN IZQUIERDA & INLINE V.4.7.0 */}
    <header className="workspace-header-pro flex flex-col items-start justify-center">
      <div className="flex items-center gap-12 mb-4">
        <LayoutDashboard size={24} className="text-[#f2b705]" />
        <h2 className="text-[#0f2a44] tracking-tighter font-black text-2xl">
          Centro de Comando
        </h2>
      </div>
      <p className="text-[#0f2a44] text-[10px] font-bold uppercase tracking-[0.2em] opacity-60">
        Eje de Control de Flota & Telemetría Táctica de Inteligencia
      </p>
    </header>

    {/* 📊 BODY MODULAR (80vh) - GRID 3x3 SYSTEM V.4.7.0 */}
    <section className="workspace-body-pro">
      
      {/* Sistema de Cuadrícula Sentinel (3 Columnas estrictas para expansión) */}
      <div className="grid grid-cols-3 gap-24">
        
        {/* KPI MÓDULO: Índice de Mantenimiento de Flotilla (Blueprint Ref) */}
        <div 
          className="glass-card-pro" 
          style={{ 
            borderTop: '4px solid #f2b705', 
            textAlign: 'left'
          }}
        >
          {/* Header de Tarjeta: Icono + Texto INLINE */}
          <div className="flex items-center gap-8 mb-16">
            <Wrench size={12} className="text-[#f2b705]" />
            <span className="text-instrument-header text-[#0f2a44] opacity-80">
              Índice de Mantenimiento
            </span>
          </div>

          {/* Cuerpo de Tarjeta: Valor KPI + Descripción */}
          <div className="mb-24">
            <h3 className="text-kpi-black text-[#0f2a44]">94.2<span className="text-xl ml-4 opacity-20">%</span></h3>
            <p className="text-[14px] font-bold text-[#0f2a44] opacity-80 leading-relaxed mt-8">
              Estado operativo de la flota en tiempo real
            </p>
          </div>

          {/* Acción de Tarjeta: Botón Sentinel */}
          <div className="mt-8">
            <button className="btn-sentinel-yellow">
              Ver detalles tácticos <ArrowRight size={10} className="text-[#0f2a44]" />
            </button>
          </div>
        </div>

        {/* Los espacios restantes (2/3 de la fila) quedan preparados para futuros nodos */}

      </div>

    </section>

    {/* ⚓ FOOTER SENTINEL (10vh) - FORMATO ORACIÓN V.4.7.0 */}
    <footer className="workspace-footer-pro">
      <p>© Todos los derechos reservados por ArchonCore.</p>
      <p className="text-[#0f2a44]">ArchonCore Sovereign v.4.7.0.</p>
    </footer>
  </main>
);

export default ArchonCenter;
