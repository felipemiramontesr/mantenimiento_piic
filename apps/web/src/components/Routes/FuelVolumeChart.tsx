import React from 'react';
import { motion } from 'framer-motion';

/**
 * 🔱 Archon Component: FuelVolumeChart
 * Implementation: Sovereign Circular Volumetric Gauge (v.3.5.0)
 *
 * DESIGN RATIONALE:
 * - Scale: Fixed w-20 (80px) to prevent layout overlap in high-density dashboards.
 * - Geometry: Radius 40 inside 100x100 viewBox provides a 10-unit safety margin,
 *   preventing SVG clipping (clipping) in high-DPI displays.
 * - Precision: Real-time liter calculation based on unit capacity.
 */
interface FuelVolumeChartProps {
  /** 0-100 percentage value representing the current load state */
  currentLevel: number;
  /** Total nominal capacity of the tank in Liters */
  totalCapacity: number;
  /** Contextual status color (Sovereign Semantic Palette) */
  color: string;
}

const FuelVolumeChart: React.FC<FuelVolumeChartProps> = ({
  currentLevel,
  totalCapacity,
  color,
}) => {
  /**
   * Volumetric Logic:
   * Translates percentage into absolute forensic liters.
   */
  const currentLiters = Number(((currentLevel / 100) * totalCapacity).toFixed(1));
  const remainingLiters = Number((totalCapacity - currentLiters).toFixed(1));

  // SVG Pie/Donut Calculation - Calibrated for w-20 (No overlap)
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (currentLevel / 100) * circumference;

  return (
    <div className="flex flex-col gap-4 bg-white/40 p-2 rounded-[4px] border border-[#0f2a44]/5 relative overflow-hidden">
      <div className="flex items-center justify-between gap-8">
        {/* 🥧 CIRCULAR PIE CHART (SVG) - REFINED SCALE */}
        <div className="relative flex items-center justify-center w-16 h-16 shrink-0">
          <svg width="64" height="64" className="-rotate-90" viewBox="0 0 100 100">
            {/* Background Track */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="transparent"
              stroke="#0f2a44"
              strokeWidth="8"
              strokeOpacity="0.1"
            />
            {/* Progress Segment (Motion Restored) */}
            <motion.circle
              cx="50"
              cy="50"
              r={radius}
              fill="transparent"
              stroke={color}
              strokeWidth="8"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 1.5, ease: 'easeOut' }}
              strokeLinecap="round"
            />
          </svg>

          {/* CENTER METRIC (FLOATING) */}
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
            <span className="text-lg font-black text-[#0f2a44] leading-none tracking-tighter">
              {currentLiters}
            </span>
            <span className="text-[6px] font-black opacity-40 text-[#0f2a44] uppercase tracking-widest">
              Litros
            </span>
          </div>
        </div>

        {/* 📋 ANALYTICAL LEGEND (SIDE-ALIGNED) */}
        <div className="flex flex-col justify-center gap-3 flex-1">
          <div className="space-y-1">
            <p className="text-[8px] font-black opacity-30 text-[#0f2a44] uppercase tracking-widest">
              Estado de Carga
            </p>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-black text-[#0f2a44]">{currentLevel}%</span>
              <span className="text-[8px] font-bold opacity-40 text-[#0f2a44]">VOL</span>
            </div>
          </div>

          <div className="h-px bg-[#0f2a44]/10 w-full" />

          <div className="grid grid-cols-1 gap-1.5">
            <div className="flex items-center justify-between text-[10px]">
              <span className="font-bold opacity-50 text-[#0f2a44]">Total Tanque:</span>
              <span className="font-black text-[#0f2a44]">{totalCapacity}L</span>
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="font-bold opacity-50 text-[#0f2a44]">Espacio Libre:</span>
              <span className="font-black text-rose-500">-{remainingLiters}L</span>
            </div>
          </div>
        </div>
      </div>

      {/* 📏 LINEAR PROGRESS (COMPLEMENTARY) */}
      <div className="w-full h-1 bg-[#0f2a44]/5 rounded-full overflow-hidden">
        <motion.div
          className="h-full"
          initial={{ width: 0 }}
          animate={{ width: `${currentLevel}%` }}
          style={{ backgroundColor: color }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
};

export default FuelVolumeChart;
