import React from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Activity, Pencil, Hash, Briefcase } from 'lucide-react';
import { useUsers } from '../../context/UserContext';
import { UserIndustrial } from '../../types/user';
import ArchonDataTable, { ArchonTableHeader } from '../UI/ArchonDataTable';
import { useSovereignLayout, SearchSuggestion } from '../../context/SovereignLayoutContext';

/**
 * 🔱 Archon Component: UsersGridView
 * Implementation: High-Density Industrial Registry (V.78.100.102)
 * Objective: Personnel Administration with Zero-Noise Aesthetic.
 * Refactor: 100% Pure Tailwind (Eradicated all Hex Codes).
 */

const matchFieldInUser = (
  u: UserIndustrial,
  query: string
): { label: string; value: string } | null => {
  if (u.username?.toLowerCase().includes(query)) {
    return { label: 'Empleado', value: u.username };
  }
  if (u.fullName && u.fullName.toLowerCase().includes(query)) {
    return { label: 'Nombre', value: u.fullName };
  }
  if (u.email?.toLowerCase().includes(query)) {
    return { label: 'Email', value: u.email };
  }
  if (u.employeeNumber && u.employeeNumber.toLowerCase().includes(query)) {
    return { label: 'No. Empleado', value: u.employeeNumber };
  }
  if (u.roleName && u.roleName.toLowerCase().includes(query)) {
    return { label: 'Rol', value: u.roleName };
  }
  if (u.department && u.department.toLowerCase().includes(query)) {
    return { label: 'Depto', value: u.department };
  }
  return null;
};

const RoleBadge = ({ roleName }: { roleName: string }): React.JSX.Element => {
  let styles = 'bg-slate-100 text-slate-600';
  const name = roleName.toLowerCase();

  if (name.includes('archon')) styles = 'bg-pinnacle-navy text-white';
  else if (name.includes('gerente')) styles = 'bg-emerald-100 text-emerald-700';
  else if (name.includes('superintendente')) styles = 'bg-sky-100 text-sky-700';
  else if (name.includes('jefe') || name.includes('mantenimiento'))
    styles = 'bg-violet-100 text-violet-700';
  else if (name.includes('planeador')) styles = 'bg-amber-100 text-amber-700';
  else if (name.includes('técnico') || name.includes('tecnico'))
    styles = 'bg-cyan-100 text-cyan-700';
  else if (name.includes('operador')) styles = 'bg-slate-100 text-slate-500';

  return (
    <span
      className={`px-2.5 py-1 rounded-[4px] text-archon-sm font-black uppercase tracking-widest ${styles}`}
    >
      {roleName}
    </span>
  );
};

const UserIdentityCluster = ({ user }: { user: UserIndustrial }): React.JSX.Element => (
  <div className="flex flex-col items-center gap-1.5">
    <div className="flex items-center gap-1.5 opacity-60">
      <Hash size={10} className="text-pinnacle-navy" />
      <span className="text-archon-base font-black text-pinnacle-navy uppercase tracking-tighter">
        {user.employeeNumber || 'SIN NÚMERO'}
      </span>
    </div>
    <div className="flex flex-col items-center">
      <span className="text-archon-label font-black text-pinnacle-navy uppercase tracking-tight leading-tight text-center">
        {user.fullName || user.username}
      </span>
    </div>
  </div>
);

