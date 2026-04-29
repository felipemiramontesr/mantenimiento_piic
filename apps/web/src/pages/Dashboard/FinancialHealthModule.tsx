import React from 'react';
import { Wallet, TrendingUp, ArrowUpRight, Landmark, DollarSign, PieChart } from 'lucide-react';
import { BRANDING_NAME, SYSTEM_VERSION } from '../../constants/versionConstants';
import { useFleet } from '../../context/FleetContext';

/**
 * 🔱 Archon Module: Financial Health
 * Implementation: Strictly Aligned with Sovereign UI Standard
 * Structure: Header | Body (Chassis) | Footer
 */
const FinancialHealthModule: React.FC = () => {
  const { units, stats, loading } = useFleet();

  // 🔱 Financial Intelligence Engine
  const totalMonthlyLease = units.reduce((acc, u) => acc + (u.monthlyLeasePayment || 0), 0);
  const efficiency = stats.maintenanceIndex; // % of units ready for operation

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
        <div className="archon-grid-3">
          {renderFinancialKPI(
            'Compromiso de Arrendamiento',
            `$${totalMonthlyLease.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
            DollarSign,
            '#0f2a44',
            'Pago mensual acumulado (Leasing)',
            'navy'
          )}
          {renderFinancialKPI(
            'Eficiencia de Activos',
            `${efficiency}%`,
            TrendingUp,
            '#10b981',
            'Retorno operativo por unidad lista',
            'emerald'
          )}
          {renderFinancialKPI(
            'Presupuesto Maint',
            '$0.00',
            Landmark,
            '#f2b705',
            'Fondo asignado a mantenimiento (Base)',
            'yellow'
          )}

          {/* ANALYTICS PREVIEW CARD (WIDER) */}
          <div className="col-span-full glass-card-pro bg-white p-12 border-dashed border-2 border-slate-200 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 text-slate-200">
              <PieChart size={40} />
            </div>
            <h3 className="text-xl font-black text-[#0f2a44] tracking-tight mb-2">
              Motor de Análisis Financiero
            </h3>
            <p className="text-slate-400 text-sm max-w-md leading-relaxed uppercase tracking-widest font-bold text-[10px]">
              Sincronizado con 23 Activos Maestros en Tiempo Real
            </p>
            <div className="mt-8 flex gap-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="w-1.5 h-12 bg-slate-100 rounded-full animate-pulse"
                  style={{ animationDelay: `${i * 0.1}s` }}
                />
              ))}
            </div>
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
