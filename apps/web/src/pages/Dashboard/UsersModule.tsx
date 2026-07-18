import React, { useEffect } from 'react';
import { UserPlus, ShieldAlert, PlusCircle, Building2, Hash, Mail } from 'lucide-react';
import { useUsers } from '../../context/UserContext';
import { useSovereignLayout } from '../../context/SovereignLayoutContext';
import { UserIndustrial } from '../../types/user';

// 🔱 Specialized Sub-components (Silicon Valley Standards)
import UsersGridView from '../../components/Users/UsersGridView';
import UserRegistrationForm from '../../components/Users/UserRegistrationForm';
import ArchonAdaptiveView from '../../components/Common/ArchonAdaptiveView';
import ArchonCardView, { CardMetricRow } from '../../components/Common/ArchonCardView';

/**
 * 🔱 Archon Module: UsersModule
 * Implementation: Sovereign Personnel Administration (V.78.100.104)
 * Principles: SOLID, DRY, DIP
 * Refinement: Single Mutating Header Card (Mirror FleetModule DNA)
 */

// FC 078 F2(b) — receta v2: header+badge, identidad, 2 métricas nuevas
// (depto + no. empleado) + correo — mismo recipiente que Fleet/Maintenance.
const renderUserCard = (user: UserIndustrial): React.ReactNode => (
  <div className="flex flex-col gap-2 min-w-0">
    <div className="flex items-center justify-between gap-2">
      <span className="font-black text-pinnacle-navy text-archon-md truncate">
        {user.fullName || user.username}
      </span>
      <span
        className={`shrink-0 px-2 py-0.5 rounded-[4px] text-archon-xs font-bold uppercase tracking-widest ${
          user.is_active
            ? 'bg-emerald-500/10 text-emerald-700'
            : 'bg-pinnacle-navy/5 text-pinnacle-navy/50'
        }`}
      >
        {user.is_active ? 'Activo' : 'Inactivo'}
      </span>
    </div>
    <div className="text-pinnacle-navy/70 text-archon-base truncate">{user.roleName}</div>
    <div className="text-pinnacle-navy/40 text-archon-sm uppercase tracking-widest truncate">
      {user.username}
    </div>
    <div className="flex flex-col gap-1 pt-2 border-t border-pinnacle-navy/5">
      <CardMetricRow icon={<Building2 size={12} />} label="Depto" value={user.department || '—'} />
      <CardMetricRow
        icon={<Hash size={12} />}
        label="No. Empleado"
        value={user.employeeNumber || '—'}
      />
      <CardMetricRow icon={<Mail size={12} />} label="Correo" value={user.email || '—'} />
    </div>
  </div>
);

// FC 074 F3 — vista CARDS del contenedor adaptativo; lee useUsers()
// directamente (mismo patrón self-contained que UsersGridView) para no
// alterar la firma de UsersModule ni tocar el grid interno existente.
const UsersCardPanel: React.FC = (): React.ReactElement => {
  const { users, setEditingUser, setActivePanel } = useUsers();
  return (
    <ArchonCardView<UserIndustrial>
      items={users}
      keyExtractor={(user): string => user.id}
      renderCard={renderUserCard}
      onCardClick={(user): void => {
        setEditingUser(user);
        setActivePanel('SIGNUP');
      }}
      emptyMessage="SIN PERSONAL REGISTRADO"
    />
  );
};
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
              {activePanel === 'DIRECTORY' ? (
                <ArchonAdaptiveView
                  storageKey="users-directory"
                  views={{
                    TABLE: <UsersGridView />,
                    CARDS: <UsersCardPanel />,
                  }}
                />
              ) : (
                <UserRegistrationForm />
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default UsersModule;
