import React from 'react';
import { useSovereignLayout } from '../../context/SovereignLayoutContext';

/**
 * 🔱 Archon Component: SovereignSubheader
 * Implementation: Local Section Navigation & Actions
 * Objective: Slot for internal section cards, view switchers, and filters.
 * v.1.1.0 - Context Aware
 */

const SovereignSubheader: React.FC = () => {
  const { layoutData } = useSovereignLayout();

  if (!layoutData.subheaderActions) return null;

  return (
    <div
      className="sovereign-subheader animate-in fade-in duration-500"
      style={{
        padding: '16px 40px', // Synchronized with Workspace Header
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(15, 42, 68, 0.05)',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        minHeight: '64px',
      }}
    >
      {layoutData.subheaderActions}
    </div>
  );
};

export default SovereignSubheader;
