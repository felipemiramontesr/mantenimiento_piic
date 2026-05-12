import React, { useEffect } from 'react';
import { useSovereignLayout } from '../../context/SovereignLayoutContext';
import ArchonProfilePanel from '../../components/Identity/ArchonProfilePanel';

/**
 * 🔱 Archon Module: SettingsModule
 * Implementation: Sovereign Identity Node
 * v.20.0.0
 * Refinement: Centralized Header/Footer via SovereignLayoutContext
 */
const SettingsModule: React.FC = (): React.ReactElement => {
  const { setTitle, setDescription } = useSovereignLayout();

  // 🚀 SYNC SOVEREIGN HEADER
  useEffect(() => {
    setTitle('Configuración de Identidad');
    setDescription('Gestión de Perfil, Seguridad de Acceso & Credenciales Archon');
  }, [setTitle, setDescription]);

  return (
    <div className="animate-in fade-in duration-700">
      {/* 📊 BODY MODULAR */}
      <section className="archon-workspace-chassis">
        <div className="archon-axial-container">
          <ArchonProfilePanel />
        </div>
      </section>
    </div>
  );
};

export default SettingsModule;
