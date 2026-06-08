import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import usePermissions from '../../hooks/usePermissions';
import api from '../../api/client';
import type { UserIndustrial } from '../../types/user';

interface RoleOption {
  id: number;
  name: string;
  permissions: string[];
}

const ARCHON_MASTER_ROLE: RoleOption = { id: 0, name: 'Master (Archon)', permissions: [] };

const RoleSwitcher: React.FC = () => {
  const { effectiveUser, isImpersonating, startImpersonation, stopImpersonation } = useAuth();
  const { isOmnipotent } = usePermissions();
  const [open, setOpen] = useState(false);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api
      .get<{ success: boolean; data: { roles: RoleOption[] } }>('/admin/roles-permissions')
      .then((res) => setRoles(res.data.data.roles))
      .catch((_err: unknown): void => undefined);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent): void => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isOmnipotent()) return null;

  if (isImpersonating) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold text-amber-700 uppercase tracking-widest bg-amber-50 border border-amber-300 rounded px-2 py-1 whitespace-nowrap">
          Viendo como {effectiveUser?.roleName}
        </span>
        <button
          type="button"
          onClick={stopImpersonation}
          className="text-[10px] font-semibold text-slate-500 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50 transition-colors whitespace-nowrap"
        >
          Salir
        </button>
      </div>
    );
  }

  const handleSelectRole = (role: RoleOption): void => {
    if (role.id === 0) {
      stopImpersonation();
      setOpen(false);
      return;
    }
    const target: UserIndustrial = {
      id: `impersonated-${role.id}`,
      username: `[${role.name}]`,
      fullName: `Vista: ${role.name}`,
      email: '',
      roleId: role.id,
      roleName: role.name,
      department: '',
      employeeNumber: '',
      is_active: true,
      permissions: role.permissions,
    };
    startImpersonation(target);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={(): void => setOpen((v) => !v)}
        className="bg-pinnacle-navy rounded-[4px] px-3 py-1.5 shadow-sm scale-[0.67] origin-right text-white text-[10px] font-bold uppercase tracking-widest opacity-50 hover:opacity-100 transition-opacity"
      >
        God Mode
      </button>
      {open && (
        <div className="absolute bottom-full right-0 mb-2 bg-white border border-slate-200 rounded-[4px] shadow-lg min-w-[160px] z-50 overflow-hidden">
          <button
            type="button"
            onClick={(): void => handleSelectRole(ARCHON_MASTER_ROLE)}
            className="w-full text-left px-3 py-2 text-xs font-bold text-pinnacle-navy hover:bg-slate-50 border-b border-slate-200"
          >
            Master (Archon)
          </button>
          {roles.map((role) => (
            <button
              key={role.id}
              type="button"
              onClick={(): void => handleSelectRole(role)}
              className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 border-b border-slate-100 last:border-0"
            >
              {role.name}
            </button>
          ))}
          {roles.length === 0 && (
            <p className="px-3 py-2 text-xs text-slate-400">Sin roles disponibles</p>
          )}
        </div>
      )}
    </div>
  );
};

export default RoleSwitcher;