const UserRegistryRow = ({
  user,
  index,
  onEdit,
}: {
  user: UserIndustrial;
  index: number;
  onEdit: (u: UserIndustrial) => void;
}): React.JSX.Element => {
  const { toggleUserStatus } = useUsers();

  return (
    <motion.tr
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="transition-all duration-300 hover:bg-pinnacle-navy/[0.015] border-y border-solid border-slate-200/50"
    >
      <td className="py-6 text-center px-4">
        <div className="flex items-center justify-center gap-2 text-pinnacle-navy opacity-80">
          <User size={12} className="text-pinnacle-yellow" />
          <span className="text-archon-md font-black tracking-widest">
            {user.username.toUpperCase()}
          </span>
        </div>
      </td>
      <td className="py-6 text-center px-4">
        <UserIdentityCluster user={user} />
      </td>
      <td className="py-6 text-center px-4">
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-1.5 text-sky-700 bg-sky-50 px-2.5 py-1 rounded-[4px]">
            <Mail size={11} />
            <span className="text-archon-base font-black">{user.email}</span>
          </div>
        </div>
      </td>
      <td className="py-6 text-center px-4">
        <div className="flex flex-col items-center gap-1.5">
          <RoleBadge roleName={user.roleName || 'Usuario'} />
          <div className="flex items-center gap-1 opacity-40">
            <Briefcase size={9} />
            <span className="text-archon-sm font-bold uppercase">
              {user.department || 'GENERAL'}
            </span>
          </div>
        </div>
      </td>
      <td className="py-6 text-center px-4">
        <div className="flex flex-col items-center">
          <button
            onClick={(): Promise<void> => toggleUserStatus(user.id, user.is_active)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-[4px] font-black text-archon-sm uppercase transition-all ${
              user.is_active
                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                : 'bg-red-50 text-red-700 hover:bg-red-100'
            }`}
          >
            <Activity size={10} />
            {user.is_active ? 'Activo' : 'Inactivo'}
          </button>
        </div>
      </td>
      <td className="py-6 text-center px-4">
        <div className="flex justify-center gap-2">
          <button
            onClick={(): void => onEdit(user)}
            className="flex items-center justify-center w-10 h-10 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 hover:-translate-y-0.5 hover:scale-105 hover:shadow-sm transition-all duration-300 rounded-[4px] border-none outline-none group"
          >
            <Pencil size={18} className="transition-transform duration-300 group-hover:rotate-12" />
          </button>
        </div>
      </td>
    </motion.tr>
  );
};

const UsersGridView: React.FC = () => {
  const { users, isLoading, setEditingUser, setActivePanel } = useUsers();
  const { searchTerm, setSearchTerm, setSearchConfig } = useSovereignLayout();
  const [sortConfig, setSortConfig] = React.useState<{
    field: 'username' | 'identity' | 'role' | 'status' | null;
    direction: 'asc' | 'desc';
  }>({ field: null, direction: 'asc' });

  // 🛡️ Dynamic Register for Universal Search Protocol (DRY Compliant)
  React.useEffect(() => {
    setSearchConfig({
      placeholder: 'Buscar por empleado, nombre, email, rol o departamento...',
      getSuggestions: (term: string): SearchSuggestion[] => {
        const query = term.toLowerCase().trim();
        return (users || [])
          .map((u): SearchSuggestion | null => {
            const match = matchFieldInUser(u, query);
            if (!match) return null;
            return {
              id: u.username,
              title: u.username,
              subtitle: u.fullName || 'Empleado General',
              metaLabel: match.label,
              metaValue: match.value,
              rawItem: u,
            };
          })
          .filter((s): s is SearchSuggestion => s !== null);
      },
      onSuggestionSelect: (suggestion) => {
        setSearchTerm(suggestion.id);
      },
    });

    return () => {
      setSearchConfig(null);
    };
  }, [users, setSearchConfig, setSearchTerm]);

  // 🛡️ Auto-cleanup Search Term on Unmount (Resilience Protocol)
  React.useEffect(() => () => setSearchTerm(''), [setSearchTerm]);

  const handleSort = (key: string): void => {
    const field = key as 'username' | 'identity' | 'role' | 'status';
    setSortConfig((prev) => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const sortedUsers = React.useMemo(() => {
    const data = [...users];
    if (!sortConfig.field) return data;

    return data.sort((a, b) => {
      let valA = '';
      let valB = '';

      if (sortConfig.field === 'username') {
        valA = a.username;
        valB = b.username;
      } else if (sortConfig.field === 'identity') {
        valA = a.fullName || a.username;
        valB = b.fullName || b.username;
      } else if (sortConfig.field === 'role') {
        valA = a.roleName || '';
        valB = b.roleName || '';
      } else if (sortConfig.field === 'status') {
        valA = a.is_active ? '1' : '0';
        valB = b.is_active ? '1' : '0';
      }

      return sortConfig.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });
  }, [users, sortConfig]);

  const filteredUsers = React.useMemo(() => {
    if (!searchTerm.trim()) return sortedUsers;
    const query = searchTerm.toLowerCase().trim();
    return sortedUsers.filter((u) => matchFieldInUser(u, query) !== null);
  }, [sortedUsers, searchTerm]);

  const headers: ArchonTableHeader[] = [
    { key: 'username', label: 'EMPLEADO', sortable: true },
    { key: 'identity', label: 'IDENTIDAD', sortable: true },
    { key: 'contact', label: 'CANAL DE CONTACTO' },
    { key: 'role', label: 'ROL Y DEPARTAMENTO', sortable: true },
    { key: 'status', label: 'ESTATUS OPERATIVO', sortable: true },
    { key: 'settings', label: 'ACCIONES' },
  ];

  return (
    <div className="w-full text-pinnacle-navy">
      <ArchonDataTable
        loading={isLoading}
        loadingMessage="Sincronizando Identidades..."
        data={filteredUsers}
        headers={headers}
        onSort={handleSort}
        sortConfig={sortConfig}
        renderRow={(item: UserIndustrial, index): React.JSX.Element => (
          <UserRegistryRow
            key={item.id}
            user={item}
            index={index}
            onEdit={(u): void => {
              setEditingUser(u);
              setActivePanel('SIGNUP');
            }}
          />
        )}
      />
    </div>
  );
};

export default UsersGridView;
