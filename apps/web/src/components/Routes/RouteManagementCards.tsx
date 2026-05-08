import React from 'react';
import { History, MapPin, ArrowRight, Shield } from 'lucide-react';

export type RoutePanel = 'LOGS' | 'DISPATCH' | 'JOURNAL';

interface RouteManagementCardsProps {
  activePanel: RoutePanel;
  onPanelChange: (panel: RoutePanel) => void;
  onAction?: (action: 'DESPACHO' | 'BITACORA' | 'FORENSE') => void;
}

const RouteManagementCards: React.FC<RouteManagementCardsProps> = ({
  activePanel,
  onPanelChange,
  onAction,
}) => (
  <div className="archon-central-axis animate-in fade-in slide-in-from-top-4 duration-700">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
      {/* Card 1: Logística Operativa & Forense (NAVY) */}
      <div
        onClick={(): void => onPanelChange('LOGS')}
        className={`glass-card-pro archon-instrument-tile cursor-pointer transition-all duration-500 ${
          activePanel === 'LOGS' || activePanel === 'JOURNAL'
            ? 'border-2 border-[#0f2a44] shadow-lg'
            : 'card-hover-navy opacity-80 hover:opacity-100'
        }`}
        style={{ borderTop: '4px solid #0f2a44' }}
      >
        <div className="flex items-center justify-center gap-3 mb-4 w-full">
          <History size={20} className="text-[#0f2a44]" />
          <span className="text-instrument-header text-[#0f2a44] opacity-80 uppercase tracking-widest">
            Logística & Auditoría
          </span>
        </div>

        <div className="archon-tile-payload space-y-8 pb-16">
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '4px',
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
              Histórico • Journal Forense
            </p>
          </div>
        </div>

        <div className="archon-tile-action">
          <button
            onClick={(e): void => {
              e.stopPropagation();
              if (onAction) onAction('BITACORA');
              onPanelChange('LOGS');
            }}
            className={`btn-sentinel-navy w-full ${
              activePanel === 'LOGS' || activePanel === 'JOURNAL' ? 'bg-[#0f2a44] text-white' : ''
            }`}
          >
            Ver Bitácora <ArrowRight size={10} className="text-white ml-2" />
          </button>
        </div>
      </div>

      {/* Card 2: Control de Tránsito (EMERALD) */}
      <div
        onClick={(): void => onPanelChange('DISPATCH')}
        className={`glass-card-pro archon-instrument-tile cursor-pointer transition-all duration-500 ${
          activePanel === 'DISPATCH'
            ? 'border-2 border-emerald-500 shadow-lg'
            : 'card-hover-emerald opacity-80 hover:opacity-100'
        }`}
        style={{ borderTop: '4px solid #10b981' }}
      >
        <div className="flex items-center justify-center gap-3 mb-4 w-full">
          <MapPin size={20} className="text-emerald-500" />
          <span className="text-instrument-header text-[#0f2a44] opacity-80 uppercase tracking-widest">
            Control de Tránsito
          </span>
        </div>

        <div className="archon-tile-payload space-y-8 pb-16">
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '4px',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid rgba(16, 185, 129, 0.4)',
            }}
          >
            <MapPin size={40} className="text-emerald-500" />
          </div>
          <div className="flex flex-col items-center space-y-1 mb-12">
            <h3 className="text-[#0f2a44] font-black uppercase tracking-[0.15em] text-[14px]">
              Asignación de Ruta
            </h3>
            <p className="text-[10px] font-bold opacity-60 uppercase tracking-[0.2em] text-[#0f2a44]">
              Nueva Asignación
            </p>
          </div>
        </div>

        <div className="archon-tile-action">
          <button
            onClick={(e): void => {
              e.stopPropagation();
              if (onAction) onAction('DESPACHO');
              onPanelChange('DISPATCH');
            }}
            className={`btn-sentinel-emerald w-full ${
              activePanel === 'DISPATCH' ? 'bg-emerald-600 text-white' : ''
            }`}
          >
            Iniciar <ArrowRight size={10} className="text-white ml-2" />
          </button>
        </div>
      </div>
    </div>
  </div>
);

export default RouteManagementCards;
