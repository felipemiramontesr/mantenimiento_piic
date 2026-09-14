import React, { useState } from 'react';
import { User, Mail, Key, UserPlus } from 'lucide-react';
import ArchonField from '../../../components/ArchonField';

/**
 * FC176 F3 — Cosmology_UI_Seed_Admin_Form. Extracted out of `CosmologyForms.tsx` (which hit
 * ESLint's project-wide `max-lines:400` ceiling) — the optional "seed the Universo's first
 * admin" toggle + fields + local state consumed by `CreateUniverseForm`.
 */

interface InitialAdminFieldsProps {
  readonly fullName: string;
  readonly onFullName: (v: string) => void;
  readonly email: string;
  readonly onEmail: (v: string) => void;
  readonly password: string;
  readonly onPassword: (v: string) => void;
}

/** The 3-field grid for the Universo's optional first admin (`initialAdmin`). */
function InitialAdminFields({
  fullName,
  onFullName,
  email,
  onEmail,
  password,
  onPassword,
}: InitialAdminFieldsProps): React.JSX.Element {
  return (
    <div
      className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-2 duration-300"
      data-testid="initial-admin-fields"
    >
      <ArchonField label="Nombre Completo" icon={User} required>
        <input
          required
          value={fullName}
          onChange={(e): void => onFullName(e.target.value)}
          data-testid="initial-admin-fullname"
          className="archon-input"
        />
      </ArchonField>
      <ArchonField label="Correo Electrónico" icon={Mail} required>
        <input
          required
          type="email"
          value={email}
          onChange={(e): void => onEmail(e.target.value)}
          data-testid="initial-admin-email"
          className="archon-input"
        />
      </ArchonField>
      <ArchonField label="Contraseña Temporal" icon={Key} required>
        <input
          required
          type="password"
          minLength={8}
          value={password}
          onChange={(e): void => onPassword(e.target.value)}
          data-testid="initial-admin-password"
          className="archon-input"
        />
      </ArchonField>
    </div>
  );
}

interface InitialAdminToggleProps {
  readonly checked: boolean;
  readonly onChange: (v: boolean) => void;
}

/** Reveals `InitialAdminFields`; unchecked by default so the payload omits `initialAdmin`
 *  unless GrayMan opts in (truth table row 2: Ω sin `initialAdmin` → 201, solo tenant —
 *  comportamiento de FC160 F1 preservado exacto). */
function InitialAdminToggle({ checked, onChange }: InitialAdminToggleProps): React.JSX.Element {
  return (
    <label className="flex items-center gap-2 text-sm font-medium text-[#0f2a44]/70 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e): void => onChange(e.target.checked)}
        data-testid="create-universe-with-admin-toggle"
        className="w-4 h-4 accent-[#f2b705]"
      />
      <UserPlus size={16} />
      Crear con Administrador Inicial del Universo
    </label>
  );
}

export interface InitialAdminSectionProps {
  readonly includeAdmin: boolean;
  readonly onToggle: (v: boolean) => void;
  readonly fullName: string;
  readonly onFullName: (v: string) => void;
  readonly email: string;
  readonly onEmail: (v: string) => void;
  readonly password: string;
  readonly onPassword: (v: string) => void;
}

/** Toggle + conditional fields, grouped so `CreateUniverseForm`'s JSX stays under budget. */
export function InitialAdminSection({
  includeAdmin,
  onToggle,
  fullName,
  onFullName,
  email,
  onEmail,
  password,
  onPassword,
}: InitialAdminSectionProps): React.JSX.Element {
  return (
    <div className="space-y-4 border-t border-[#0f2a44]/10 pt-4">
      <InitialAdminToggle checked={includeAdmin} onChange={onToggle} />
      {includeAdmin && (
        <InitialAdminFields
          fullName={fullName}
          onFullName={onFullName}
          email={email}
          onEmail={onEmail}
          password={password}
          onPassword={onPassword}
        />
      )}
    </div>
  );
}

export interface InitialAdminPayload {
  fullName: string;
  email: string;
  password: string;
}

/** Local state + submit-readiness for the optional initialAdmin seed — extracted so
 *  `CreateUniverseForm` stays under the Gate 2 per-function budget. */
export function useInitialAdminState(): {
  props: InitialAdminSectionProps;
  payload: InitialAdminPayload | null;
  reset: () => void;
} {
  const [includeAdmin, setIncludeAdmin] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const reset = (): void => {
    setIncludeAdmin(false);
    setFullName('');
    setEmail('');
    setPassword('');
  };

  const complete = fullName.trim().length > 0 && email.trim().length > 0 && password.length >= 8;
  const payload = includeAdmin && complete ? { fullName, email, password } : null;

  return {
    props: {
      includeAdmin,
      onToggle: setIncludeAdmin,
      fullName,
      onFullName: setFullName,
      email,
      onEmail: setEmail,
      password,
      onPassword: setPassword,
    },
    payload,
    reset,
  };
}
