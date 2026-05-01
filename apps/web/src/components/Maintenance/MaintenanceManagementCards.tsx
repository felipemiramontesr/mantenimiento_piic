import React from 'react';
import { ClipboardList, Wrench, ArrowRight, History } from 'lucide-react';

export type MaintenancePanel = 'HISTORY' | 'SCHEDULE';

interface MaintenanceManagementCardsProps {
  activePanel: MaintenancePanel;
  onPanelChange: (panel: MaintenancePanel) => void;
}

/**
 * 🛠️ ARCHON COMPONENT: MaintenanceManagementCards
 * Implementation: Dual-Axis Symmetry Selector (Standard)
 * Theme: Maintenance (Navy & Yellow)
 */
const MaintenanceManagementCards: React.FC<MaintenanceManagementCardsProps> = ({
  activePanel,
  onPanelChange,
}) => (
  <div className="archon-central-axis animate-in fade-in slide-in-from-top-4 duration-700">
    <div className="archon-grid-2 gap-8 mb-8">
      {/* ── CARD 01: Historial de Servicios (NAVY) ────────────────────────── */}
      <div
        onClick={(): void => onPanelChange('HISTORY')}
        className={`glass-card-pro archon-instrument-tile cursor-pointer transition-all duration-500 ${
          activePanel === 'HISTORY'
            ? 'ring-2 ring-[#0f2a44] shadow-lg transform scale-[1.02]'
            : 'card-hover-navy opacity-80 hover:opacity-100'
        }`}
        style={{ borderTop: '4px solid #0f2a44' }}
      >
        <div className="flex items-center justify-center gap-3 mb-4 w-full">
          <History size={20} className="text-[#0f2a44]" />
          <span className="text-instrument-header text-[#0f2a44] opacity-80 uppercase tracking-widest">
            Bitácora de Servicios
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
            <ClipboardList size={40} className="text-[#0f2a44]" />
          </div>
          <div className="flex flex-col items-center space-y-1 mb-12">
            <h3 className="text-[#0f2a44] font-black uppercase tracking-[0.15em] text-[14px]">
              Historial
            </h3>
            <p className="text-[10px] font-bold opacity-60 uppercase tracking-[0.2em] text-[#0f2a44]">
              Control de Servicios Pasados
            </p>
          </div>
        </div>

        <div className="archon-tile-action">
          <button
            className={`btn-sentinel-navy w-full ${
              activePanel === 'HISTORY' ? 'bg-[#0f2a44] text-white' : ''
            }`}
          >
            Ver Bitácora <ArrowRight size={10} className="text-white ml-2" />
          </button>
        </div>
      </div>

      {/* ── CARD 02: Programar Mantenimiento (EMERALD) ────────────────────── */}
      <div
        onClick={(): void => onPanelChange('SCHEDULE')}
        className={`glass-card-pro archon-instrument-tile cursor-pointer transition-all duration-500 ${
          activePanel === 'SCHEDULE'
            ? 'ring-2 ring-emerald-500 shadow-lg transform scale-[1.02]'
            : 'card-hover-emerald opacity-80 hover:opacity-100'
        }`}
        style={{ borderTop: '4px solid #10b981' }}
      >
        <div className="flex items-center justify-center gap-3 mb-4 w-full">
          <Wrench size={20} className="text-emerald-500" />
          <span className="text-instrument-header text-[#0f2a44] opacity-80 uppercase tracking-widest">
            Gestión de Servicios
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
            <Wrench size={40} className="text-emerald-500" />
          </div>
          <div className="flex flex-col items-center space-y-1 mb-12">
            <h3 className="text-[#0f2a44] font-black uppercase tracking-[0.15em] text-[14px]">
              Programar
            </h3>
            <p className="text-[10px] font-bold opacity-60 uppercase tracking-[0.2em] text-[#0f2a44]">
              Alta de Nuevo Mantenimiento
            </p>
          </div>
        </div>

        <div className="archon-tile-action">
          <button
            className={`btn-sentinel-emerald w-full ${
              activePanel === 'SCHEDULE' ? 'bg-emerald-600 text-white' : ''
            }`}
          >
            Iniciar Registro <ArrowRight size={10} className="text-white ml-2" />
          </button>
        </div>
      </div>
    </div>
  </div>
);

export default MaintenanceManagementCards;
