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
        <div className="bg-pinnacle-navy rounded-[4px] px-2.5 py-1 flex items-center gap-1.5 scale-[0.67] origin-right">
          <span className="text-[8px] font-bold text-pinnacle-yellow/60 uppercase tracking-[0.15em] whitespace-nowrap">
            Vista
          </span>
          <span className="text-[8px] font-bold text-pinnacle-yellow uppercase tracking-widest whitespace-nowrap">
            {effectiveUser?.roleName}
          </span>
        </div>
        <button
          type="button"
          onClick={stopImpersonation}
          className="text-[9px] font-bold text-pinnacle-navy/40 hover:text-red-600 hover:bg-red-50 px-2 py-1 rounded-[4px] transition-colors uppercase tracking-widest whitespace-nowrap scale-[0.67] origin-right"
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
        className="min-w-11 min-h-11 flex items-center justify-center rounded-[4px] hover:shadow-pinnacle transition-shadow"
      >
        <span className="bg-pinnacle-navy rounded-[4px] px-3 py-1.5 shadow-sm scale-[0.67] origin-right text-pinnacle-yellow text-[10px] font-bold uppercase tracking-widest">
          God Mode
        </span>
      </button>
      {open && (
        <div className="absolute bottom-full right-0 mb-2 bg-white border border-pinnacle-navy/15 rounded-[4px] shadow-pinnacle-hover min-w-[270px] z-50 overflow-hidden">
          <div className="bg-pinnacle-navy px-3 py-2">
            <span className="text-[8px] font-bold text-pinnacle-yellow uppercase tracking-[0.2em]">
              God Mode
            </span>
          </div>
          <button
            type="button"
            onClick={(): void => handleSelectRole(ARCHON_MASTER_ROLE)}
            className="w-full text-left px-3 py-2.5 text-xs font-bold text-pinnacle-navy bg-pinnacle-yellow/15 hover:bg-pinnacle-yellow/25 border-b border-pinnacle-navy/20 transition-colors"
          >
            Master (Archon)
          </button>
          <div className="px-3 pt-2 pb-1">
            <span className="text-[8px] font-bold text-pinnacle-navy/40 uppercase tracking-[0.15em]">
              Cambiar Vista
            </span>
          </div>
          {roles.map((role) => (
            <button
              key={role.id}
              type="button"
              onClick={(): void => handleSelectRole(role)}
              className="w-full text-left px-3 py-2 text-xs text-pinnacle-navy/80 hover:bg-pinnacle-navy/5 border-b border-pinnacle-navy/10 last:border-0 transition-colors"
            >
              {role.name}
            </button>
          ))}
          {roles.length === 0 && (
            <p className="px-3 py-2 text-xs text-pinnacle-navy/40">Sin roles disponibles</p>
          )}
        </div>
      )}
    </div>
  );
};

export default RoleSwitcher;
