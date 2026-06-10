import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Users } from 'lucide-react';
import { useSovereignLayout } from '../../context/SovereignLayoutContext';
import usePermissions from '../../hooks/usePermissions';
import RolePermissionsMatrix from '../../components/Admin/RolePermissionsMatrix';
import RolesManager from '../../components/Admin/RolesManager';

const AdminModule: React.FC = (): React.ReactElement => {
  const { setSectionData } = useSovereignLayout();
  const { hasPermission } = usePermissions();
  const navigate = useNavigate();
  const canManage = hasPermission('system:manage_roles');

  useEffect((): void => {
    if (!canManage) {
      navigate('/dashboard', { replace: true });
      return;
    }
    setSectionData('Panel de Control', 'Gestión soberana de roles y permisos del sistema Archon');
  }, [setSectionData, canManage, navigate]);

  if (!canManage) return <></>;

  return (
    <div className="animate-in fade-in duration-700">
      <section className="archon-workspace-chassis">
        <div className="archon-axial-container">
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-8">
            {/* Card 1 — Gestión de Roles */}
            <div className="card-archon-sovereign space-y-4">
              <div className="flex items-center gap-3 pb-2 border-b border-slate-200">
                <div className="w-8 h-8 rounded-[4px] bg-pinnacle-navy/10 flex items-center justify-center">
                  <Users size={16} className="text-pinnacle-navy" />
                </div>
                <div>
                  <h2 className="text-archon-lg font-black text-pinnacle-navy uppercase tracking-widest">
                    Gestión de Roles
                  </h2>
                  <p className="text-archon-base text-pinnacle-navy/50 font-medium">
                    Crear, editar o eliminar roles del sistema. El rol Archon es intocable.
                  </p>
                </div>
              </div>
              <RolesManager />
            </div>

            {/* Card 2 — Matriz de Permisos */}
            <div className="card-archon-sovereign space-y-4">
              <div className="flex items-center gap-3 pb-2 border-b border-slate-200">
                <div className="w-8 h-8 rounded-[4px] bg-pinnacle-navy/10 flex items-center justify-center">
                  <ShieldCheck size={16} className="text-pinnacle-navy" />
                </div>
                <div>
                  <h2 className="text-archon-lg font-black text-pinnacle-navy uppercase tracking-widest">
                    Matriz de Permisos
                  </h2>
                  <p className="text-archon-base text-pinnacle-navy/50 font-medium">
                    Activa o desactiva permisos por rol. Archon es omnipotente — no aparece en la
                    matriz.
                  </p>
                </div>
              </div>
              <RolePermissionsMatrix />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AdminModule;
