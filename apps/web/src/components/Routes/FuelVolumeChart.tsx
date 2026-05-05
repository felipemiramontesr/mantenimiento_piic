import React from 'react';
import { motion } from 'framer-motion';

/**
 * 🔱 Archon Component: FuelVolumeChart
 * Implementation: Circular Volumetric Pie Chart (Rectified v.3.0.0)
 * Purpose: Real-time visualization of liters with zero-overlap layout
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

  // SVG Pie/Donut Calculation - Diagnostic/Cache-Buster Mode
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (currentLevel / 100) * circumference;
  const cacheBuster = `svg-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className="flex flex-col gap-4 bg-white/40 p-4 rounded-[4px] border border-[#0f2a44]/5 relative overflow-hidden">
      <div className="flex items-center justify-between gap-6">
        {/* 🥧 CIRCULAR PIE CHART (SVG) - DIAGNOSTIC MODE */}
        <div className="relative flex items-center justify-center w-24 h-24 shrink-0 z-10">
          <svg
            id={cacheBuster}
            width="96"
            height="96"
            className="-rotate-90 block"
            viewBox="0 0 100 100"
            style={{ minWidth: '96px', minHeight: '96px', display: 'block' }}
          >
            {/* Background Track (Diagnostic Solid) */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="transparent"
              stroke="#0f2a44"
              strokeWidth="8"
              strokeOpacity="0.2"
              style={{ stroke: '#0f2a44', strokeOpacity: 0.2 }}
            />
            {/* Progress Segment (Diagnostic Native Circle) */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="transparent"
              stroke={color}
              strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              style={{
                stroke: color,
                transition: 'stroke-dashoffset 1.5s ease-out',
                strokeLinecap: 'round',
              }}
            />
          </svg>

          {/* CENTER METRIC (FLOATING) */}
          <div className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none">
            <span className="text-xl font-black text-[#0f2a44] leading-none tracking-tighter">
              {currentLiters}
            </span>
            <span className="text-[7px] font-black opacity-40 text-[#0f2a44] uppercase tracking-widest">
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
