import React from 'react';
import { Navigate, useNavigate } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import usePermissions from '../../hooks/usePermissions';
import ArchonDoctor from '../../ArchonDoctor';

/**
 * FC173 F1 — Forensic_Console_Full_Page_Module.
 * Página completa de diagnóstico soberano en `/dashboard/system-settings/forensics`,
 * reemplaza el dock flotante que `ArchonDoctor` usaba desde FC171/172. Guardia
 * estricta: redirige a `/dashboard/system-settings` si `isOmegaStrict()===false`
 * (Scenario 3) — ni el router ni el componente exponen contenido a no-Ω.
 */
const ForensicConsoleModule: React.FC = (): React.ReactElement => {
  const { isOmegaStrict } = usePermissions();
  const navigate = useNavigate();

  if (!isOmegaStrict()) {
    return <Navigate to="/dashboard/system-settings" replace />;
  }

  const goBack = (): void => {
    navigate('/dashboard/system-settings');
  };

  return (
    <div className="animate-in fade-in duration-700">
      <section className="archon-workspace-chassis">
        <div className="archon-axial-container">
          <button
            type="button"
            onClick={goBack}
            data-testid="forensics-back-link"
            className="flex items-center gap-2 text-sm font-bold text-pinnacle-navy/60 hover:text-pinnacle-navy mb-4"
          >
            <ArrowLeft size={16} /> Volver a Configuración del Sistema
          </button>
          <ArchonDoctor isOpen onClose={goBack} />
        </div>
      </section>
    </div>
  );
};

export default ForensicConsoleModule;
