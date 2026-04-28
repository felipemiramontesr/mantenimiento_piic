import React from 'react';
import { Activity, ShieldCheck, Zap, Layers } from 'lucide-react';

interface FleetKPIMatrixProps {
  availability: number;
  mtbf: number;
  mttr: number;
  backlog: number;
  healthScore?: number;
}

/**
 * 🔱 Archon Component: FleetKPIMatrix
 * Implementation: High-Density Analytical Cluster (v.39.7.0)
 * Aesthetic: 4-Axis Sovereign Metrics + Health Index
 */
const FleetKpiMatrix: React.FC<FleetKPIMatrixProps> = (
  props: FleetKPIMatrixProps
): React.JSX.Element => {
  // 🛡️ Reactive Normalization (v.21.0.1)
  const availability = Number(props.availability ?? 100);
  const mtbf = Number(props.mtbf ?? 0);
  const mttr = Number(props.mttr ?? 0);
  const backlog = Number(props.backlog ?? 0);
  const healthScore = props.healthScore ?? 100;

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

  const getHealthColor = (val: number): string => {
    if (val >= 80) return 'bg-emerald-500';
    if (val >= 50) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  return (
    <div className="flex flex-col gap-2 w-[160px]">
      <div className="grid grid-cols-2 gap-1.5 p-2 bg-gray-50/50 rounded-[4px] border border-slate-100 transition-all duration-300">
        {/* 🚀 DISP - Disponibilidad */}
        <div className="flex flex-col items-center gap-0.5 p-1">
          <div className="flex items-center gap-1 opacity-40">
            <Activity size={10} />
            <span className="text-[8px] font-black uppercase tracking-tighter">DISP</span>
          </div>
          <span className={`text-[10px] font-bold text-center ${getAvaColor(availability)}`}>
            {availability.toFixed(1)}%
          </span>
        </div>

        {/* 🛡️ MTBF - Fiabilidad */}
        <div className="flex flex-col items-center gap-0.5 p-1">
          <div className="flex items-center gap-1 opacity-40">
            <ShieldCheck size={10} />
            <span className="text-[8px] font-black uppercase tracking-tighter">MTBF</span>
          </div>
          <span className={`text-[10px] font-bold text-center ${getRelColor(mtbf)}`}>{mtbf}h</span>
        </div>

        {/* ⚡ MTTR - Velocidad de Respuesta */}
        <div className="flex flex-col items-center gap-0.5 p-1">
          <div className="flex items-center gap-1 opacity-40">
            <Zap size={10} />
            <span className="text-[8px] font-black uppercase tracking-tighter">MTTR</span>
          </div>
          <span className={`text-[10px] font-bold text-center ${getSpdColor(mttr)}`}>{mttr}h</span>
        </div>

        {/* 📚 BCK - Pendientes (Backlog) */}
        <div className="flex flex-col items-center gap-0.5 p-1">
          <div className="flex items-center gap-1 opacity-40">
            <Layers size={10} />
            <span className="text-[8px] font-black uppercase tracking-tighter">BCK</span>
          </div>
          <span className={`text-[10px] font-bold text-center ${getBckColor(backlog)}`}>
            {backlog}
          </span>
        </div>
      </div>

      {/* 🔱 Archon Health Index Bar */}
      <div className="space-y-1">
        <div className="flex justify-between items-center px-1">
          <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">
            Health Index
          </span>
          <span className="text-[8px] font-black text-slate-600">{healthScore}%</span>
        </div>
        <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-1000 ${getHealthColor(healthScore)}`}
            style={{ width: `${healthScore}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default FleetKpiMatrix;
