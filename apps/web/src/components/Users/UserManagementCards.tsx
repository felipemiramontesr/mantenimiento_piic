import React from 'react';
import { Users, UserPlus, Shield, ClipboardList } from 'lucide-react';
import { useUsers } from '../../context/UserContext';
import ArchonManagementCard from '../UI/ArchonManagementCard';

/**
 * 🔱 Archon Component: UserManagementCards
 * Implementation: Dual-Axis Symmetry Selector (Fleet-Standard)
 * v.28.24.2 - Emerald Restoration & Static Entry
 */

const UserManagementCards: React.FC = (): React.JSX.Element => {
  const { activePanel, setActivePanel, setEditingUser } = useUsers();

  return (
    <div className="archon-central-axis animate-in fade-in slide-in-from-top-4 duration-700">
      <div className="archon-grid-2 gap-8 mb-8">
        <ArchonManagementCard
          variant="navy"
          headerTitle="Directorio Maestro"
          HeaderIcon={ClipboardList}
          PayloadIcon={Shield}
          actionTitle="Mando"
          description="Supervisión Directiva"
          buttonText="Ver Directorio"
          isActive={activePanel === 'DIRECTORY'}
          onClick={(): void => setActivePanel('DIRECTORY')}
        />

        <ArchonManagementCard
          variant="emerald"
          headerTitle="Alta de Personal"
          HeaderIcon={UserPlus}
          PayloadIcon={Users}
          actionTitle="Registrar"
          description="Gestión de Identidad"
          buttonText="Iniciar Registro"
          isActive={activePanel === 'SIGNUP'}
          onClick={(): void => {
            setEditingUser(null);
            setActivePanel('SIGNUP');
          }}
        />
      </div>
    </div>
  );
};

export default UserManagementCards;
