import React, { useEffect } from 'react';
import { Settings, User } from 'lucide-react';
import { useSovereignLayout } from '../../context/SovereignLayoutContext';
import { useAuth } from '../../context/AuthContext';
import ArchonProfilePanel from '../../components/Identity/ArchonProfilePanel';
import OwnerProfilePanel from '../../components/Identity/OwnerProfilePanel';

const SettingsModule: React.FC = (): React.ReactElement => {
  const { setSectionData } = useSovereignLayout();
  const { ownerType } = useAuth();

  useEffect((): void => {
    setSectionData(
      'Configuración de Identidad',
      'Gestión de Perfil, Seguridad de Acceso & Credenciales Archon',
      null,
      {
        variant: 'yellow',
        // FC 078 F3 (P2-3): el card y su botón repetían el título de la
        // página ("Configuración de Identidad" ×2) — copy diferenciado.
        headerTitle: 'Perfil y Credenciales',
        HeaderIcon: Settings,
        PayloadIcon: User,
        actionTitle: 'Identidad',
        description: 'Perfil, credenciales y foto',
        buttonText: 'Gestionar Perfil',
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
          {ownerType !== null && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000 mt-6">
              <OwnerProfilePanel />
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default SettingsModule;
