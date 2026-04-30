import React from 'react';
import ArchonProfilePanel from '../../components/Identity/ArchonProfilePanel';
import { BRANDING_NAME, SYSTEM_VERSION } from '../../constants/versionConstants';

/**
 * 🔱 Archon Module: SettingsModule
 * Implementation: Sovereign Identity Node
 * v.20.0.0
 */

const SettingsModule: React.FC = (): React.ReactElement => (
  <div className="animate-in fade-in duration-700">
    <ArchonProfilePanel />

    {/* ⚓ FOOTER SENTINEL */}
    <footer className="workspace-footer-pro">
      <p>© Todos los derechos reservados por ArchonCore by PIIC GROUP.</p>
      <p className="text-[#0f2a44]">
        {BRANDING_NAME} {SYSTEM_VERSION}
      </p>
    </footer>
  </div>
);

export default SettingsModule;
