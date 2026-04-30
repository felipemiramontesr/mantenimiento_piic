import React from 'react';
import { BarChart3, TrendingUp, ArrowRight, DollarSign, Wallet } from 'lucide-react';

export type FinancialPanel = 'AUDIT' | 'OPTIMIZATION';

interface FinancialManagementCardsProps {
  activePanel: FinancialPanel;
  onPanelChange: (panel: FinancialPanel) => void;
}

/**
 * 🔱 ARCHON COMPONENT: FinancialManagementCards
 * Implementation: Dual-Axis Symmetry Selector (Standard)
 * Theme: Financial Health (Navy & Emerald)
 */
const FinancialManagementCards: React.FC<FinancialManagementCardsProps> = ({
  activePanel,
  onPanelChange,
}) => (
  <div className="archon-central-axis animate-in fade-in slide-in-from-top-4 duration-700">
    <div className="archon-grid-2 gap-8 mb-8">
      {/* ── CARD 01: Auditoría de Costos (NAVY) ────────────────────────── */}
      <div
        onClick={(): void => onPanelChange('AUDIT')}
        className={`glass-card-pro archon-instrument-tile cursor-pointer transition-all duration-500 ${
          activePanel === 'AUDIT'
            ? 'ring-2 ring-[#0f2a44] shadow-lg transform scale-[1.02]'
            : 'card-hover-navy opacity-80 hover:opacity-100'
        }`}
        style={{ borderTop: '4px solid #0f2a44' }}
      >
        <div className="flex items-center justify-center gap-3 mb-4 w-full">
          <BarChart3 size={20} className="text-[#0f2a44]" />
          <span className="text-instrument-header text-[#0f2a44] opacity-80 uppercase tracking-widest">
            Auditoría de Costos
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
            <DollarSign size={40} className="text-[#0f2a44]" />
          </div>
          <div className="flex flex-col items-center space-y-1 mb-12">
            <h3 className="text-[#0f2a44] font-black uppercase tracking-[0.15em] text-[14px]">
              Análisis
            </h3>
            <p className="text-[10px] font-bold opacity-60 uppercase tracking-[0.2em] text-[#0f2a44]">
              Control de Egresos & Leasing
            </p>
          </div>
        </div>

        <div className="archon-tile-action">
          <button
            className={`btn-sentinel-navy w-full ${
              activePanel === 'AUDIT' ? 'bg-[#0f2a44] text-white' : ''
            }`}
          >
            Ver Auditoría <ArrowRight size={10} className="text-white ml-2" />
          </button>
        </div>
      </div>

      {/* ── CARD 02: Optimización de ROI (EMERALD) ────────────────────── */}
      <div
        onClick={(): void => onPanelChange('OPTIMIZATION')}
        className={`glass-card-pro archon-instrument-tile cursor-pointer transition-all duration-500 ${
          activePanel === 'OPTIMIZATION'
            ? 'ring-2 ring-[#10b981] shadow-lg transform scale-[1.02]'
            : 'card-hover-emerald opacity-80 hover:opacity-100'
        }`}
        style={{ borderTop: '4px solid #10b981' }}
      >
        <div className="flex items-center justify-center gap-3 mb-4 w-full">
          <TrendingUp size={20} className="text-[#10b981]" />
          <span className="text-instrument-header text-[#0f2a44] opacity-80 uppercase tracking-widest">
            Optimización de ROI
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
            <Wallet size={40} className="text-[#10b981]" />
          </div>
          <div className="flex flex-col items-center space-y-1 mb-12">
            <h3 className="text-[#0f2a44] font-black uppercase tracking-[0.15em] text-[14px]">
              Eficiencia
            </h3>
            <p className="text-[10px] font-bold opacity-60 uppercase tracking-[0.2em] text-[#0f2a44]">
              Proyección de Ahorro & Salud
            </p>
          </div>
        </div>

        <div className="archon-tile-action">
          <button
            className={`btn-sentinel-emerald w-full ${
              activePanel === 'OPTIMIZATION' ? 'bg-[#10b981] text-white' : ''
            }`}
          >
            Analizar ROI <ArrowRight size={10} className="text-white ml-2" />
          </button>
        </div>
      </div>
    </div>
  </div>
);

export default FinancialManagementCards;
