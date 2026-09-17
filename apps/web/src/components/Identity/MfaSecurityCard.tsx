import React, { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import ArchonModal from '../UI/ArchonModal';
import MfaEnrollmentWizard from './MfaEnrollment/MfaEnrollmentWizard';

/**
 * FC185 F3 — entrada voluntaria al asistente de MFA desde Configuración de Identidad (Arc
 * opt-in, o cualquiera que quiera reforzar su cuenta antes de que le toque el mandato). No hay
 * endpoint de "estado de MFA" (F1/F2 no lo expusieron — fuera del alcance literal del FC), así que
 * esta tarjeta ofrece "Configurar segundo factor" de forma incondicional en vez de fingir saber si
 * ya está activo; llamar a `/mfa/setup` de nuevo simplemente reemplaza el secreto pendiente
 * (upsert, F1), consistente con "reconfigurar".
 */
export default function MfaSecurityCard(): React.JSX.Element {
  const [wizardOpen, setWizardOpen] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);

  const handleComplete = (): void => {
    setWizardOpen(false);
    setJustCompleted(true);
  };

  return (
    <div className="card-archon-sovereign bg-white p-6 space-y-4 [--card-accent:#0f2a44]">
      <div className="card-sovereign-header">
        <ShieldCheck size={22} className="text-[var(--card-accent)]" />
        <h3 className="card-sovereign-title text-archon-xl opacity-100">
          Autenticación de Dos Factores
        </h3>
      </div>
      <p className="text-sm text-[#0f2a44]/70">
        Protege tu cuenta con un código temporal de tu app autenticadora, además de tu contraseña.
      </p>
      {justCompleted && (
        <div
          data-testid="mfa-security-card-success"
          className="p-3 bg-emerald-500/10 text-emerald-700 text-sm font-bold rounded-[4px] border-l-4 border-emerald-500"
        >
          MFA configurado correctamente.
        </div>
      )}
      <button
        type="button"
        onClick={(): void => setWizardOpen(true)}
        data-testid="mfa-security-card-open"
        className="inline-flex items-center h-11 px-5 text-sm font-bold text-white bg-[#0f2a44] hover:bg-[#0f2a44]/90 rounded-[4px]"
      >
        Configurar segundo factor
      </button>

      <ArchonModal
        isOpen={wizardOpen}
        onClose={(): void => setWizardOpen(false)}
        ariaLabel="Configurar autenticación de dos factores"
      >
        <div className="p-8">
          <MfaEnrollmentWizard onComplete={handleComplete} />
        </div>
      </ArchonModal>
    </div>
  );
}
