import React from 'react';
import ArchonProfilePanel from '../../components/Identity/ArchonProfilePanel';
import { BRANDING_NAME, SYSTEM_VERSION } from '../../constants/versionConstants';

/**
 * 🔱 Archon Module: SettingsModule
 * Implementation: Sovereign Identity Node
 * v.20.0.0
 */

const SettingsModule: React.FC = (): React.ReactElement => (
  <div className="workspace-container-pro animate-in fade-in duration-700">
    <div className="max-w-4xl mx-auto py-12 px-6">
      <ArchonProfilePanel />
    </div>

    {/* ⚓ FOOTER SENTINEL */}
    <footer className="workspace-footer-pro mt-20">
      <p>© Todos los derechos reservados por ArchonCore by PIIC GROUP.</p>
      <p className="text-[#0f2a44]">
        {BRANDING_NAME} {SYSTEM_VERSION}
      </p>
    </footer>
  </div>
);

export default SettingsModule;
