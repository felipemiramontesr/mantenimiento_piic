import React from 'react';
import { User, ChevronRight, Loader2 } from 'lucide-react';
import type { PersonnelRecord } from './types';
import { getRoleBadgeClass, getRoleName } from './roles';

/** Fila individual del listado de personal (FC163 F1B-3, split Alfa 219_AN — sub-split de PersonnelRegistryFeed). */
function PersonnelRow({ user }: { user: PersonnelRecord }): React.JSX.Element {
  return (
    <div className="p-4 border border-gray-100 rounded-[4px] flex items-center justify-between hover:border-[#0f2a44]/20 transition-all group">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-[4px] bg-gray-50 flex items-center justify-center text-[#0f2a44]">
          <User size={18} />
        </div>
        <div>
          <h4 className="text-sm font-black text-[#0f2a44] uppercase">{user.username}</h4>
          <div
            className={`mt-1 inline-block px-2 py-0.5 rounded border text-archon-xs font-black uppercase ${getRoleBadgeClass(
              user.roleId
            )}`}
          >
            {getRoleName(user.roleId)}
          </div>
        </div>
      </div>
      <ChevronRight size={14} className="opacity-0 group-hover:opacity-30 transition-opacity" />
    </div>
  );
}

export interface PersonnelRegistryFeedProps {
  isLoading: boolean;
  users: PersonnelRecord[];
}

/** Listado de personal registrado (con estado de carga/vacío) (FC163 F1B-3, split Alfa 219_AN). */
export function PersonnelRegistryFeed({
  isLoading,
  users,
}: PersonnelRegistryFeedProps): React.JSX.Element {
  if (isLoading && users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 opacity-20">
        <Loader2 size={32} className="animate-spin mb-4" />
        <span className="text-archon-base font-black uppercase tracking-widest">
          Sincronizando Vault...
        </span>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-20 opacity-30 italic text-sm">Sin personal registrado.</div>
    );
  }

  return (
    <div className="space-y-4">
      {users.map((u) => (
        <PersonnelRow key={u.id} user={u} />
      ))}
    </div>
  );
}
