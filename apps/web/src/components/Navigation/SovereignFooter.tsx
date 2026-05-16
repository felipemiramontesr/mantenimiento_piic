import React from 'react';
import { ArchonDoctor } from '../../ArchonDoctor';
import ArchonLogo from '../Logo/ArchonLogo';

/**
 * 🔱 Archon Component: SovereignFooter
 * Implementation: Global System Branding & Legal Metadata (V.78.100.94)
 * Objective: High-performance 10% vertical chassis for system metadata.
 * Refactor: 100% Pure Tailwind Atomic Architecture (Mirror DNA).
 */

const SovereignFooter: React.FC = () => (
  <footer className="h-[10%] min-h-[60px] flex items-center justify-between w-full border-t border-pinnacle-navy/5 px-[60px] bg-white shrink-0">
    {/* ⚖️ Legal Metadata (Col Alfa) */}
    <div className="flex-1 text-[10px] font-bold uppercase tracking-widest text-pinnacle-navy opacity-40 text-left whitespace-nowrap">
      © Copyright ArchonCore by Dreamtek Versión V.78.100.154
    </div>

    {/* 🔱 Forensic Bridge (Col Gamma) */}
    <div className="flex-1 flex justify-center">
      <ArchonDoctor />
    </div>

    {/* 🏗️ System Versioning (Col Beta) */}
    <div className="flex-1 flex justify-end">
      <div className="bg-pinnacle-navy rounded-[4px] px-3 py-1.5 shadow-sm scale-[0.67] origin-right">
        <ArchonLogo isCollapsed={false} size={14} />
      </div>
    </div>
  </footer>
);

export default SovereignFooter;
