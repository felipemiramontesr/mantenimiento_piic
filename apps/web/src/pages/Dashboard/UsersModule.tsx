import React, { useEffect } from 'react';
import { useUsers } from '../../context/UserContext';
import { useSovereignLayout } from '../../context/SovereignLayoutContext';

// 🔱 Specialized Sub-components (Silicon Valley Standards)
import UserManagementCards from '../../components/Users/UserManagementCards';
import UsersGridView from '../../components/Users/UsersGridView';
import UserRegistrationForm from '../../components/Users/UserRegistrationForm';

/**
 * 🔱 Archon Module: UsersModule
 * Implementation: Sovereign Personnel Administration (V.78.100.102)
 * Refactor: 100% Pure Tailwind (Purged Phantom Classes & Inconsistent Spacing).
 */
const UsersModule: React.FC = (): React.JSX.Element => {
  const { activePanel, setActivePanel, setEditingUser } = useUsers();
  const { setSectionData } = useSovereignLayout();
  const panelRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSectionData(
      'Administrar Personal',
      'Gestión de Identidades, Roles Industriales & Auditoría de Acceso',
      <UserManagementCards />
    );
  }, [setSectionData]);

  // 🔱 IDENTITY ANCHOR
  useEffect(() => {
    setActivePanel('DIRECTORY');
    setEditingUser(null);
  }, [setActivePanel, setEditingUser]);

  // 🚀 AXIAL SCROLL SYNC
  useEffect(() => {
    if (activePanel === 'SIGNUP' && panelRef.current) {
      setTimeout(() => {
        panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);
    }
  }, [activePanel]);

  return (
    <div className="animate-in fade-in duration-700 w-full max-w-full">
      {/* 🔱 AXIAL SYNC CONTAINER */}
      <div className="flex flex-col gap-12 w-full max-w-full">
        <div ref={panelRef} className="w-full">
          {activePanel === 'DIRECTORY' ? <UsersGridView /> : <UserRegistrationForm />}
        </div>
      </div>
    </div>
  );
};

export default UsersModule;
