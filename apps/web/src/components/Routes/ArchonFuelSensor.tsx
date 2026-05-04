import React from 'react';

/**
 * 🔱 Archon Component: ArchonFuelSensor
 * Implementation: Sovereign Fuel Telemetry Gauge
 * Standard: Industrial precision with discrete snap points
 */

interface ArchonFuelSensorProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

const FUEL_STEPS = [
  { label: 'Full', value: 100 },
  { label: '7/8', value: 87.5 },
  { label: '3/4', value: 75 },
  { label: '5/8', value: 62.5 },
  { label: '1/2', value: 50 },
  { label: '3/8', value: 37.5 },
  { label: '1/4', value: 25 },
  { label: '1/8', value: 12.5 },
  { label: '1/16', value: 6.25 },
  { label: 'Empty', value: 0 },
];

const ArchonFuelSensor: React.FC<ArchonFuelSensorProps> = ({ value, onChange, disabled }) => (
  <div className="w-full space-y-6 py-4 select-none">
    <div className="relative h-12 w-full">
      {/* ⛽ SENSOR CHASSIS (THE BAR) */}
      <div
        className="absolute inset-0 rounded-[4px] overflow-hidden shadow-inner border border-[#0f2a44]/10"
        style={{
          background:
            'linear-gradient(to right, #a855f7 0%, #ef4444 25%, #f97316 50%, #facc15 75%, #22c55e 100%)',
        }}
      >
        {/* 📏 HORIZONTAL TEXTURE LINES (INDUSTRIAL LOOK) */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, transparent, transparent 4px, #000 4px, #000 5px)',
            backgroundSize: '100% 100%',
          }}
        />

        {/* 📐 SEGMENT DIVIDERS (VERTICAL TICKS) */}
        <div className="absolute inset-0 flex justify-between px-[1px]">
          {FUEL_STEPS.map((step) => (
            <div
              key={step.value}
              className="h-full border-r border-white/20"
              style={{ width: '1px' }}
            />
          ))}
        </div>

        {/* 📍 CURRENT LEVEL INDICATOR (GLOW) */}
        <div
          className="absolute top-0 bottom-0 right-0 bg-[#0f2a44]/20 backdrop-blur-[1px] transition-all duration-500"
          style={{ left: `${value}%` }}
        />
      </div>

      {/* 🕹️ INTERACTIVE LAYER (VISIBLE TICKS & CLICK AREAS) */}
      <div className="absolute inset-0 flex justify-between items-center z-10">
        {FUEL_STEPS.slice()
          .reverse()
          .map((step) => (
            <button
              key={step.value}
              disabled={disabled}
              onClick={(): void => onChange(step.value)}
              className={`flex-1 h-full flex flex-col items-center justify-end pb-1 group transition-all outline-none border-none bg-transparent cursor-pointer`}
              title={`${step.label} (${step.value}%)`}
            >
              {/* SNAP INDICATOR */}
              <div
                className={`w-1 transition-all duration-300 ${
                  Math.abs(value - step.value) < 1
                    ? 'h-4 bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)] scale-y-125'
                    : 'h-1.5 bg-white/40 group-hover:bg-white/60'
                }`}
                style={{ borderRadius: '1px' }}
              />
            </button>
          ))}
      </div>
    </div>

    {/* 🏷️ LABELS (HORIZONTAL ALIGNMENT) */}
    <div className="flex justify-between px-1">
      {FUEL_STEPS.slice()
        .reverse()
        .map((step) => (
          <div
            key={step.value}
            className="flex flex-col items-center"
            style={{ width: `${100 / FUEL_STEPS.length}%` }}
          >
            <span
              className={`text-[8px] font-black uppercase tracking-tighter transition-all duration-300 ${
                Math.abs(value - step.value) < 1
                  ? 'text-[#0f2a44] scale-110 opacity-100'
                  : 'text-[#0f2a44]/30 opacity-60'
              }`}
            >
              {step.label}
            </span>
          </div>
        ))}
    </div>
  </div>
);

export default ArchonFuelSensor;
