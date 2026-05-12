import React, { useEffect } from 'react';
import { useUsers } from '../../context/UserContext';
import { useSovereignLayout } from '../../context/SovereignLayoutContext';

// 🔱 Specialized Sub-components (Silicon Valley Standards)
import UserManagementCards from '../../components/Users/UserManagementCards';
import UsersGridView from '../../components/Users/UsersGridView';
import UserRegistrationForm from '../../components/Users/UserRegistrationForm';

/**
 * 🔱 Archon Component: UsersModule
 * Implementation: Sovereign Personnel Administration
 * v.20.0.0
 * Refinement: Centralized Header/Footer via SovereignLayoutContext
 */
const UsersModule: React.FC = (): React.JSX.Element => {
  const { activePanel, setActivePanel, setEditingUser } = useUsers();
  const { setTitle, setDescription } = useSovereignLayout();
  const panelRef = React.useRef<HTMLDivElement>(null);

  // 🚀 SYNC SOVEREIGN HEADER
  useEffect(() => {
    setTitle('Administrar Personal');
    setDescription('Gestión de Identidades, Roles Industriales & Auditoría de Acceso');
  }, [setTitle, setDescription]);

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
    <div className="animate-in fade-in duration-700">
      {/* 📊 BODY MODULAR */}
      <section className="archon-workspace-chassis">
        {/* 🔱 AXIAL SYNC CONTAINER */}
        <div className="archon-axial-container flex flex-col gap-12">
          <UserManagementCards />

          <div ref={panelRef}>
            {activePanel === 'DIRECTORY' ? <UsersGridView /> : <UserRegistrationForm />}
          </div>
        </div>
      </section>
    </div>
  );
};

export default UsersModule;
