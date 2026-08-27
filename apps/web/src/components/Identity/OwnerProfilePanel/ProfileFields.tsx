import React from 'react';
import { FileText, Phone, Building2, Star } from 'lucide-react';
import ArchonField from '../../ArchonField';
import SpecialtiesSelect from '../../Common/SpecialtiesSelect';
import { ProfileForm } from './types';

export interface ProfileFieldsProps {
  form: ProfileForm;
  setForm: React.Dispatch<React.SetStateAction<ProfileForm>>;
  roleId: number;
}

/** Campos de identidad/contacto del perfil (FC163 F2B3, split de OwnerProfilePanel). */
export const ProfileFields: React.FC<ProfileFieldsProps> = ({ form, setForm, roleId }) => {
  const rfcLabel = roleId === 4 ? 'RFC (Opcional)' : 'RFC';
  const razonSocialLabel = roleId === 4 ? 'Nombre Legal' : 'Razón Social';

  return (
    <>
      <div className="grid grid-cols-2 gap-6">
        <ArchonField label={rfcLabel} icon={FileText}>
          <input
            type="text"
            className="archon-input"
            data-testid="owner-rfc-input"
            placeholder="RFC"
            value={form.rfc}
            onChange={(e): void => setForm((f) => ({ ...f, rfc: e.target.value }))}
          />
        </ArchonField>
        <ArchonField label={razonSocialLabel} icon={Building2}>
          <input
            type="text"
            className="archon-input"
            data-testid="owner-razon-social-input"
            placeholder={razonSocialLabel}
            value={form.razonSocial}
            onChange={(e): void => setForm((f) => ({ ...f, razonSocial: e.target.value }))}
          />
        </ArchonField>
      </div>

      <ArchonField label="Teléfono" icon={Phone}>
        <input
          type="text"
          className="archon-input"
          data-testid="owner-telefono-input"
          placeholder="10 dígitos"
          value={form.telefono}
          onChange={(e): void => setForm((f) => ({ ...f, telefono: e.target.value }))}
        />
      </ArchonField>

      {roleId === 3 && (
        <ArchonField label="Especialidades (Opcional)" icon={Star}>
          <SpecialtiesSelect
            value={form.especialidades}
            onChange={(codes): void => setForm((f) => ({ ...f, especialidades: codes }))}
          />
        </ArchonField>
      )}
    </>
  );
};
