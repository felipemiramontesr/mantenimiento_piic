import React from 'react';

/**
 * 🔱 Archon Component: FuelVolumeChart
 * Implementation: Dynamic Volumetric Visualization
 * Purpose: Real-time calculation of liters vs total capacity
 */

interface FuelVolumeChartProps {
  currentLevel: number; // 0-100
  totalCapacity: number; // Liters
  color: string;
}

const FuelVolumeChart: React.FC<FuelVolumeChartProps> = ({
  currentLevel,
  totalCapacity,
  color,
}) => {
  const currentLiters = Number(((currentLevel / 100) * totalCapacity).toFixed(1));
  const remainingLiters = Number((totalCapacity - currentLiters).toFixed(1));

  // SVG Donut Calculation
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (currentLevel / 100) * circumference;

  return (
    <div className="flex items-center gap-8 bg-white/40 p-4 rounded-[4px] border border-[#0f2a44]/5">
      <div className="relative flex items-center justify-center w-24 h-24">
        {/* SVG DONUT CHART */}
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          {/* Background Circle */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="transparent"
            stroke="#0f2a44"
            strokeWidth="8"
            className="opacity-[0.05]"
          />
          {/* Progress Circle */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="transparent"
            stroke={color}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="butt"
            className="transition-all duration-1000 ease-out"
          />
        </svg>

        {/* CENTER TEXT */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-black text-[#0f2a44] leading-none">{currentLiters}</span>
          <span className="text-[8px] font-bold opacity-40 text-[#0f2a44] uppercase tracking-tighter">
            Litros
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-3 flex-1">
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase tracking-widest opacity-40 text-[#0f2a44]">
              Volumen Actual
            </span>
            <span className="text-[10px] font-bold text-[#0f2a44]">{currentLevel}%</span>
          </div>
          <div className="h-1.5 w-full bg-[#0f2a44]/5 rounded-full overflow-hidden">
            <div
              className="h-full transition-all duration-1000"
              style={{ width: `${currentLevel}%`, backgroundColor: color }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col">
            <span className="text-[8px] font-bold opacity-30 text-[#0f2a44] uppercase">
              Capacidad Total
            </span>
            <span className="text-xs font-black text-[#0f2a44]">{totalCapacity}L</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[8px] font-bold opacity-30 text-[#0f2a44] uppercase">
              Diferencial
            </span>
            <span className="text-xs font-black text-rose-500">-{remainingLiters}L</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FuelVolumeChart;
