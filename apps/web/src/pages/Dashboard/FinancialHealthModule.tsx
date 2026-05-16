import React, { useState, useEffect } from 'react';
import { TrendingUp, ArrowUpRight, DollarSign, BarChart3, Wallet } from 'lucide-react';
import { useFleet } from '../../context/FleetContext';
import { useSovereignLayout } from '../../context/SovereignLayoutContext';
import { FleetUnit } from '../../types/fleet';

export type FinancialPanel = 'AUDIT' | 'OPTIMIZATION';

/**
 * 🔱 Archon Module: FinancialHealthModule
 * Implementation: Sovereign Industrial Intelligence (V.78.100.101)
 * Architecture: Hardened Chassis & Single Mutating Header Card.
 * Refactor: Unified Workspace Chassis (Mirror FleetModule DNA).
 */
const FinancialHealthModule: React.FC = (): React.ReactElement => {
  const { units, stats, loading } = useFleet();
  const { setSectionData } = useSovereignLayout();
  const [activePanel, setActivePanel] = useState<FinancialPanel>('AUDIT');
  const panelRef = React.useRef<HTMLDivElement>(null);

  const handlePanelChange = (panel: FinancialPanel): void => {
    setActivePanel(panel);
    if (panelRef.current?.scrollIntoView) {
      setTimeout((): void => {
        panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  };

  // 🚀 SYNC SOVEREIGN INFRASTRUCTURE
  useEffect(() => {
    const isOptimization = activePanel === 'OPTIMIZATION';

    setSectionData(
      'Salud Financiera',
      'Inteligencia Económica y Control de Costos Operativos',
      null,
      {
        variant: isOptimization ? 'emerald' : 'navy',
        headerTitle: isOptimization ? 'Optimización ROI' : 'Auditoría de Costos',
        HeaderIcon: isOptimization ? TrendingUp : BarChart3,
        PayloadIcon: isOptimization ? Wallet : DollarSign,
        actionTitle: isOptimization ? 'Eficiencia' : 'Análisis',
        description: isOptimization ? 'Proyección de Ahorro' : 'Control de Egresos',
        buttonText: isOptimization ? 'Analizar ROI' : 'Ver Auditoría',
        isActive: isOptimization,
        onClick: () => handlePanelChange(isOptimization ? 'AUDIT' : 'OPTIMIZATION'),
      }
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
      <div className="card-archon-sovereign animate-in fade-in duration-700 flex flex-col h-full min-h-[360px] w-full">
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
    <div className="animate-in fade-in duration-700">
      {/* 📊 BODY MODULAR */}
      <section className="archon-workspace-chassis">
        {/* 🔱 AXIAL SYNC CONTAINER */}
        <div className="archon-axial-container">
          <div ref={panelRef}>
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000">
              {/* 🔱 GRID 2XN: HARDENED SYMMETRY */}
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
                    <div className="card-archon-sovereign border-dashed border-2 border-slate-200 flex flex-col items-center justify-center text-center p-12 min-h-[360px] w-full">
                      <h3 className="text-pinnacle-navy text-lg font-black tracking-tight mb-2 uppercase">
                        Auditoría de Egresos lista-
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
                    <div className="card-archon-sovereign border-dashed border-2 border-slate-200 flex flex-col items-center justify-center text-center p-12 min-h-[360px] w-full">
                      <h3 className="text-pinnacle-navy text-lg font-black tracking-tight mb-2 uppercase">
                        Motor de ROI listo-
                      </h3>
                      <p className="text-pinnacle-navy/40 text-[10px] font-bold uppercase tracking-widest">
                        Calculando proyecciones de ahorro...
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default FinancialHealthModule;
