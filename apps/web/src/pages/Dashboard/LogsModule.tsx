import React, { useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { SYSTEM_VERSION, BRANDING_NAME } from '../../constants/versionConstants';
import LogsManagementCards, { LogsPanel } from '../../components/Logs/LogsManagementCards';

const LogsModule: React.FC = (): React.ReactElement => {
  const [activePanel, setActivePanel] = useState<LogsPanel>('FORENSIC');

  const handlePanelChange = (panel: LogsPanel): void => {
    setActivePanel(panel);
  };

  return (
    <main className="workspace-container-pro animate-in fade-in duration-700">
      {/* 🚀 HEADER SOBERANO (Zen Mode) - V.7.0.0.3 */}
      <header className="workspace-header-pro" style={{ position: 'relative', minHeight: '12vh' }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
          }}
        >
          {/* Left Panel: Security Context */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '8px',
              }}
            >
              <ShieldAlert size={28} style={{ color: '#f2b705' }} />
              <h2
                className="text-[#0f2a44] tracking-tighter font-black text-2xl"
                style={{ margin: 0, padding: 0, lineHeight: 1 }}
              >
                Logs de Seguridad
              </h2>
            </div>
            <p className="text-[#0f2a44] text-[10px] font-bold uppercase tracking-[0.2em] opacity-60">
              Auditoría y Vigilancia de Acceso al Sistema
            </p>
          </div>

          {/* Right Panel: Identity - HANDLED BY GLOBAL TOPBAR */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '24px',
              position: 'relative',
              width: '44px',
              height: '44px',
            }}
          >
            {/* Symmetrical placeholder */}
          </div>
        </div>
      </header>

      {/* 📊 BODY MODULAR (Zen Skeleton) */}
      <section className="archon-workspace-chassis">
        <div className="archon-axial-container flex flex-col gap-12 w-full max-w-full">
          <LogsManagementCards activePanel={activePanel} onPanelChange={handlePanelChange} />

          {/* Futuro panel de contenido irá aquí dependiendo del activePanel */}
        </div>
      </section>

      {/* ⚓ FOOTER SENTINEL (10vh) - FORMATO ORACIÓN v.7.0.0.3 */}
      <footer className="workspace-footer-pro">
        <p>© Todos los derechos reservados por ArchonCore by Dreamtek.</p>
        <p className="text-[#0f2a44]">
          {BRANDING_NAME} {SYSTEM_VERSION}
        </p>
      </footer>
    </main>
  );
};

export default LogsModule;
