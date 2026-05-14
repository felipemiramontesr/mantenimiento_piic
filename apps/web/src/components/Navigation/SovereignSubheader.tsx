import React from 'react';
import { useSovereignLayout } from '../../context/SovereignLayoutContext';

/**
 * 🔱 Archon Component: SovereignSubheader
 * Implementation: Local Section Navigation & Actions (V.78.100.89)
 * Objective: Slot for internal section cards, view switchers, and filters.
 * Refactor: 100% Pure Tailwind Atomic Architecture.
 */

const SovereignSubheader: React.FC = () => {
  const { layoutData } = useSovereignLayout();

  if (!layoutData.subheaderActions) return null;

  return (
    <div className="sovereign-subheader animate-in fade-in duration-500 px-10 py-4 bg-white/50 backdrop-blur-md border-b border-pinnacle-navy/5 flex items-center min-h-[64px]">
      <div className="w-full">{layoutData.subheaderActions}</div>
    </div>
  );
};

export default SovereignSubheader;
