import React from 'react';
import { LayoutDashboard, PlusCircle, Wrench, ArrowRight, Shield } from 'lucide-react';

export type ManagementPanel = 'STRATEGY' | 'EXPANSION' | 'MAINTENANCE';

interface FleetManagementCardsProps {
  activePanel: ManagementPanel;
  onPanelChange: (panel: ManagementPanel) => void;
}

const FleetManagementCards: React.FC<FleetManagementCardsProps> = ({
  activePanel,
  onPanelChange,
}) => (
  <div className="archon-grid-3 gap-5 mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
    {/* Card 1: Estrategia Operativa (NAVY) */}
    <div
      onClick={(): void => onPanelChange('STRATEGY')}
      className={`glass-card-pro archon-instrument-tile cursor-pointer transition-all duration-500 ${
        activePanel === 'STRATEGY'
          ? 'ring-2 ring-[#0f2a44] shadow-lg transform scale-[1.02]'
          : 'card-hover-navy opacity-80 hover:opacity-100'
      }`}
      style={{ borderTop: '4px solid #0f2a44' }}
    >
      <div className="flex items-center justify-center gap-3 mb-4 w-full">
        <LayoutDashboard size={20} className="text-[#0f2a44]" />
        <span className="text-instrument-header text-[#0f2a44] opacity-80 uppercase tracking-widest">
          Estrategia Operativa
        </span>
      </div>

      <div className="archon-tile-payload space-y-8 pb-16">
        <div
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            backgroundColor: 'rgba(15, 42, 68, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid rgba(15, 42, 68, 0.4)',
          }}
        >
          <Shield size={40} className="text-[#0f2a44]" />
        </div>
        <div className="flex flex-col items-center space-y-1 mb-12">
          <h3 className="text-[#0f2a44] font-black uppercase tracking-[0.15em] text-[14px]">
            Administración
          </h3>
          <p className="text-[10px] font-bold opacity-60 uppercase tracking-[0.2em] text-[#0f2a44]">
            Control de Inventario
          </p>
        </div>
      </div>

      <div className="archon-tile-action">
        <button
          className={`btn-sentinel-navy w-full ${
            activePanel === 'STRATEGY' ? 'bg-[#0f2a44] text-white' : ''
          }`}
        >
          Ver Detalles <ArrowRight size={10} className="text-white ml-2" />
        </button>
      </div>
    </div>

    {/* Card 2: Expansión de Flota (EMERALD) */}
    <div
      onClick={(): void => onPanelChange('EXPANSION')}
      className={`glass-card-pro archon-instrument-tile cursor-pointer transition-all duration-500 ${
        activePanel === 'EXPANSION'
          ? 'ring-2 ring-emerald-500 shadow-lg transform scale-[1.02]'
          : 'card-hover-emerald opacity-80 hover:opacity-100'
      }`}
      style={{ borderTop: '4px solid #10b981' }}
    >
      <div className="flex items-center justify-center gap-3 mb-4 w-full">
        <PlusCircle size={20} className="text-emerald-500" />
        <span className="text-instrument-header text-[#0f2a44] opacity-80 uppercase tracking-widest">
          Expansión de Flota
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
          <PlusCircle size={40} className="text-emerald-500" />
        </div>
        <div className="flex flex-col items-center space-y-1 mb-12">
          <h3 className="text-[#0f2a44] font-black uppercase tracking-[0.15em] text-[14px]">
            Registrar
          </h3>
          <p className="text-[10px] font-bold opacity-60 uppercase tracking-[0.2em] text-[#0f2a44]">
            Alta de Activos
          </p>
        </div>
      </div>

      <div className="archon-tile-action">
        <button
          className={`btn-sentinel-emerald w-full ${
            activePanel === 'EXPANSION' ? 'bg-emerald-600 text-white' : ''
          }`}
        >
          Iniciar Registro <ArrowRight size={10} className="text-white ml-2" />
        </button>
      </div>
    </div>

    {/* Card 3: Prevención & Taller (SKY) */}
    <div
      onClick={(): void => onPanelChange('MAINTENANCE')}
      className={`glass-card-pro archon-instrument-tile cursor-pointer transition-all duration-500 ${
        activePanel === 'MAINTENANCE'
          ? 'ring-2 ring-sky-500 shadow-lg transform scale-[1.02]'
          : 'card-hover-sky opacity-80 hover:opacity-100'
      }`}
      style={{ borderTop: '4px solid #0ea5e9' }}
    >
      <div className="flex items-center justify-center gap-3 mb-4 w-full">
        <Wrench size={20} className="text-sky-500" />
        <span className="text-instrument-header text-[#0f2a44] opacity-80 uppercase tracking-widest">
          Prevención & Taller
        </span>
      </div>

      <div className="archon-tile-payload space-y-8 pb-16">
        <div
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            backgroundColor: 'rgba(14, 165, 233, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid rgba(14, 165, 233, 0.4)',
          }}
        >
          <Wrench size={40} className="text-sky-500" />
        </div>
        <div className="flex flex-col items-center space-y-1 mb-12">
          <h3 className="text-[#0f2a44] font-black uppercase tracking-[0.15em] text-[14px]">
            Mantenimiento
          </h3>
          <p className="text-[10px] font-bold opacity-60 uppercase tracking-[0.2em] text-[#0f2a44]">
            Protocolos Técnicos
          </p>
        </div>
      </div>

      <div className="archon-tile-action">
        <button
          className={`btn-sentinel-sky w-full ${
            activePanel === 'MAINTENANCE' ? 'bg-sky-600 text-white' : ''
          }`}
        >
          Iniciar Gestión <ArrowRight size={10} className="text-white ml-2" />
        </button>
      </div>
    </div>
  </div>
);

export default FleetManagementCards;
