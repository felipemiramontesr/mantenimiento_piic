import React, { useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import usePermissions from '../../hooks/usePermissions';
import { useSovereignLayout } from '../../context/SovereignLayoutContext';
import MailDiagnosticCard from './MailDiagnosticCard';

/**
 * FC190 F1 — Sovereign_Mail_Diagnostic_Tile_And_Dedicated_View. Página completa en
 * `/dashboard/system-settings/mail-diagnostic`, mismo patrón que `ForensicConsoleModule` (FC173
 * F1): guardia estricta que redirige a `/dashboard/system-settings` si `isOmegaStrict()===false`
 * (Scenario 2) — ni el router ni el componente exponen contenido a no-Ω. Monta `MailDiagnosticCard`
 * sin tocar su lógica ni la de `useMailTest` (invariante 2, Zero Logic Regressions).
 */
const MailDiagnosticModule: React.FC = (): React.ReactElement => {
  const { isOmegaStrict } = usePermissions();
  const navigate = useNavigate();
  const { setSectionData } = useSovereignLayout();

  useEffect(() => {
    setSectionData('Diagnóstico de Correo', 'Sonda Soberana de Transporte SMTP');
  }, [setSectionData]);

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
            data-testid="mail-diagnostic-back-link"
            className="flex items-center gap-2 text-sm font-bold text-pinnacle-navy/60 hover:text-pinnacle-navy mb-4"
          >
            <ArrowLeft size={16} /> Volver a Configuración del Sistema
          </button>
          <MailDiagnosticCard />
        </div>
      </section>
    </div>
  );
};

export default MailDiagnosticModule;
