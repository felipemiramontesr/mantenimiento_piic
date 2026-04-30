import React from 'react';
import { Users } from 'lucide-react';
import { useUsers } from '../../context/UserContext';
import { BRANDING_NAME, SYSTEM_VERSION } from '../../constants/versionConstants';

// 🔱 Specialized Sub-components (Silicon Valley Standards)
import UserManagementCards from '../../components/Users/UserManagementCards';
import UsersGridView from '../../components/Users/UsersGridView';
import UserRegistrationForm from '../../components/Users/UserRegistrationForm';

/**
 * 🔱 Archon Component: UsersModule
 * Implementation: Sovereign Personnel Administration
 * v.20.0.0
 */
const UsersModule: React.FC = (): React.JSX.Element => {
  const { activePanel, setActivePanel, setEditingUser } = useUsers();
  const panelRef = React.useRef<HTMLDivElement>(null);

  // 🔱 IDENTITY ANCHOR
  React.useEffect(() => {
    setActivePanel('DIRECTORY');
    setEditingUser(null);
  }, [setActivePanel, setEditingUser]);

  // 🚀 AXIAL SCROLL SYNC
  React.useEffect(() => {
    if (activePanel === 'SIGNUP' && panelRef.current) {
      setTimeout(() => {
        panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);
    }
  }, [activePanel]);

  return (
    <main className="workspace-container-pro animate-in fade-in duration-700">
      {/* 🚀 HEADER SOBERANO */}
      <header className="workspace-header-pro" style={{ position: 'relative', minHeight: '12vh' }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
          }}
        >
          {/* Left Panel: Operational Context */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '8px',
              }}
            >
              <Users size={28} style={{ color: '#f2b705' }} />
              <h2
                className="text-[#0f2a44] tracking-tighter font-black text-2xl"
                style={{ margin: 0, padding: 0, lineHeight: 1 }}
              >
                Administrar Personal
              </h2>
            </div>
            <p className="text-[#0f2a44] text-[10px] font-bold uppercase tracking-[0.2em] opacity-60">
              Gestión de Identidades, Roles Industriales & Auditoría de Acceso
            </p>
          </div>

          {/* Right Panel: Identity & Access - HANDLED BY GLOBAL TOPBAR */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '24px',
              position: 'relative',
              width: '44px',
              height: '44px',
            }}
          >
            {/* Symmetrical placeholder */}
          </div>
        </div>
      </header>

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

      <footer className="workspace-footer-pro">
        <p>© Todos los derechos reservados por ArchonCore by PIIC GROUP.</p>
        <p className="text-[#0f2a44]">
          {BRANDING_NAME} {SYSTEM_VERSION}
        </p>
      </footer>
    </main>
  );
};

export default UsersModule;
