import React, { useState } from 'react';
import { Wrench } from 'lucide-react';
import { BRANDING_NAME, SYSTEM_VERSION } from '../../constants/versionConstants';
import MaintenanceManagementCards, {
  MaintenancePanel,
} from '../../components/Maintenance/MaintenanceManagementCards';

/**
 * 🛠️ ARCHON MAINTENANCE MODULE
 * Architecture: Sovereign Instrumental Node
 * v.20.0.0
 */
const MaintenanceModule: React.FC = (): React.ReactElement => {
  const [activePanel, setActivePanel] = useState<MaintenancePanel>('HISTORY');

  const handlePanelChange = (panel: MaintenancePanel): void => {
    setActivePanel(panel);
  };

  return (
    <main className="workspace-container-pro animate-in fade-in duration-700">
      {/* 🚀 HEADER SOBERANO */}
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
          {/* Left Panel: Operational Context */}
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
              <Wrench size={28} style={{ color: '#f2b705' }} />
              <h2
                className="text-[#0f2a44] tracking-tighter font-black text-2xl"
                style={{ margin: 0, padding: 0, lineHeight: 1 }}
              >
                Administrar Mantenimientos
              </h2>
            </div>
            <p className="text-[#0f2a44] text-[10px] font-bold uppercase tracking-[0.2em] opacity-60">
              Control de Servicios, Mantenimiento Preventivo & Correctivo
            </p>
          </div>

          {/* Right Panel: Identity & Access - HANDLED BY GLOBAL TOPBAR */}
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

      {/* 📊 BODY MODULAR */}
      <section className="archon-workspace-chassis">
        {/* 🔱 AXIAL SYNC CONTAINER */}
        <div className="archon-axial-container flex flex-col gap-12">
          <MaintenanceManagementCards activePanel={activePanel} onPanelChange={handlePanelChange} />

          <div className="flex items-center justify-center min-h-[30vh]">
            <h3 className="text-[#0f2a44] text-xl font-black tracking-tight animate-in fade-in duration-1000">
              {activePanel === 'HISTORY'
                ? 'Bitácora de Servicios lista para recibir información-'
                : 'Módulo de Programación listo para recibir información-'}
            </h3>
          </div>
        </div>
      </section>

      <footer className="workspace-footer-pro">
        <p>© Todos los derechos reservados por ArchonCore by PIIC GROUP.</p>
        <p className="text-[#0f2a44]">
          {BRANDING_NAME} {SYSTEM_VERSION}
        </p>
      </footer>
    </main>
  );
};

export default MaintenanceModule;
