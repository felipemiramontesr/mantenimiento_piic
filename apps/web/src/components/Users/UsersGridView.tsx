import React from 'react';
import { User, Mail, Activity, Settings, Hash, Briefcase } from 'lucide-react';
import { useUsers } from '../../context/UserContext';
import { UserIndustrial } from '../../types/user';

/**
 * 🔱 Archon Component: UsersGridView
 * Implementation: High-Density Industrial Registry
 * v.28.23.0 - Identity Oversight
 */

const RoleBadge = ({ roleName }: { roleName: string }): React.JSX.Element => {
  let styles = 'bg-gray-100 text-gray-600';
  if (roleName === 'Archon') styles = 'bg-[#0f2a44] text-white ring-2 ring-[#f2b705]';
  if (roleName === 'Administrador') styles = 'bg-blue-100 text-blue-700';
  if (roleName === 'Técnico') styles = 'bg-cyan-100 text-cyan-700';
  if (roleName === 'Operador') styles = 'bg-emerald-100 text-emerald-700';

  return (
    <span
      className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${styles}`}
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
        {user.employee_number || 'SIN NÚMERO'}
      </span>
    </div>
    <div className="flex flex-col items-center">
      <span className="text-[12px] font-black text-[#0f2a44] uppercase tracking-tight leading-tight text-center">
        {user.full_name || user.username}
      </span>
      <div className="flex items-center gap-1 opacity-40">
        <User size={9} />
        <span className="text-[9px] font-bold tracking-widest">{user.username.toUpperCase()}</span>
      </div>
    </div>
  </div>
);

const UserRegistryRow = ({ user }: { user: UserIndustrial }): React.JSX.Element => {
  const { toggleUserStatus } = useUsers();

  return (
    <tr className="transition-all duration-300 hover:bg-[#0f2a44]/[0.02] border-b border-gray-50">
      <td className="py-6 text-center px-4">
        <UserIdentityCluster user={user} />
      </td>
      <td className="text-center px-4">
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-1.5 text-sky-700 bg-sky-50 px-2.5 py-1 rounded border border-sky-100">
            <Mail size={11} />
            <span className="text-[10px] font-black">{user.email}</span>
          </div>
        </div>
      </td>
      <td className="text-center px-4">
        <div className="flex flex-col items-center gap-1.5">
          <RoleBadge roleName={user.role?.name || 'Usuario'} />
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
            className={`flex items-center gap-2 px-3 py-1.5 rounded border font-black text-[9px] uppercase transition-all shadow-sm ${
              user.is_active
                ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                : 'bg-red-50 border-red-100 text-red-700'
            }`}
          >
            <Activity size={10} />
            {user.is_active ? 'Activo' : 'Inactivo'}
          </button>
        </div>
      </td>
      <td className="text-center px-4">
        <div className="flex justify-center gap-2">
          <button className="p-2 text-[#0f2a44]/40 hover:text-[#0f2a44] transition-colors">
            <Settings size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
};

const UsersGridView = (): React.JSX.Element => {
  const { users, isLoading } = useUsers();

  if (isLoading) {
    return (
      <div className="glass-card-pro bg-white p-12 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-[#0f2a44]/10 border-t-[#0f2a44] rounded-full animate-spin" />
        <span className="text-[11px] font-black text-[#0f2a44] uppercase tracking-widest animate-pulse">
          Sincronizando Identidades...
        </span>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-700 space-y-6">
      <div
        className="glass-card-pro bg-white"
        style={{ borderTop: '4px solid #0f2a44', padding: '30px' }}
      >
        <table className="archon-registry-table w-full">
          <thead>
            <tr>
              <th className="py-4 opacity-40">IDENTIDAD / EMPLEADO</th>
              <th className="opacity-40">CANAL DE CONTACTO</th>
              <th className="opacity-40">ROL Y DEPARTAMENTO</th>
              <th className="opacity-40">ESTATUS OPERATIVO</th>
              <th className="opacity-40">AJUSTES</th>
            </tr>
          </thead>
          <tbody>
            {users.map(
              (item: UserIndustrial): React.JSX.Element => (
                <UserRegistryRow key={item.id} user={item} />
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UsersGridView;
