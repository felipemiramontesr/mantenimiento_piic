import React from 'react';
import { useSovereignLayout } from '../../context/SovereignLayoutContext';

/**
 * 🔱 Archon Component: SovereignSubheader
 * Implementation: Local Section Navigation & Actions (V.78.100.100)
 * Objective: Slot for internal section cards, view switchers, and filters.
 * Refactor: Block-level container to prevent flex-squashing of children.
 */

const SovereignSubheader: React.FC = () => {
  const { layoutData } = useSovereignLayout();

  if (!layoutData.subheaderActions) {
    return <div className="w-full h-0 overflow-hidden" />;
  }

  return (
    <div className="sovereign-subheader animate-in fade-in duration-500 px-10 py-2 bg-white/50 backdrop-blur-md border-b border-pinnacle-navy/5 block w-full min-h-[64px]">
      <div className="w-full h-full">{layoutData.subheaderActions}</div>
    </div>
  );
};

export default SovereignSubheader;
