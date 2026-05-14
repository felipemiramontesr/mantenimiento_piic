import React from 'react';
import { Users, UserPlus, Shield, ClipboardList } from 'lucide-react';
import { useUsers } from '../../context/UserContext';
import ArchonManagementCard from '../UI/ArchonManagementCard';

/**
 * 🔱 Archon Component: UserManagementCards
 * Implementation: Dual-Axis Symmetry Selector (V.78.100.102)
 * Objective: High-performance navigational orchestration for Personnel.
 * Refactor: Forcing 2-Column Grid for axial symmetry.
 */

const UserManagementCards: React.FC = (): React.JSX.Element => {
  const { activePanel, setActivePanel, setEditingUser } = useUsers();

  return (
    <div className="archon-grid-2-sovereign animate-in fade-in slide-in-from-top-4 duration-700">
      <ArchonManagementCard
        variant="navy"
        headerTitle="Directorio Maestro"
        HeaderIcon={ClipboardList}
        PayloadIcon={Shield}
        actionTitle="Mando"
        description="Supervisión Directiva"
        buttonText="Ver Directorio"
        isActive={activePanel === 'DIRECTORY'}
        layout="horizontal"
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
        layout="horizontal"
        onClick={(): void => {
          setEditingUser(null);
          setActivePanel('SIGNUP');
        }}
      />
    </div>
  );
};

export default UserManagementCards;
