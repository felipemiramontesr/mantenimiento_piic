import React from 'react';
import { User, Mail, Activity, Pencil, Hash, Briefcase, Image as ImageIcon } from 'lucide-react';
import { useUsers } from '../../context/UserContext';
import { UserIndustrial } from '../../types/user';
import ArchonDataTable, { ArchonTableHeader } from '../UI/ArchonDataTable';

/**
 * 🔱 Archon Component: UsersGridView
 * Implementation: High-Density Industrial Registry (Fleet-Standard)
 * v.28.24.2 - Identity Oversight (Static Recovery)
 */

const RoleBadge = ({ roleName }: { roleName: string }): React.JSX.Element => {
  let styles = 'bg-gray-100 text-gray-600';
  if (roleName === 'Archon') styles = 'bg-[#0f2a44] text-white';
  if (roleName === 'Administrador') styles = 'bg-blue-100 text-blue-700';
  if (roleName === 'Auditor') styles = 'bg-purple-100 text-purple-700';
  if (roleName === 'Técnico') styles = 'bg-cyan-100 text-cyan-700';
  if (roleName === 'Operador') styles = 'bg-emerald-100 text-emerald-700';

  return (
    <span
      className={`px-2.5 py-1 rounded-[4px] text-[9px] font-black uppercase tracking-widest ${styles}`}
    >
      {roleName}
    </span>
  );
};

const UserIdentityCluster = ({ user }: { user: UserIndustrial }): React.JSX.Element => (
  <div className="flex flex-col items-center gap-1.5">
    <div className="flex items-center gap-1.5 opacity-60">
      <Hash size={10} className="text-[#0f2a44]" />
      <span className="text-[10px] font-black text-[#0f2a44] uppercase tracking-tighter">
        {user.employeeNumber || 'SIN NÚMERO'}
      </span>
    </div>
    <div className="flex flex-col items-center">
      <span className="text-[12px] font-black text-[#0f2a44] uppercase tracking-tight leading-tight text-center">
        {user.fullName || user.username}
      </span>
    </div>
  </div>
);

const UserRegistryRow = ({
  user,
  onEdit,
}: {
  user: UserIndustrial;
  onEdit: (u: UserIndustrial) => void;
}): React.JSX.Element => {
  const { toggleUserStatus } = useUsers();

  return (
    <tr className="transition-all duration-300 hover:bg-[#0f2a44]/[0.015]">
      <td className="py-6 text-center">
        <div className="flex justify-center items-center">
          {user.imageUrl ? (
            <img
              src={user.imageUrl}
              className="w-48 h-48 rounded-[4px] object-cover"
              alt={user.username}
            />
          ) : (
            <div className="w-48 h-48 rounded-[4px] bg-gray-50 flex items-center justify-center text-gray-300">
              <ImageIcon size={48} className="opacity-40" />
            </div>
          )}
        </div>
      </td>
      <td className="text-center px-4">
        <div className="flex items-center justify-center gap-2 text-[#0f2a44] opacity-80">
          <User size={12} className="text-[#f2b705]" />
          <span className="text-[11px] font-black tracking-widest">
            {user.username.toUpperCase()}
          </span>
        </div>
      </td>
      <td className="text-center px-4">
        <UserIdentityCluster user={user} />
      </td>
      <td className="text-center px-4">
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-1.5 text-sky-700 bg-sky-50 px-2.5 py-1 rounded-[4px]">
            <Mail size={11} />
            <span className="text-[10px] font-black">{user.email}</span>
          </div>
        </div>
      </td>
      <td className="text-center px-4">
        <div className="flex flex-col items-center gap-1.5">
          <RoleBadge roleName={user.roleName || 'Usuario'} />
          <div className="flex items-center gap-1 opacity-40">
            <Briefcase size={9} />
            <span className="text-[9px] font-bold uppercase">{user.department || 'GENERAL'}</span>
          </div>
        </div>
      </td>
      <td className="text-center px-4">
        <div className="flex flex-col items-center">
          <button
            onClick={(): Promise<void> => toggleUserStatus(user.id, user.is_active)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-[4px] font-black text-[9px] uppercase transition-all ${
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
      <td className="text-center px-4">
        <div className="flex justify-center gap-2">
          <button
            onClick={(): void => onEdit(user)}
            className="flex items-center justify-center w-10 h-10 text-[#059669] bg-emerald-50/30 hover:bg-emerald-100/50 transition-all duration-300 rounded-[4px] hover:-translate-y-0.5 hover:scale-105 hover:shadow-sm group border-none outline-none"
          >
            <Pencil size={18} className="transition-transform duration-300 group-hover:rotate-12" />
          </button>
        </div>
      </td>
    </tr>
  );
};

const UsersGridView = (): React.JSX.Element => {
  const { users, isLoading, setEditingUser, setActivePanel } = useUsers();
  const [sortConfig, setSortConfig] = React.useState<{
    field: 'username' | 'identity' | 'role' | 'status' | null;
    direction: 'asc' | 'desc';
  }>({ field: null, direction: 'asc' });

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

  const headers: ArchonTableHeader[] = [
    { key: 'avatar', label: 'ACTIVO' },
    { key: 'username', label: 'EMPLEADO', sortable: true },
    { key: 'identity', label: 'IDENTIDAD', sortable: true },
    { key: 'contact', label: 'CANAL DE CONTACTO' },
    { key: 'role', label: 'ROL Y DEPARTAMENTO', sortable: true },
    { key: 'status', label: 'ESTATUS OPERATIVO', sortable: true },
    { key: 'settings', label: 'AJUSTES' },
  ];

  return (
    <div className="space-y-[20px] text-[#0f2a44]">
      <ArchonDataTable
        loading={isLoading}
        loadingMessage="Sincronizando Identidades..."
        data={sortedUsers}
        headers={headers}
        onSort={handleSort}
        sortConfig={sortConfig}
        renderRow={(item: UserIndustrial): React.JSX.Element => (
          <UserRegistryRow
            key={item.id}
            user={item}
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
