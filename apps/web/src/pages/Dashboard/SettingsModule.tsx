import React, { useState, useEffect } from 'react';
import { Bell, Settings, User } from 'lucide-react';
import { useSovereignLayout } from '../../context/SovereignLayoutContext';
import AlertsPanel from '../../components/Identity/AlertsPanel';
import ArchonProfilePanel from '../../components/Identity/ArchonProfilePanel';

type SettingsPanel = 'ALERTS' | 'IDENTITY';

const SettingsModule: React.FC = (): React.ReactElement => {
  const { setSectionData } = useSovereignLayout();
  const [activePanel, setActivePanel] = useState<SettingsPanel>('ALERTS');

  const isIdentity = activePanel === 'IDENTITY';

  useEffect((): void => {
    setSectionData(
      isIdentity ? 'Configuración de Identidad' : 'Alertas y Notificaciones',
      isIdentity
        ? 'Gestión de Perfil, Seguridad de Acceso & Credenciales Archon'
        : 'Notificaciones y alertas del sistema',
      null,
      {
        variant: isIdentity ? 'yellow' : 'navy',
        headerTitle: isIdentity ? 'Alertas y Notificaciones' : 'Configuración de Identidad',
        HeaderIcon: isIdentity ? Bell : Settings,
        PayloadIcon: isIdentity ? Bell : User,
        actionTitle: isIdentity ? 'Alertas' : 'Identidad',
        description: isIdentity ? 'Notificaciones del sistema' : 'Perfil, credenciales y foto',
        buttonText: isIdentity ? 'Ver Alertas' : 'Configuración de Identidad',
        isActive: isIdentity,
        onClick: (): void => setActivePanel(isIdentity ? 'ALERTS' : 'IDENTITY'),
      }
    );
  }, [setSectionData, isIdentity]);

  return (
    <div className="animate-in fade-in duration-700">
      <section className="archon-workspace-chassis">
        <div className="archon-axial-container">
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000">
            {activePanel === 'ALERTS' && <AlertsPanel />}
            {activePanel === 'IDENTITY' && <ArchonProfilePanel />}
          </div>
        </div>
      </section>
    </div>
  );
};

export default SettingsModule;
