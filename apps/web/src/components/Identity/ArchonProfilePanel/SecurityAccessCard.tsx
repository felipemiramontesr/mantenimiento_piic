import React from 'react';
import { Mail, Shield, ShieldCheck } from 'lucide-react';
import ArchonField from '../../ArchonField';
import { ProfileFormData } from './types';
import PasswordFields from './PasswordFields';

export interface SecurityAccessCardProps {
  formData: ProfileFormData;
  setFormData: React.Dispatch<React.SetStateAction<ProfileFormData>>;
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
  roleName: string;
}

/** Panel "Seguridad y Acceso": correo, contraseña y rol (solo lectura). */
export default function SecurityAccessCard({
  formData,
  setFormData,
  showPassword,
  setShowPassword,
  roleName,
}: SecurityAccessCardProps): React.JSX.Element {
  return (
    <div className="card-archon-sovereign bg-white p-6 space-y-5 [--card-accent:#0f2a44]">
      <div className="archon-card-header-pro">
        <ShieldCheck size={20} className="text-[#0f2a44]" />
        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-[#0f2a44]">
          Seguridad y Acceso
        </h3>
      </div>
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ArchonField label="Correo Electrónico" icon={Mail} required>
            <input
              required
              type="email"
              className="archon-input"
              value={formData.email}
              onChange={(e): void => setFormData({ ...formData, email: e.target.value })}
            />
          </ArchonField>
          <PasswordFields
            formData={formData}
            setFormData={setFormData}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
          />
        </div>
        <div className="pt-4 border-t border-[#0f2a44]/5">
          <div className="flex items-center justify-between opacity-60">
            <div>
              <p className="text-archon-sm font-black uppercase tracking-widest text-[#0f2a44]">
                Rol de Sistema
              </p>
              <p className="text-xs font-bold text-[#0f2a44]">{roleName}</p>
            </div>
            <Shield size={20} className="text-[#0f2a44]/20" />
          </div>
        </div>
      </div>
    </div>
  );
}
