import React from 'react';
import { Users, Mail, Key, ShieldCheck, ShieldAlert, Save } from 'lucide-react';
import type { PersonnelFormData } from './types';
import { getRoleName, ASSIGNABLE_ROLE_IDS } from './roles';

interface TextFieldProps {
  value: string;
  onChange: (v: string) => void;
}

/** Campo de identidad de usuario (FC163 F1B-3, split Alfa 219_AN — sub-split de PersonnelRegistrationForm). */
function UsernameField({ value, onChange }: TextFieldProps): React.JSX.Element {
  return (
    <div className="space-y-4">
      <label className="text-archon-base font-black uppercase opacity-40 flex items-center gap-2">
        <Users size={12} /> Identidad de Usuario
      </label>
      <input
        required
        value={value}
        onChange={(e: React.ChangeEvent<HTMLInputElement>): void => onChange(e.target.value)}
        className="w-full p-4 bg-gray-50 border border-gray-200 rounded text-sm font-bold outline-none focus:border-[#0f2a44] transition-all"
        placeholder="Ej. juan.perez"
      />
    </div>
  );
}

/** Campo de correo corporativo (FC163 F1B-3, split Alfa 219_AN — sub-split de PersonnelRegistrationForm). */
function EmailField({ value, onChange }: TextFieldProps): React.JSX.Element {
  return (
    <div className="space-y-4">
      <label className="text-archon-base font-black uppercase opacity-40 flex items-center gap-2">
        <Mail size={12} /> Correo Corporativo
      </label>
      <input
        required
        type="email"
        value={value}
        onChange={(e: React.ChangeEvent<HTMLInputElement>): void => onChange(e.target.value)}
        className="w-full p-4 bg-gray-50 border border-gray-200 rounded text-sm font-bold outline-none focus:border-[#0f2a44] transition-all"
        placeholder="email@piic.com.mx"
      />
    </div>
  );
}

/** Campo de credencial de acceso (FC163 F1B-3, split Alfa 219_AN — sub-split de PersonnelRegistrationForm). */
function PasswordField({ value, onChange }: TextFieldProps): React.JSX.Element {
  return (
    <div className="space-y-4">
      <label className="text-archon-base font-black uppercase opacity-40 flex items-center gap-2">
        <Key size={12} /> Credencial de Acceso
      </label>
      <input
        required
        type="password"
        value={value}
        onChange={(e: React.ChangeEvent<HTMLInputElement>): void => onChange(e.target.value)}
        className="w-full p-4 bg-gray-50 border border-gray-200 rounded text-sm font-bold outline-none focus:border-[#0f2a44] transition-all"
        placeholder="••••••••"
      />
    </div>
  );
}

interface RoleSelectorProps {
  roleId: number;
  onSelect: (roleId: number) => void;
}

/** Selector de nivel de autorización (rol) (FC163 F1B-3, split Alfa 219_AN — sub-split de PersonnelRegistrationForm). */
function RoleSelector({ roleId, onSelect }: RoleSelectorProps): React.JSX.Element {
  return (
    <div className="space-y-4">
      <label className="text-archon-base font-black uppercase opacity-40 flex items-center gap-2">
        <ShieldCheck size={12} /> Nivel de Autorización (Rol)
      </label>
      <div className="grid grid-cols-2 gap-2">
        {ASSIGNABLE_ROLE_IDS.map((rId) => (
          <button
            key={rId}
            type="button"
            onClick={(): void => onSelect(rId)}
            className={`p-3 rounded border text-archon-xs font-black uppercase transition-all text-center leading-tight ${
              roleId === rId
                ? 'bg-[#0f2a44] text-white border-[#0f2a44] shadow-lg'
                : 'bg-white border-gray-100 text-gray-400 hover:border-[#0f2a44]/20'
            }`}
          >
            {getRoleName(rId)}
          </button>
        ))}
      </div>
      <p className="text-archon-sm text-gray-400 italic mt-2">
        * El rol Master (Archon) está restringido a nivel de infraestructura.
      </p>
    </div>
  );
}

interface RegistrationSubmitButtonProps {
  isLoading: boolean;
}

/** Botón de guardado con estado de carga (FC163 F1B-3, split Alfa 219_AN — sub-split de PersonnelRegistrationForm). */
function RegistrationSubmitButton({ isLoading }: RegistrationSubmitButtonProps): React.JSX.Element {
  return (
    <div className="pt-8">
      <button
        type="submit"
        disabled={isLoading}
        className="btn-sentinel-emerald flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {isLoading ? (
          'Registrando...'
        ) : (
          <>
            <Save size={16} /> Guardar Identidad
          </>
        )}
      </button>
    </div>
  );
}

export interface PersonnelRegistrationFormProps {
  formData: PersonnelFormData;
  setFormData: (f: PersonnelFormData) => void;
  error: string | null;
  isLoading: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

/** Formulario de registro de personal (FC163 F1B-3, split Alfa 219_AN). */
export function PersonnelRegistrationForm({
  formData,
  setFormData,
  error,
  isLoading,
  onSubmit,
}: PersonnelRegistrationFormProps): React.JSX.Element {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border-l-4 border-red-500 flex items-center gap-3 text-red-700">
          <ShieldAlert size={18} />
          <span className="text-xs font-bold uppercase">{error}</span>
        </div>
      )}
      <UsernameField
        value={formData.username}
        onChange={(v): void => setFormData({ ...formData, username: v })}
      />
      <EmailField
        value={formData.email}
        onChange={(v): void => setFormData({ ...formData, email: v })}
      />
      <PasswordField
        value={formData.password}
        onChange={(v): void => setFormData({ ...formData, password: v })}
      />
      <RoleSelector
        roleId={formData.roleId}
        onSelect={(roleId): void => setFormData({ ...formData, roleId })}
      />
      <RegistrationSubmitButton isLoading={isLoading} />
    </form>
  );
}
