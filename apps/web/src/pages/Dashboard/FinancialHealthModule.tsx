import React, { useState, useEffect } from 'react';
import { TrendingUp, ArrowUpRight, DollarSign } from 'lucide-react';
import { useFleet } from '../../context/FleetContext';
import { useSovereignLayout } from '../../context/SovereignLayoutContext';
import { FleetUnit } from '../../types/fleet';
import FinancialManagementCards, {
  FinancialPanel,
} from '../../components/Financial/FinancialManagementCards';

/**
 * 🔱 Archon Module: FinancialHealthModule
 * Implementation: Sovereign Industrial Intelligence (V.78.100.98)
 * Architecture: Forced Axial Symmetry & Zero-CSS-Debt.
 * Refactor: 100% Atomic Tailwind (Mirror DNA).
 */
const FinancialHealthModule: React.FC = (): React.ReactElement => {
  const { units, stats, loading } = useFleet();
  const { setSectionData } = useSovereignLayout();
  const [activePanel, setActivePanel] = useState<FinancialPanel>('AUDIT');

  const handlePanelChange = (panel: FinancialPanel): void => {
    setActivePanel(panel);
  };

  // 🚀 SYNC SOVEREIGN INFRASTRUCTURE
  useEffect(() => {
    setSectionData(
      'Salud Financiera',
      'Inteligencia Económica y Control de Costos Operativos',
      <FinancialManagementCards activePanel={activePanel} onPanelChange={handlePanelChange} />
    );
  }, [setSectionData, activePanel]);

  // 🔱 Financial Intelligence Engine
  const totalMonthlyLease = units.reduce(
    (acc: number, u: FleetUnit): number => acc + Number(u.monthlyLeasePayment || 0),
    0
  );
  const efficiency = stats.maintenanceIndex;

  const renderFinancialKPI = (
    label: string,
    value: string,
    Icon: React.ElementType,
    description: string,
    variant: 'navy' | 'emerald' | 'yellow' | 'sky'
  ): React.ReactElement => {
    const variantColors = {
      navy: 'text-pinnacle-navy',
      emerald: 'text-emerald-600',
      yellow: 'text-pinnacle-yellow',
      sky: 'text-sky-600',
    };

    const variantBg = {
      navy: 'bg-pinnacle-navy/5',
      emerald: 'bg-emerald-50',
      yellow: 'bg-pinnacle-yellow/5',
      sky: 'bg-sky-50',
    };

    return (
      <div className="card-archon-sovereign animate-in fade-in duration-700 flex flex-col h-full min-h-[360px]">
        {/* 🔱 Header */}
        <div className="flex items-center gap-3 mb-6">
          <Icon size={18} className={variantColors[variant]} />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-pinnacle-navy opacity-70">
            {label}
          </span>
        </div>

        {/* 📦 Payload */}
        <div className="flex-1 flex flex-col items-center justify-center space-y-6 pb-8">
          <div
            className={`w-20 h-20 rounded-[4px] flex items-center justify-center border-2 transition-all duration-300 ${variantBg[variant]} border-pinnacle-navy/5`}
          >
            <Icon size={32} className={variantColors[variant]} />
          </div>

          <div className="flex flex-col items-center space-y-2 text-center w-full">
            {loading ? (
              <div className="h-10 w-32 bg-slate-100 animate-pulse rounded-[4px]" />
            ) : (
              <h3 className="text-3xl font-black text-pinnacle-navy tracking-tighter">{value}</h3>
            )}
            <p className="text-[10px] font-bold opacity-40 uppercase tracking-[0.2em] text-pinnacle-navy">
              {description}
            </p>
          </div>
        </div>

        {/* 🔘 Action */}
        <button
          className={`h-11 w-full flex items-center justify-center text-white font-display font-black text-[10px] uppercase tracking-widest rounded-[4px] transition-all duration-300 bg-pinnacle-navy hover:brightness-110 shadow-sm`}
        >
          <span>Analizar Flujo</span>
          <ArrowUpRight size={12} className="ml-2" />
        </button>
      </div>
    );
  };

  return (
    <div className="animate-in fade-in duration-700 w-full max-w-full">
      {/* 🔱 GRID 2XN: FORCED SYMMETRY */}
      <div className="grid grid-cols-2 gap-10 w-full">
        {activePanel === 'AUDIT' && (
          <>
            {renderFinancialKPI(
              'Compromiso de Arrendamiento',
              `$${totalMonthlyLease.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
              DollarSign,
              'Pago mensual acumulado (Leasing)',
              'navy'
            )}
            <div className="card-archon-sovereign border-dashed border-2 border-slate-200 flex flex-col items-center justify-center text-center p-12 min-h-[360px]">
              <h3 className="text-pinnacle-navy text-lg font-black tracking-tight mb-2 uppercase">
                Auditoría de Egresos
              </h3>
              <p className="text-pinnacle-navy/40 text-[10px] font-bold uppercase tracking-widest">
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
              'Retorno operativo por unidad lista',
              'emerald'
            )}
            <div className="card-archon-sovereign border-dashed border-2 border-slate-200 flex flex-col items-center justify-center text-center p-12 min-h-[360px]">
              <h3 className="text-pinnacle-navy text-lg font-black tracking-tight mb-2 uppercase">
                Motor de ROI
              </h3>
              <p className="text-pinnacle-navy/40 text-[10px] font-bold uppercase tracking-widest">
                Calculando proyecciones de ahorro...
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default FinancialHealthModule;
