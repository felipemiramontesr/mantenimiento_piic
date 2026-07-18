import React from 'react';
import { ArchonDoctor } from '../../ArchonDoctor';
import ArchonLogo from '../Logo/ArchonLogo';
import RoleSwitcher from '../Identity/RoleSwitcher';
import usePermissions from '../../hooks/usePermissions';
import { SYSTEM_VERSION } from '../../constants/versionConstants';

/**
 * 🔱 Archon Component: SovereignFooter
 * Implementation: Global System Branding & Legal Metadata (V.78.100.94)
 * Objective: High-performance 10% vertical chassis for system metadata.
 * Refactor: 100% Pure Tailwind Atomic Architecture (Mirror DNA).
 */

const SovereignFooter: React.FC = () => {
  const { isOmnipotent } = usePermissions();

  return (
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

      {/* 🏗️ System Versioning / God Mode (Col Beta) */}
      <div className="flex-1 flex justify-end">
        {isOmnipotent() ? (
          <RoleSwitcher />
        ) : (
          <div className="bg-pinnacle-navy rounded-[4px] px-3 py-1.5 shadow-sm scale-[0.67] origin-right">
            <ArchonLogo isCollapsed={false} size={14} />
          </div>
        )}
      </div>
    </footer>
  );
};

export default SovereignFooter;
