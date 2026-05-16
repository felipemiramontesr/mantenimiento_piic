import React, { useEffect } from 'react';
import { UserPlus, ShieldAlert, PlusCircle } from 'lucide-react';
import { useUsers } from '../../context/UserContext';
import { useSovereignLayout } from '../../context/SovereignLayoutContext';

// 🔱 Specialized Sub-components (Silicon Valley Standards)
import UsersGridView from '../../components/Users/UsersGridView';
import UserRegistrationForm from '../../components/Users/UserRegistrationForm';

/**
 * 🔱 Archon Module: UsersModule
 * Implementation: Sovereign Personnel Administration (V.78.100.104)
 * Principles: SOLID, DRY, DIP
 * Refinement: Single Mutating Header Card (Mirror FleetModule DNA)
 */
const UsersModule: React.FC = (): React.JSX.Element => {
  const { activePanel, setActivePanel, setEditingUser } = useUsers();
  const { setSectionData } = useSovereignLayout();
  const panelRef = React.useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const isRegistering = activePanel === 'SIGNUP';

    setSectionData(
      'Administrar Personal',
      'Gestión de Identidades, Roles Industriales & Auditoría de Acceso',
      null,
      {
        variant: isRegistering ? 'navy' : 'emerald',
        headerTitle: isRegistering ? 'Cancelar' : 'Alta de Personal',
        HeaderIcon: isRegistering ? ShieldAlert : PlusCircle,
        PayloadIcon: isRegistering ? ShieldAlert : UserPlus,
        actionTitle: isRegistering ? 'Retorno' : 'Registrar',
        description: isRegistering ? 'Cancelar Registro' : 'Gestión de Identidad',
        buttonText: isRegistering ? 'Cerrar Formulario' : 'Iniciar Registro',
        isActive: isRegistering,
        onClick: () => {
          if (isRegistering) {
            setEditingUser(null);
            setActivePanel('DIRECTORY');
          } else {
            setEditingUser(null);
            setActivePanel('SIGNUP');
          }
        },
      }
    );
  }, [activePanel, setSectionData, setActivePanel, setEditingUser]);

  return (
    <div className="animate-in fade-in duration-700">
      {/* 📊 BODY MODULAR */}
      <section className="archon-workspace-chassis">
        {/* 🔱 AXIAL SYNC CONTAINER */}
        <div className="archon-axial-container">
          <div ref={panelRef}>
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000">
              {activePanel === 'DIRECTORY' ? <UsersGridView /> : <UserRegistrationForm />}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default UsersModule;
