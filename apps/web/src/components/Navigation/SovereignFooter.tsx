import React from 'react';
import { ArchonDoctor } from '../../ArchonDoctor';
import ArchonLogo from '../Logo/ArchonLogo';
import { SYSTEM_VERSION } from '../../constants/versionConstants';

/**
 * 🔱 Archon Component: SovereignFooter
 * Implementation: Global System Branding & Legal Metadata (V.78.100.94)
 * Objective: High-performance 10% vertical chassis for system metadata.
 * Refactor: 100% Pure Tailwind Atomic Architecture (Mirror DNA).
 */

const SovereignFooter: React.FC = () => (
  <footer className="h-[10%] min-h-[60px] flex items-center justify-between w-full border-t border-pinnacle-navy/5 px-4 md:px-[60px] bg-white shrink-0 pb-[env(safe-area-inset-bottom)]">
    {/* ⚖️ Legal Metadata (Col Alfa) — FC 078 F3 (P2-4): a 360px el
          nowrap + padding fijo de 60px truncaba el texto ("…VERSIÓ");
          <md envuelve y el padding se reduce. */}
    <div className="flex-1 min-w-0 text-archon-base font-bold uppercase tracking-widest text-pinnacle-navy opacity-40 text-left whitespace-normal md:whitespace-nowrap">
      © Copyright ArchonCore by Dreamtek Versión V.{SYSTEM_VERSION}
    </div>

    {/* 🔱 Forensic Bridge (Col Gamma) */}
    <div className="flex-1 flex justify-center">
      <ArchonDoctor />
    </div>

    {/* 🏗️ System Versioning (Col Beta) — FC 082 F3c2: "God Mode"
          (RoleSwitcher, impersonación client-side sobre roles legacy)
          retirado junto con el CRUD de roles. */}
    <div className="flex-1 flex justify-end">
      <div className="bg-pinnacle-navy rounded-[4px] px-3 py-1.5 shadow-sm scale-[0.67] origin-right">
        <ArchonLogo isCollapsed={false} size={14} />
      </div>
    </div>
  </footer>
);

export default SovereignFooter;
