import React from 'react';
import { Key, CheckCircle, Eye, EyeOff } from 'lucide-react';
import ArchonField from '../../ArchonField';
import { ProfileFormData } from './types';

export interface NewPasswordFieldProps {
  password: string;
  onChange: (v: string) => void;
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
}

/** Input de nueva contraseña + toggle de visibilidad — extraído de
 * `PasswordFields` para mantenerlo bajo el presupuesto de Gate2 (FC165 F3
 * Slice3.1 Batch2, Dual-Gate Isolation). */
export function NewPasswordField({
  password,
  onChange,
  showPassword,
  setShowPassword,
}: NewPasswordFieldProps): React.JSX.Element {
  return (
    <ArchonField label="Nueva Contraseña" icon={Key}>
      <div className="relative">
        <input
          type={showPassword ? 'text' : 'password'}
          minLength={8}
          placeholder="Dejar vacío para mantener actual"
          className="archon-input pr-12"
          value={password}
          onChange={(e): void => onChange(e.target.value)}
        />
        <button
          type="button"
          onClick={(): void => setShowPassword(!showPassword)}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-[4px] text-[#0f2a44]/20 hover:text-[#f2b705] hover:bg-[#f2b705]/10 transition-all duration-300 flex items-center justify-center border-0 bg-transparent outline-none focus:outline-none"
        >
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </ArchonField>
  );
}

export interface ConfirmPasswordFieldProps {
  confirmPassword: string;
  onChange: (v: string) => void;
  showPassword: boolean;
  passwordsMatch: boolean;
}

/** Input de confirmación de contraseña + feedback de match — ver nota de
 * `NewPasswordField`. */
export function ConfirmPasswordField({
  confirmPassword,
  onChange,
  showPassword,
  passwordsMatch,
}: ConfirmPasswordFieldProps): React.JSX.Element {
  return (
    <div className="animate-in fade-in slide-in-from-top-2">
      <ArchonField label="Confirmar Nueva Contraseña" icon={CheckCircle} required>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            className={`archon-input ${
              confirmPassword && !passwordsMatch ? 'border-red-200 bg-red-50/10' : ''
            }`}
            value={confirmPassword}
            onChange={(e): void => onChange(e.target.value)}
          />
          {confirmPassword && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              {passwordsMatch ? (
                <CheckCircle size={16} className="text-emerald-500 animate-in zoom-in" />
              ) : (
                <span className="text-archon-base font-bold text-red-500 uppercase tracking-tighter">
                  No coincide
                </span>
              )}
            </div>
          )}
        </div>
      </ArchonField>
    </div>
  );
}

export interface PasswordFieldsProps {
  formData: ProfileFormData;
  setFormData: React.Dispatch<React.SetStateAction<ProfileFormData>>;
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
}

/** Campo de nueva contraseña + confirmación condicional (con feedback de match). */
export default function PasswordFields({
  formData,
  setFormData,
  showPassword,
  setShowPassword,
}: PasswordFieldsProps): React.JSX.Element {
  const passwordsMatch = formData.password === formData.confirmPassword;
  return (
    <div className="flex flex-col gap-3">
      <NewPasswordField
        password={formData.password}
        onChange={(password): void => setFormData({ ...formData, password })}
        showPassword={showPassword}
        setShowPassword={setShowPassword}
      />
      {formData.password && (
        <ConfirmPasswordField
          confirmPassword={formData.confirmPassword}
          onChange={(confirmPassword): void => setFormData({ ...formData, confirmPassword })}
          showPassword={showPassword}
          passwordsMatch={passwordsMatch}
        />
      )}
    </div>
  );
}
