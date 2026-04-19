import React from 'react';
import { Activity, ShieldCheck, Zap, Layers } from 'lucide-react';

interface FleetKPIMatrixProps {
  availability: number;
  mtbf: number;
  mttr: number;
  backlog: number;
}

/**
 * 🔱 Archon Component: FleetKPIMatrix
 * Implementation: High-Density Analytical Cluster (v.20.0.0)
 * Aesthetic: 4-Axis Sovereign Metrics
 */
const FleetKpiMatrix: React.FC<FleetKPIMatrixProps> = ({
  availability = 100,
  mtbf = 0,
  mttr = 0,
  backlog = 0,
}: FleetKPIMatrixProps): React.JSX.Element => {
  // 🎨 COLOR ENGINE (Sovereign Thresholds)
  const getAvaColor = (val: number): string => {
    if (val >= 95) return 'text-emerald-500';
    if (val >= 85) return 'text-amber-500';
    return 'text-rose-500';
  };

  const getRelColor = (val: number): string => {
    if (val >= 100) return 'text-emerald-500';
    if (val >= 50) return 'text-amber-500';
    return 'text-rose-500';
  };

  const getSpdColor = (val: number): string => {
    if (val <= 4) return 'text-emerald-500';
    if (val <= 12) return 'text-amber-500';
    return 'text-rose-500';
  };

  const getBckColor = (val: number): string => {
    if (val <= 2) return 'text-emerald-500';
    if (val <= 5) return 'text-amber-500';
    return 'text-rose-500';
  };

  return (
    <div className="grid grid-cols-2 gap-1.5 w-[160px] p-2 bg-gray-50/50 rounded-lg border border-gray-100 group-hover:border-[#0f2a44]/20 transition-all duration-300">
      {/* 🚀 AVA - Disponibilidad */}
      <div className="flex flex-col items-start gap-0.5 p-1">
        <div className="flex items-center gap-1 opacity-40">
          <Activity size={10} />
          <span className="text-[8px] font-black uppercase tracking-tighter">AVA</span>
        </div>
        <span className={`text-[10px] font-bold ${getAvaColor(availability)}`}>
          {availability.toFixed(1)}%
        </span>
      </div>

      {/* 🛡️ REL - Fiabilidad (MTBF) */}
      <div className="flex flex-col items-start gap-0.5 p-1 border-l border-gray-100">
        <div className="flex items-center gap-1 opacity-40">
          <ShieldCheck size={10} />
          <span className="text-[8px] font-black uppercase tracking-tighter">REL</span>
        </div>
        <span className={`text-[10px] font-bold ${getRelColor(mtbf)}`}>{mtbf}h</span>
      </div>

      {/* ⚡ SPD - Velocidad (MTTR) */}
      <div className="flex flex-col items-start gap-0.5 p-1 border-t border-gray-100">
        <div className="flex items-center gap-1 opacity-40">
          <Zap size={10} />
          <span className="text-[8px] font-black uppercase tracking-tighter">SPD</span>
        </div>
        <span className={`text-[10px] font-bold ${getSpdColor(mttr)}`}>{mttr}h</span>
      </div>

      {/* 📚 BCK - Pendientes (Backlog) */}
      <div className="flex flex-col items-start gap-0.5 p-1 border-t border-l border-gray-100">
        <div className="flex items-center gap-1 opacity-40">
          <Layers size={10} />
          <span className="text-[8px] font-black uppercase tracking-tighter">BCK</span>
        </div>
        <span className={`text-[10px] font-bold ${getBckColor(backlog)}`}>{backlog}</span>
      </div>
    </div>
  );
};

export default FleetKpiMatrix;
