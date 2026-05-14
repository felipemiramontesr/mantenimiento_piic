import React from 'react';

/**
 * 🔱 Archon Component: ArchonLogo
 * Implementation: Sovereign Brand Identity (V.78.100.91)
 * Objective: High-precision SVG orchestration.
 * Refactor: 100% Pure Tailwind Atomic Architecture (Mirror DNA).
 */

interface ArchonLogoProps {
  isCollapsed: boolean;
  size?: number;
}

const ArchonLogo: React.FC<ArchonLogoProps> = ({ isCollapsed, size = 44 }) => (
  <div
    className={`
      flex items-center transition-all duration-300
      ${isCollapsed ? 'justify-center gap-0' : 'justify-start gap-[5.3px]'}
    `}
  >
    {/* ⬢ Outline Hexagon Icon */}
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
    >
      <path
        d="M50 8L86.5 29V71L50 92L13.5 71V29L50 8Z"
        className="stroke-pinnacle-yellow"
        strokeWidth="16"
        fill="none"
      />
    </svg>

    {/* 🖋️ Brand Text ArchonCore⬢ */}
    {!isCollapsed && (
      <div className="flex items-baseline">
        <h1 className="text-[26px] font-black m-0 tracking-tight flex items-baseline font-sans">
          <span className="text-pinnacle-yellow">Archon</span>
          <span className="text-white">Core</span>
        </h1>
        {/* 💠 Hexagonal Terminal Point */}
        <svg
          width="15"
          height="15"
          viewBox="0 0 100 100"
          className="ml-1 self-baseline translate-y-[3px]"
        >
          <path
            d="M50 5L89.5 27.5V72.5L50 95L10.5 72.5V27.5L50 5Z"
            className="fill-pinnacle-yellow"
          />
        </svg>
      </div>
    )}
  </div>
);

export default ArchonLogo;
