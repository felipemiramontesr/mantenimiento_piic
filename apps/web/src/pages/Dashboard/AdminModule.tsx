import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { useSovereignLayout } from '../../context/SovereignLayoutContext';
import usePermissions from '../../hooks/usePermissions';
import RolePermissionsMatrix from '../../components/Admin/RolePermissionsMatrix';

const AdminModule: React.FC = (): React.ReactElement => {
  const { setSectionData } = useSovereignLayout();
  const { isOmnipotent } = usePermissions();
  const navigate = useNavigate();
  const omnipotent = isOmnipotent();

  useEffect((): void => {
    if (!omnipotent) {
      navigate('/dashboard', { replace: true });
      return;
    }
    setSectionData('Administración', 'Control soberano de roles y permisos del sistema Archon');
  }, [setSectionData, omnipotent, navigate]);

  if (!omnipotent) return <></>;

  return (
    <div className="animate-in fade-in duration-700">
      <section className="archon-workspace-chassis">
        <div className="archon-axial-container">
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-6">
            {/* Header de módulo */}
            <div className="flex items-center gap-3 pb-2 border-b border-slate-200">
              <div className="w-8 h-8 rounded-[4px] bg-pinnacle-navy/10 flex items-center justify-center">
                <ShieldCheck size={16} className="text-pinnacle-navy" />
              </div>
              <div>
                <h2 className="text-[13px] font-black text-pinnacle-navy uppercase tracking-widest">
                  Roles y Permisos
                </h2>
                <p className="text-[10px] text-pinnacle-navy/50 font-medium">
                  Activa o desactiva permisos por rol. GrayMan es omnipotente — no aparece en la
                  matriz.
                </p>
              </div>
            </div>

            <RolePermissionsMatrix />
          </div>
        </div>
      </section>
    </div>
  );
};

export default AdminModule;
