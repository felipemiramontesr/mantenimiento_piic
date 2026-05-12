import React, { useState, useEffect } from 'react';
import { useSovereignLayout } from '../../context/SovereignLayoutContext';
import LogsManagementCards, { LogsPanel } from '../../components/Logs/LogsManagementCards';

/**
 * 🚀 ARCHON LOGS MODULE
 * Version: 7.0.0.3 - Sovereign Security Standard
 * Refinement: Centralized Header/Footer via SovereignLayoutContext
 */
const LogsModule: React.FC = (): React.ReactElement => {
  const { setSectionData } = useSovereignLayout();
  const [activePanel, setActivePanel] = useState<LogsPanel>('FORENSIC');

  // 🚀 SYNC SOVEREIGN HEADER
  useEffect(() => {
    setSectionData('Logs de Seguridad', 'Auditoría y Vigilancia de Acceso al Sistema');
  }, [setSectionData]);

  const handlePanelChange = (panel: LogsPanel): void => {
    setActivePanel(panel);
  };

  return (
    <div className="animate-in fade-in duration-700">
      {/* 📊 BODY MODULAR (Zen Skeleton) */}
      <section className="archon-workspace-chassis">
        <div className="archon-axial-container flex flex-col gap-12 w-full max-w-full">
          <LogsManagementCards activePanel={activePanel} onPanelChange={handlePanelChange} />

          {/* Futuro panel de contenido irá aquí dependiendo del activePanel */}
        </div>
      </section>
    </div>
  );
};

export default LogsModule;
