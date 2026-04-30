import React, { useState } from 'react';
import { Wallet, TrendingUp, ArrowUpRight, DollarSign } from 'lucide-react';
import { BRANDING_NAME, SYSTEM_VERSION } from '../../constants/versionConstants';
import { useFleet } from '../../context/FleetContext';
import { FleetUnit } from '../../types/fleet';
import FinancialManagementCards, {
  FinancialPanel,
} from '../../components/Financial/FinancialManagementCards';

/**
 * 🔱 Archon Module: Financial Health
 * Implementation: Strictly Aligned with Sovereign UI Standard
 * Structure: Header | Body (Chassis) | Footer
 */
const FinancialHealthModule: React.FC = (): React.ReactElement => {
  const { units, stats, loading } = useFleet();
  const [activePanel, setActivePanel] = useState<FinancialPanel>('AUDIT');

  // 🔱 Financial Intelligence Engine
  const totalMonthlyLease = units.reduce(
    (acc: number, u: FleetUnit): number => acc + (u.monthlyLeasePayment || 0),
    0
  );
  const efficiency = stats.maintenanceIndex; // % of units ready for operation

  const handlePanelChange = (panel: FinancialPanel): void => {
    setActivePanel(panel);
  };

  const renderFinancialKPI = (
    label: string,
    value: string,
    Icon: React.ElementType,
    color: string,
    description: string,
    variant: 'navy' | 'emerald' | 'yellow' | 'sky'
  ): React.ReactElement => (
    <div
      className={`glass-card-pro archon-instrument-tile card-hover-${variant} animate-in fade-in duration-500`}
      style={{ borderTop: `4px solid ${color}` }}
    >
      <div className="flex items-center justify-center gap-3 mb-5 w-full">
        <Icon size={24} style={{ color }} />
        <span className="text-instrument-header text-[#0f2a44] opacity-90">{label}</span>
      </div>

      <div className="archon-tile-payload flex flex-col items-center justify-center pb-6">
        {loading ? (
          <div className="archon-shimmer h-12 w-full rounded" />
        ) : (
          <div className="flex flex-col items-center justify-center text-center w-full space-y-2">
            <h3 className="text-kpi-black text-[#0f2a44] text-center w-full">{value}</h3>
            <p className="text-[12px] font-bold opacity-60 uppercase tracking-[0.2em] text-[#0f2a44] text-center w-full">
              {description}
            </p>
          </div>
        )}
      </div>

      <div className="archon-tile-action">
        <button
          className={`btn-sentinel-${variant} w-full text-[11px] font-black py-3 uppercase tracking-widest`}
        >
          Analizar Flujo <ArrowUpRight size={12} className="ml-2" />
        </button>
      </div>
    </div>
  );

  return (
    <main className="workspace-container-pro animate-in fade-in duration-700">
      {/* 🔱 HEADER: SOVEREIGN STANDARD */}
      <header className="workspace-header-pro">
        <div className="flex flex-row items-center justify-between w-full">
          <div className="flex flex-col items-start">
            <div className="flex flex-row items-center gap-3 mb-2">
              <Wallet size={28} className="text-[#f2b705]" />
              <h2 className="text-[#0f2a44] tracking-tighter font-black text-2xl m-0 p-0 leading-none">
                Salud Financiera
              </h2>
            </div>
            <p className="text-[#0f2a44] text-[10px] font-bold uppercase tracking-[0.2em] opacity-60">
              Inteligencia Económica y Control de Costos Operativos
            </p>
          </div>

          <div className="flex items-center gap-6 relative">
            <h1 className="text-[26px] font-black tracking-tighter m-0 text-[#0f2a44] font-['Inter']">
              Archon
            </h1>
            <div className="w-[44px] h-[44px] rounded-[4px] border-2 border-[#f2b705] bg-[#0f2a44] flex items-center justify-center">
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

      {/* 🔱 BODY: ARCHON CHASSIS */}
      <section className="archon-workspace-chassis">
        <div className="archon-axial-container flex flex-col gap-12">
          <FinancialManagementCards activePanel={activePanel} onPanelChange={handlePanelChange} />

          <div className="archon-grid-2">
            {activePanel === 'AUDIT' && (
              <>
                {renderFinancialKPI(
                  'Compromiso de Arrendamiento',
                  `$${totalMonthlyLease.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
                  DollarSign,
                  '#0f2a44',
                  'Pago mensual acumulado (Leasing)',
                  'navy'
                )}
                <div className="glass-card-pro bg-white p-12 border-dashed border-2 border-slate-200 flex flex-col items-center justify-center text-center animate-in fade-in duration-1000">
                  <h3 className="text-[#0f2a44] text-lg font-black tracking-tight mb-2">
                    Auditoría de Egresos lista-
                  </h3>
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                    Sincronizando con base de datos maestra...
                  </p>
                </div>
              </>
            )}
            {activePanel === 'OPTIMIZATION' && (
              <>
                {renderFinancialKPI(
                  'Eficiencia de Activos',
                  `${efficiency}%`,
                  TrendingUp,
                  '#10b981',
                  'Retorno operativo por unidad lista',
                  'emerald'
                )}
                <div className="glass-card-pro bg-white p-12 border-dashed border-2 border-slate-200 flex flex-col items-center justify-center text-center animate-in fade-in duration-1000">
                  <h3 className="text-[#0f2a44] text-lg font-black tracking-tight mb-2">
                    Motor de ROI listo-
                  </h3>
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                    Calculando proyecciones de ahorro...
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* 🔱 FOOTER: SYSTEM STANDARDIZATION */}
      <footer className="workspace-footer-pro">
        <p>© Todos los derechos reservados por ArchonCore by Dreamtek.</p>
        <p className="text-[#0f2a44]">
          {BRANDING_NAME} {SYSTEM_VERSION}
        </p>
      </footer>
    </main>
  );
};

export default FinancialHealthModule;
