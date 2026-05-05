import React from 'react';

/**
 * 🔱 Archon Component: ArchonFuelSensor
 * Implementation: Sovereign Fuel Telemetry Gauge (v.2.1.0)
 *
 * DESIGN RATIONALE:
 * - Minimalist Interface: Uses 'F' (Full) and 'E' (Empty) for cockpit-standard readability.
 * - Precision: Uses absolute positioning (%) for labels and ticks to ensure forensic
 *   alignment regardless of container width.
 */
interface ArchonFuelSensorProps {
  /** Current percentage value (0-100) */
  value: number;
  /** Callback triggered on user interaction with the gauge */
  onChange: (value: number) => void;
  /** Disables interaction for read-only mission reviews */
  disabled?: boolean;
}

const FUEL_STEPS = [
  { label: 'F', value: 100 },
  { label: '7/8', value: 87.5 },
  { label: '3/4', value: 75 },
  { label: '5/8', value: 62.5 },
  { label: '1/2', value: 50 },
  { label: '3/8', value: 37.5 },
  { label: '1/4', value: 25 },
  { label: '1/8', value: 12.5 },
  { label: '1/16', value: 6.25 },
  { label: 'E', value: 0 },
];

const ArchonFuelSensor: React.FC<ArchonFuelSensorProps> = ({ value, onChange, disabled }) => (
  <div className="w-full space-y-8 py-6 select-none relative">
    {/* 📐 GAUGE CHASSIS */}
    <div className="relative h-14 w-full">
      {/* ⛽ THE SOLID BAR (NO TEXTURE) */}
      <div
        className="absolute inset-0 rounded-[4px] shadow-inner border border-[#0f2a44]/15"
        style={{
          background:
            'linear-gradient(to right, #a855f7 0%, #ef4444 25%, #f97316 50%, #facc15 75%, #22c55e 100%)',
        }}
      >
        {/* 📍 CURRENT LEVEL INDICATOR (GLOW OVERLAY) */}
        <div
          className="absolute top-0 bottom-0 right-0 bg-[#0f2a44]/15 backdrop-blur-[1px] transition-all duration-700"
          style={{ left: `${value}%` }}
        />
      </div>

      {/* 🕹️ INTERACTIVE TICKS (ABSOLUTE POSITIONING) */}
      <div className="absolute inset-0 z-10">
        {FUEL_STEPS.map((step) => (
          <div
            key={step.value}
            className="absolute top-0 bottom-0"
            style={{ left: `${step.value}%`, transform: 'translateX(-50%)' }}
          >
            <button
              type="button"
              disabled={disabled}
              onClick={(): void => onChange(step.value)}
              className="group relative h-full w-8 flex flex-col items-center justify-center border-none bg-transparent outline-none cursor-pointer"
              title={`${step.label} (${step.value}%)`}
            >
              {/* Visual Tick */}
              <div
                className={`w-0.5 transition-all duration-300 ${
                  Math.abs(value - step.value) < 0.1
                    ? 'h-full bg-white shadow-[0_0_12px_rgba(255,255,255,1)] opacity-100'
                    : 'h-6 bg-white/40 group-hover:bg-white/70'
                }`}
                style={{ borderRadius: '1px' }}
              />
            </button>
          </div>
        ))}
      </div>
    </div>

    {/* 🏷️ LABELS (ABSOLUTE POSITIONING) */}
    <div className="relative h-4 w-full">
      {FUEL_STEPS.map((step) => (
        <div
          key={step.value}
          className="absolute top-0 flex flex-col items-center"
          style={{
            left: `${step.value}%`,
            transform: 'translateX(-50%)',
            width: '40px',
          }}
        >
          <span
            className={`text-[9px] font-black uppercase tracking-tighter transition-all duration-500 text-center ${
              Math.abs(value - step.value) < 0.1
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
