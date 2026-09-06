import React from 'react';
import { User, Shield, Hash, Contact, Image as ImageIcon } from 'lucide-react';
import ArchonField from '../../ArchonField';
import ArchonImageUploader from '../../ArchonImageUploader';
import { resolveProfileImageUrl } from '../../../utils/imageUtils';
import { ProfileFormData } from './types';

export interface ProfilePhotoFieldProps {
  imageUrl: string;
  onImageUrlChange: (url: string) => void;
  setSelectedFile: (f: File | null) => void;
}

/** Campo de fotografía de perfil — extraído de `PersonalDataCard` para
 * mantenerlo bajo el presupuesto de Gate2 (FC165 F3 Slice3.1 Batch2,
 * Dual-Gate Isolation). */
export function ProfilePhotoField({
  imageUrl,
  onImageUrlChange,
  setSelectedFile,
}: ProfilePhotoFieldProps): React.JSX.Element {
  const currentPreviewUrl = resolveProfileImageUrl(imageUrl);
  return (
    <ArchonField label="Fotografía de Perfil" icon={ImageIcon}>
      <ArchonImageUploader
        images={currentPreviewUrl ? [currentPreviewUrl] : []}
        onChange={(imgs): void => onImageUrlChange(imgs[0] || '')}
        // FC165 F3 Slice3.1 — purga: `ArchonImageUploader`'s `notifyFileChange`
        // ya exige `files.length>0` antes de invocar `onFileChange` (guard
        // interno propio), así que `files[0]` nunca llega undefined aquí
        // (censo vivo: 0 hits en el fallback `|| null` tras la suite completa).
        onFileChange={(files): void => setSelectedFile(files[0])}
        maxImages={1}
        title="Arrastra tu fotografía de perfil"
        allowedFormats="JPG, PNG"
        accept="image/jpeg, image/png"
        variant="square"
        reducedHeight
      />
    </ArchonField>
  );
}

interface IdentityFieldsProps {
  fullName: string;
  employeeNumber: string;
  username: string;
  onFullNameChange: (v: string) => void;
  onEmployeeNumberChange: (v: string) => void;
}

/** Nombre completo + usuario (solo lectura) + no. de empleado — extraído de
 * `PersonalDataCard` para mantenerlo bajo el presupuesto de Gate2 (FC165 F3
 * Slice3.1 Batch2, Dual-Gate Isolation). */
function IdentityFields({
  fullName,
  employeeNumber,
  username,
  onFullNameChange,
  onEmployeeNumberChange,
}: IdentityFieldsProps): React.JSX.Element {
  return (
    <>
      <ArchonField label="Nombre Completo" icon={User} required>
        <input
          required
          type="text"
          className="archon-input"
          value={fullName}
          onChange={(e): void => onFullNameChange(e.target.value)}
        />
      </ArchonField>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ArchonField label="Usuario (Inalterable)" icon={Shield}>
          <input
            type="text"
            className="archon-input opacity-50 cursor-not-allowed"
            disabled
            value={username}
          />
        </ArchonField>
        <ArchonField label="No. de Empleado" icon={Hash}>
          <input
            type="text"
            className="archon-input"
            value={employeeNumber}
            onChange={(e): void => onEmployeeNumberChange(e.target.value)}
          />
        </ArchonField>
      </div>
    </>
  );
}

export interface PersonalDataCardProps {
  formData: ProfileFormData;
  setFormData: React.Dispatch<React.SetStateAction<ProfileFormData>>;
  username: string;
  setSelectedFile: (f: File | null) => void;
}

/** Panel "Información Personal": nombre, usuario, no. de empleado y foto. */
export default function PersonalDataCard({
  formData,
  setFormData,
  username,
  setSelectedFile,
}: PersonalDataCardProps): React.JSX.Element {
  return (
    <div className="card-archon-sovereign bg-white p-6 space-y-5 [--card-accent:#10b981]">
      <div className="archon-card-header-pro">
        <Contact size={20} className="text-[#10b981]" />
        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-[#0f2a44]">
          Información Personal
        </h3>
      </div>
      <div className="space-y-4">
        <IdentityFields
          fullName={formData.fullName}
          employeeNumber={formData.employeeNumber}
          username={username}
          onFullNameChange={(fullName): void => setFormData({ ...formData, fullName })}
          onEmployeeNumberChange={(employeeNumber): void =>
            setFormData({ ...formData, employeeNumber })
          }
        />
        <div className="pt-4 border-t border-[#0f2a44]/5">
          <ProfilePhotoField
            imageUrl={formData.imageUrl}
            onImageUrlChange={(imageUrl): void => setFormData({ ...formData, imageUrl })}
            setSelectedFile={setSelectedFile}
          />
        </div>
      </div>
    </div>
  );
}
