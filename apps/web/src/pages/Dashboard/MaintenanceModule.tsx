import React, { useState, useEffect } from 'react';
import { useSovereignLayout } from '../../context/SovereignLayoutContext';
import MaintenanceManagementCards, {
  MaintenancePanel,
} from '../../components/Maintenance/MaintenanceManagementCards';

/**
 * 🛠️ ARCHON MAINTENANCE MODULE
 * Architecture: Sovereign Instrumental Node
 * v.20.0.0
 * Refinement: Centralized Header/Footer via SovereignLayoutContext
 */
const MaintenanceModule: React.FC = (): React.ReactElement => {
  const { setTitle, setDescription } = useSovereignLayout();
  const [activePanel, setActivePanel] = useState<MaintenancePanel>('HISTORY');

  // 🚀 SYNC SOVEREIGN HEADER
  useEffect(() => {
    setTitle('Administrar Mantenimientos');
    setDescription('Control de Servicios, Mantenimiento Preventivo & Correctivo');
  }, [setTitle, setDescription]);

  const handlePanelChange = (panel: MaintenancePanel): void => {
    setActivePanel(panel);
  };

  return (
    <div className="animate-in fade-in duration-700">
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
    </div>
  );
};

export default MaintenanceModule;
