import React, { useEffect } from 'react';
import { Settings, User } from 'lucide-react';
import { useSovereignLayout } from '../../context/SovereignLayoutContext';
import ArchonProfilePanel from '../../components/Identity/ArchonProfilePanel';

const SettingsModule: React.FC = (): React.ReactElement => {
  const { setSectionData } = useSovereignLayout();

  useEffect((): void => {
    setSectionData(
      'Configuración de Identidad',
      'Gestión de Perfil, Seguridad de Acceso & Credenciales Archon',
      null,
      {
        variant: 'yellow',
        headerTitle: 'Configuración de Identidad',
        HeaderIcon: Settings,
        PayloadIcon: User,
        actionTitle: 'Identidad',
        description: 'Perfil, credenciales y foto',
        buttonText: 'Configuración de Identidad',
        isActive: false,
        onClick: (): void => {
          /* noop */
        },
      }
    );
  }, [setSectionData]);

  return (
    <div className="animate-in fade-in duration-700">
      <section className="archon-workspace-chassis">
        <div className="archon-axial-container">
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <ArchonProfilePanel />
          </div>
        </div>
      </section>
    </div>
  );
};

export default SettingsModule;
