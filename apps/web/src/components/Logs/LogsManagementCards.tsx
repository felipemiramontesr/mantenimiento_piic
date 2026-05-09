import React from 'react';
import { Database, AlertTriangle, ArrowRight, ShieldCheck, Flame } from 'lucide-react';

export type LogsPanel = 'FORENSIC' | 'INCIDENTS';

interface LogsManagementCardsProps {
  activePanel: LogsPanel;
  onPanelChange: (panel: LogsPanel) => void;
}

const LogsManagementCards: React.FC<LogsManagementCardsProps> = ({
  activePanel,
  onPanelChange,
}) => (
  <div className="archon-central-axis animate-in fade-in slide-in-from-top-4 duration-700">
    <div className="archon-grid-2 gap-8 mb-8">
      {/* Card 1: Bitácora Forense (NAVY) */}
      <div
        onClick={(): void => onPanelChange('FORENSIC')}
        className={`glass-card-pro archon-instrument-tile cursor-pointer transition-all duration-500 ${
          activePanel === 'FORENSIC'
            ? 'border-2 border-[#0f2a44] shadow-lg'
            : 'card-hover-navy opacity-80 hover:opacity-100'
        }`}
        style={{ borderTop: '4px solid #0f2a44' }}
      >
        <div className="flex items-center justify-center gap-3 mb-4 w-full">
          <ShieldCheck size={20} className="text-[#0f2a44]" />
          <span className="text-instrument-header text-[#0f2a44] opacity-80 uppercase tracking-widest">
            Auditoría del Sistema
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
            <Database size={40} className="text-[#0f2a44]" />
          </div>
          <div className="flex flex-col items-center space-y-1 mb-12">
            <h3 className="text-[#0f2a44] font-black uppercase tracking-[0.15em] text-[14px]">
              Bitácora Forense
            </h3>
            <p className="text-[10px] font-bold opacity-60 uppercase tracking-[0.2em] text-[#0f2a44]">
              Trazabilidad de Eventos
            </p>
          </div>
        </div>

        <div className="archon-tile-action">
          <button
            data-testid="logs-forensic-btn"
            className={`btn-sentinel-navy w-full ${
              activePanel === 'FORENSIC' ? 'bg-[#0f2a44] text-white' : ''
            }`}
          >
            Ver Bitácora <ArrowRight size={10} className="text-white ml-2" />
          </button>
        </div>
      </div>

      {/* Card 2: Bitácora de Incidencias (RED) */}
      <div
        onClick={(): void => onPanelChange('INCIDENTS')}
        className={`glass-card-pro archon-instrument-tile cursor-pointer transition-all duration-500 ${
          activePanel === 'INCIDENTS'
            ? 'border-2 border-red-500 shadow-lg'
            : 'hover:opacity-100 opacity-80'
        }`}
        style={{ borderTop: '4px solid #ef4444' }}
      >
        <div className="flex items-center justify-center gap-3 mb-4 w-full">
          <Flame size={20} className="text-red-500" />
          <span className="text-instrument-header text-red-500 opacity-80 uppercase tracking-widest">
            Monitoreo Crítico
          </span>
        </div>

        <div className="archon-tile-payload space-y-8 pb-16">
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '4px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid rgba(239, 68, 68, 0.4)',
            }}
          >
            <AlertTriangle size={40} className="text-red-500" />
          </div>
          <div className="flex flex-col items-center space-y-1 mb-12">
            <h3 className="text-[#0f2a44] font-black uppercase tracking-[0.15em] text-[14px]">
              Bitácora de Incidencias
            </h3>
            <p className="text-[10px] font-bold opacity-60 uppercase tracking-[0.2em] text-[#0f2a44]">
              Reporte de Anomalías
            </p>
          </div>
        </div>

        <div className="archon-tile-action">
          <button
            data-testid="logs-incidents-btn"
            className={`btn-sentinel-red w-full ${
              activePanel === 'INCIDENTS' ? 'bg-[#ef4444] text-white' : ''
            }`}
          >
            Ver Incidencias <ArrowRight size={10} className="text-white ml-2" />
          </button>
        </div>
      </div>
    </div>
  </div>
);

export default LogsManagementCards;
