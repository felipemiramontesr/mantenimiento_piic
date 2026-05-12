import React from 'react';
import { BRANDING_NAME } from '../../constants/versionConstants';

/**
 * 🔱 Archon Component: SovereignFooter
 * Implementation: Global System Branding & Legal Metadata
 * Objective: Standardized footer for all dashboard views.
 * v.1.0.0
 */

const SovereignFooter: React.FC = () => (
  <footer className="workspace-footer-pro flex items-center justify-between w-full">
    <div className="flex flex-col md:flex-row gap-2 md:gap-8 items-center text-[10px] font-bold uppercase tracking-widest opacity-40">
      <p>© Todos los derechos reservados por ArchonCore by Dreamtek.</p>
    </div>
    <div className="text-[10px] font-black text-[#0f2a44] opacity-60">{BRANDING_NAME}</div>
  </footer>
);

export default SovereignFooter;
