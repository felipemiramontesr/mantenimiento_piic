import React from 'react';
import { UserCheck } from 'lucide-react';
import ArchonProfilePanel from '../../components/Identity/ArchonProfilePanel';
import { BRANDING_NAME, SYSTEM_VERSION } from '../../constants/versionConstants';

/**
 * 🔱 Archon Module: SettingsModule
 * Implementation: Sovereign Identity Node
 * v.20.0.0
 */

const SettingsModule: React.FC = (): React.ReactElement => (
  <main className="workspace-container-pro animate-in fade-in duration-700">
    {/* 🚀 HEADER SOBERANO */}
    <header className="workspace-header-pro" style={{ position: 'relative', minHeight: '12vh' }}>
      <div className="flex flex-row items-center justify-between w-full">
        <div className="flex flex-col items-start">
          <div className="flex items-center gap-12 mb-8">
            <UserCheck size={28} style={{ color: '#f2b705' }} />
            <h2 className="text-[#0f2a44] tracking-tighter font-black text-2xl uppercase">
              Configuración de Identidad
            </h2>
          </div>
          <p className="text-[#0f2a44] text-[10px] font-bold uppercase tracking-[0.2em] opacity-60">
            Gestión de Perfil, Seguridad de Acceso & Credenciales Archon
          </p>
        </div>
      </div>
    </header>

    {/* 📊 BODY MODULAR */}
    <section className="archon-workspace-chassis">
      <div className="archon-axial-container max-w-6xl mx-auto">
        <ArchonProfilePanel />
      </div>
    </section>

    {/* ⚓ FOOTER SENTINEL */}
    <footer className="workspace-footer-pro">
      <p>© Todos los derechos reservados por ArchonCore by Dreamtek.</p>
      <p className="text-[#0f2a44]">
        {BRANDING_NAME} {SYSTEM_VERSION}
      </p>
    </footer>
  </main>
);

export default SettingsModule;
