import React, { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Shield,
  Contact,
  Briefcase,
  Save,
  CheckCircle,
  Hash,
  Image as ImageIcon,
  Key,
  Eye,
  EyeOff,
  Trash2,
} from 'lucide-react';
import { useUsers } from '../../context/UserContext';
import type { UserIndustrial } from '../../types/user';
import ArchonField from '../ArchonField';
import ArchonSelect from '../ArchonSelect';
import ArchonImageUploader from '../ArchonImageUploader';
import api from '../../api/client';
import AuditJustificationModal from '../Common/AuditJustificationModal';
import { compressImage } from '../../utils/imageUtils';

/**
 * FC 076 F2 (R2/R3) — POST /users/:id/upload-profile exige JSON
 * {image: base64, mime} (users.ts); el multipart/form-data previo producía
 * 400 "No image data received" en editar Y crear. Mismo patrón base64 que
 * ArchonProfilePanel (400px máx, JPEG 80%).
 */
const uploadProfilePhoto = async (userId: string | number, file: File): Promise<void> => {
  const { base64, mime } = await compressImage(file, 400, 0.8);
  await api.post(`/users/${String(userId)}/upload-profile`, { image: base64, mime });
};

/**
 * FC 076 F3 (S1) — las contraseñas temporales exigen regex R3_UPPER/LOWER/
 * DIGIT/SPECIAL; cada clase aporta al menos un carácter y el resto se rellena
 * del charset completo; el orden se baraja para no fijar posiciones.
 * A05/S2245 — índice aleatorio vía Web Crypto API (no Math.random()).
 */
const secureIndex = (max: number): number => crypto.getRandomValues(new Uint32Array(1))[0] % max;

export const buildTempPassword = (length = 12): string => {
  const classes = [
    'abcdefghijklmnopqrstuvwxyz',
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    '0123456789',
    '!@#$%^&*',
  ];
  const all = classes.join('');
  const pick = (set: string): string => set.charAt(secureIndex(set.length));
  const chars = classes.map(pick);
  while (chars.length < Math.max(length, classes.length)) {
    chars.push(pick(all));
  }
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = secureIndex(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
};

interface SuccessViewProps {
  data: { isEdit?: boolean };
  onClose: () => void;
}

const SuccessView: React.FC<SuccessViewProps> = ({ onClose }) => (
  <div className="card-archon-sovereign bg-white p-12 w-full flex flex-col items-center text-center space-y-8 rounded-[4px] border-t-emerald-500">
    <CheckCircle size={64} className="text-emerald-500 animate-in zoom-in duration-500" />
    <div className="space-y-4">
      <h2 className="text-2xl font-black text-pinnacle-navy uppercase tracking-tight">
        Actualización Exitosa
      </h2>
      <p className="text-pinnacle-navy/60 font-medium">
        La identidad ha sido sincronizada correctamente en los sistemas Archon.
      </p>
    </div>

    <button onClick={onClose} className="btn-sentinel-red">
      Volver al Directorio
    </button>
  </div>
);

interface UserFormData {
  username: string;
  fullName: string;
  email: string;
  department: string;
  employeeNumber: string;
  imageUrl: string;
  password: string;
  confirmPassword: string;
}

const EMPTY_FORM_DATA: UserFormData = {
  username: '',
  fullName: '',
  email: '',
  department: '',
  employeeNumber: '',
  imageUrl: '',
  password: '',
  confirmPassword: '',
};

interface UseEditableFormDataResult {
  formData: UserFormData;
  setFormData: React.Dispatch<React.SetStateAction<UserFormData>>;
  passwordsMatch: boolean;
  canSubmit: boolean;
}

/** Estado del formulario, sincronizado desde editingUser (FC163 F1B-1, split — completa el fix de aria-label). */
function useEditableFormData(editingUser: UserIndustrial | null): UseEditableFormDataResult {
  const [formData, setFormData] = useState<UserFormData>(EMPTY_FORM_DATA);

  useEffect(() => {
    if (editingUser) {
      setFormData({
        username: editingUser.username,
        fullName: editingUser.fullName,
        email: editingUser.email,
        department: editingUser.department || '',
        employeeNumber: editingUser.employeeNumber || '',
        imageUrl: editingUser.imageUrl || '',
        password: '',
        confirmPassword: '',
      });
    }
  }, [editingUser]);

  const passwordsMatch = formData.password === formData.confirmPassword;
  const canSubmit = !formData.password || (passwordsMatch && formData.password.length >= 8);

  return { formData, setFormData, passwordsMatch, canSubmit };
}

interface UseAuditFlowArgs {
  editingUser: UserIndustrial | null;
  formData: UserFormData;
  selectedFile: File | null;
  updateUser: (id: string, data: Partial<UserIndustrial>, reason: string) => Promise<boolean>;
  deleteUser: (id: string, reason: string) => Promise<boolean>;
}

interface UseAuditFlowResult {
  isSubmitting: boolean;
  error: string | null;
  isAuditModalOpen: boolean;
  auditAction: 'UPDATE' | 'DELETE';
  successData: { isEdit?: boolean } | null;
  handleFormSubmit: (e: React.FormEvent) => void;
  handleConfirmAudit: (reason: string) => Promise<void>;
  openDeleteAudit: () => void;
  closeAuditModal: () => void;
}

/** Valida campos obligatorios y la puerta de alta cerrada (FC163 F1B-1, split — sub-split de useAuditFlow). */
function validateRegistrationForm(
  formData: UserFormData,
  editingUser: UserIndustrial | null
): string | null {
  if (!formData.fullName || !formData.username || !formData.email) {
    return 'Todos los campos marcados con (*) son obligatorios.';
  }
  if (!editingUser) {
    // FC 082 F0c — puerta de alta cerrada durante la transición de identidad.
    return 'El alta de usuarios está deshabilitada durante la transición de identidad (FC 082); renace con el chasis Arc en F3.';
  }
  return null;
}

/** Construye el submit handler (validación + arranque de auditoría) (FC163 F1B-1, split — sub-split de useAuditFlow). */
function makeFormSubmitHandler(
  formData: UserFormData,
  editingUser: UserIndustrial | null,
  setError: (e: string | null) => void,
  startAudit: (action: 'UPDATE' | 'DELETE') => void
): (e: React.FormEvent) => void {
  return (e: React.FormEvent): void => {
    e.preventDefault();
    const validationError = validateRegistrationForm(formData, editingUser);
    setError(validationError);
    if (validationError) return;
    startAudit('UPDATE');
  };
}

interface PerformUpdateArgs {
  editingUser: UserIndustrial | null;
  formData: UserFormData;
  selectedFile: File | null;
  updateUser: (id: string, data: Partial<UserIndustrial>, reason: string) => Promise<boolean>;
}

interface AuditActionResult {
  ok: boolean;
  error?: string;
}

/** Ejecuta el update + upload de foto si aplica (FC163 F1B-1, split — sub-split de useAuditFlow). */
async function performUpdate(reason: string, args: PerformUpdateArgs): Promise<AuditActionResult> {
  const { editingUser, formData, selectedFile, updateUser } = args;
  if (!editingUser) return { ok: false };
  const success = await updateUser(
    editingUser.id,
    {
      fullName: formData.fullName,
      email: formData.email.toLowerCase(),
      department: formData.department,
      employeeNumber: formData.employeeNumber,
      imageUrl: formData.imageUrl,
      password: formData.password || undefined,
    },
    reason
  );
  if (!success) {
    return {
      ok: false,
      error: 'Error de sincronización. Verifique que la contraseña tenga al menos 8 caracteres.',
    };
  }
  if (selectedFile) await uploadProfilePhoto(editingUser.id, selectedFile);
  return { ok: true };
}

/** Ejecuta el delete (FC163 F1B-1, split — sub-split de useAuditFlow). */
async function performDelete(
  reason: string,
  editingUser: UserIndustrial | null,
  deleteUser: (id: string, reason: string) => Promise<boolean>
): Promise<AuditActionResult> {
  if (!editingUser) return { ok: false };
  const success = await deleteUser(editingUser.id, reason);
  return success
    ? { ok: true }
    : { ok: false, error: 'Error al intentar eliminar la identidad del sistema.' };
}

/** Flujo de guardar/eliminar detrás de la justificación de auditoría (FC163 F1B-1, split). */
function useAuditFlow({
  editingUser,
  formData,
  selectedFile,
  updateUser,
  deleteUser,
}: UseAuditFlowArgs): UseAuditFlowResult {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [auditAction, setAuditAction] = useState<'UPDATE' | 'DELETE'>('UPDATE');
  const [successData, setSuccessData] = useState<{ isEdit?: boolean } | null>(null);

  const startAudit = (action: 'UPDATE' | 'DELETE'): void => {
    setAuditAction(action);
    setIsAuditModalOpen(true);
  };

  const handleConfirmAudit = async (reason: string): Promise<void> => {
    setIsSubmitting(true);
    try {
      const result =
        auditAction === 'UPDATE'
          ? await performUpdate(reason, { editingUser, formData, selectedFile, updateUser })
          : await performDelete(reason, editingUser, deleteUser);
      if (result.ok) setSuccessData({ isEdit: true });
      else if (result.error) setError(result.error);
    } catch {
      setError('Falla crítica en el protocolo de auditoría.');
    } finally {
      setIsSubmitting(false);
      setIsAuditModalOpen(false);
    }
  };

  const handleFormSubmit = makeFormSubmitHandler(formData, editingUser, setError, startAudit);

  return {
    isSubmitting,
    error,
    isAuditModalOpen,
    auditAction,
    successData,
    handleFormSubmit,
    handleConfirmAudit,
    openDeleteAudit: (): void => startAudit('DELETE'),
    closeAuditModal: (): void => setIsAuditModalOpen(false),
  };
}

interface ErrorBannerProps {
  message: string;
}

/** Banner de error del formulario (FC163 F1B-1, split). */
const ErrorBanner: React.FC<ErrorBannerProps> = ({ message }) => (
  <div
    data-testid="error-message"
    className="bg-red-50 border-l-4 border-red-500 p-6 animate-in fade-in slide-in-from-top-4"
  >
    <div className="flex items-center gap-4">
      <div className="bg-red-100 p-2 rounded-[4px]">
        <Shield size={18} className="text-red-500" />
      </div>
      <p className="text-archon-md uppercase font-black tracking-widest text-pinnacle-navy">
        {message}
      </p>
    </div>
  </div>
);

interface PasswordVisibilityToggleProps {
  showPassword: boolean;
  onToggle: () => void;
}

/** Botón de mostrar/ocultar contraseña (FC163 F1B-1, split — completa el fix de aria-label que quedó sin commitear). */
const PasswordVisibilityToggle: React.FC<PasswordVisibilityToggleProps> = ({
  showPassword,
  onToggle,
}) => (
  <button
    type="button"
    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
    onClick={onToggle}
    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-[4px] text-pinnacle-navy/20 hover:text-pinnacle-yellow hover:bg-pinnacle-yellow/10 transition-all duration-300 flex items-center justify-center border-0 bg-transparent outline-none focus:outline-none"
  >
    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
  </button>
);

interface IdentityBasicFieldsProps {
  editingUser: UserIndustrial | null;
  formData: UserFormData;
  setFormData: React.Dispatch<React.SetStateAction<UserFormData>>;
}

/** Nombre/usuario/empleado (FC163 F1B-1, split — sub-split de IdentityCard). */
const IdentityBasicFields: React.FC<IdentityBasicFieldsProps> = ({
  editingUser,
  formData,
  setFormData,
}) => (
  <>
    <ArchonField label="Nombre Completo" icon={User} required>
      <input
        type="text"
        placeholder="Ej. Ana Karen Flores Baca"
        className="archon-input"
        value={formData.fullName}
        onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
          setFormData({ ...formData, fullName: e.target.value })
        }
      />
    </ArchonField>

    <div className="grid grid-cols-2 gap-8">
      <ArchonField label="Usuario (Login)" icon={Shield} required>
        <input
          type="text"
          placeholder="aflores"
          className="archon-input"
          disabled={!!editingUser}
          value={formData.username}
          onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
            setFormData({ ...formData, username: e.target.value.toLowerCase() })
          }
        />
      </ArchonField>
      <ArchonField label="No. de Empleado" icon={Hash}>
        <input
          type="text"
          placeholder="EMP-XXX"
          className="archon-input"
          value={formData.employeeNumber}
          onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
            setFormData({ ...formData, employeeNumber: e.target.value })
          }
        />
      </ArchonField>
    </div>
  </>
);

interface IdentityPhotoFieldProps {
  formData: UserFormData;
  setFormData: React.Dispatch<React.SetStateAction<UserFormData>>;
  onFileChange: (file: File | null) => void;
}

/** Fotografía de identidad (FC163 F1B-1, split — sub-split de IdentityCard). */
const IdentityPhotoField: React.FC<IdentityPhotoFieldProps> = ({
  formData,
  setFormData,
  onFileChange,
}) => (
  <div className="pt-8 mt-4 border-t border-pinnacle-navy/5">
    <ArchonField label="Fotografía de Identidad" icon={ImageIcon}>
      <ArchonImageUploader
        reducedHeight={true}
        images={formData.imageUrl ? [formData.imageUrl] : []}
        onChange={(imgs: string[]): void => setFormData({ ...formData, imageUrl: imgs[0] || '' })}
        onFileChange={(files: File[]): void => onFileChange(files[0] || null)}
        maxImages={1}
        title="Arrastra tu fotografía de perfil"
        allowedFormats="JPG, PNG"
        accept="image/jpeg, image/png"
        variant="square"
      />
    </ArchonField>
    <p className="text-archon-base uppercase tracking-widest opacity-40 mt-4 text-center">
      Estándar Archon: Formato cuadrado recomendado
    </p>
  </div>
);

interface IdentityCardProps {
  editingUser: UserIndustrial | null;
  formData: UserFormData;
  setFormData: React.Dispatch<React.SetStateAction<UserFormData>>;
  onFileChange: (file: File | null) => void;
}

/** Tarjeta izquierda: identidad de personal (nombre/usuario/empleado/foto) (FC163 F1B-1, split). */
const IdentityCard: React.FC<IdentityCardProps> = ({
  editingUser,
  formData,
  setFormData,
  onFileChange,
}) => (
  <div className="card-archon-sovereign bg-white p-10 space-y-8 [--card-accent:#10b981]">
    <div className="card-sovereign-header">
      <Contact size={22} className="text-[var(--card-accent)]" />
      <h3 className="card-sovereign-title text-archon-xl opacity-100">
        {editingUser ? 'Actualizar Identidad' : 'Identidad de Personal'}
      </h3>
    </div>
    <IdentityBasicFields editingUser={editingUser} formData={formData} setFormData={setFormData} />
    <IdentityPhotoField formData={formData} setFormData={setFormData} onFileChange={onFileChange} />
  </div>
);

interface PasswordFieldProps {
  editingUser: UserIndustrial | null;
  password: string;
  onChange: (v: string) => void;
  showPassword: boolean;
  onTogglePassword: () => void;
}

/** Campo de contraseña + toggle de visibilidad (FC163 F1B-1, split — sub-split de PasswordFieldsSection). */
const PasswordField: React.FC<PasswordFieldProps> = ({
  editingUser,
  password,
  onChange,
  showPassword,
  onTogglePassword,
}) => (
  <div className="relative">
    <ArchonField
      label={editingUser ? 'Nueva Contraseña (Opcional)' : 'Contraseña de Acceso'}
      icon={Key}
    >
      <div className="relative">
        <input
          type={showPassword ? 'text' : 'password'}
          minLength={8}
          placeholder={
            editingUser ? 'Dejar vacío para no cambiar' : 'Opcional (Auto-generada si vacío)'
          }
          className="archon-input pr-12"
          value={password}
          onChange={(e: React.ChangeEvent<HTMLInputElement>): void => onChange(e.target.value)}
        />
        <PasswordVisibilityToggle showPassword={showPassword} onToggle={onTogglePassword} />
      </div>
    </ArchonField>
  </div>
);

interface ConfirmPasswordFieldProps {
  password: string;
  confirmPassword: string;
  onChange: (v: string) => void;
  showPassword: boolean;
  passwordsMatch: boolean;
}

/** Campo de confirmación de contraseña (FC163 F1B-1, split — sub-split de PasswordFieldsSection). */
const ConfirmPasswordField: React.FC<ConfirmPasswordFieldProps> = ({
  password,
  confirmPassword,
  onChange,
  showPassword,
  passwordsMatch,
}) => {
  if (!password) return null;
  return (
    <div className="animate-in fade-in slide-in-from-top-2 duration-300">
      <ArchonField label="Confirmar Contraseña" icon={CheckCircle} required>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="Repita la clave para validar"
            className={`archon-input transition-all duration-300 ${
              confirmPassword && !passwordsMatch ? 'border-red-200 bg-red-50/10' : ''
            }`}
            value={confirmPassword}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => onChange(e.target.value)}
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
};

interface PasswordFieldsSectionProps {
  editingUser: UserIndustrial | null;
  formData: UserFormData;
  setFormData: React.Dispatch<React.SetStateAction<UserFormData>>;
  showPassword: boolean;
  onTogglePassword: () => void;
  passwordsMatch: boolean;
}

/** Campos de contraseña + confirmación (FC163 F1B-1, split — sub-split de ProfileCard). */
const PasswordFieldsSection: React.FC<PasswordFieldsSectionProps> = ({
  editingUser,
  formData,
  setFormData,
  showPassword,
  onTogglePassword,
  passwordsMatch,
}) => (
  <>
    <PasswordField
      editingUser={editingUser}
      password={formData.password}
      onChange={(v): void => setFormData({ ...formData, password: v })}
      showPassword={showPassword}
      onTogglePassword={onTogglePassword}
    />
    <ConfirmPasswordField
      password={formData.password}
      confirmPassword={formData.confirmPassword}
      onChange={(v): void => setFormData({ ...formData, confirmPassword: v })}
      showPassword={showPassword}
      passwordsMatch={passwordsMatch}
    />
  </>
);

interface ProfileCardProps {
  editingUser: UserIndustrial | null;
  formData: UserFormData;
  setFormData: React.Dispatch<React.SetStateAction<UserFormData>>;
  departments: string[];
  showPassword: boolean;
  onTogglePassword: () => void;
  passwordsMatch: boolean;
}

/** Tarjeta derecha: perfil industrial (correo/departamento/contraseñas) (FC163 F1B-1, split). */
const ProfileCard: React.FC<ProfileCardProps> = ({
  editingUser,
  formData,
  setFormData,
  departments,
  showPassword,
  onTogglePassword,
  passwordsMatch,
}) => (
  <div className="card-archon-sovereign bg-white p-10 space-y-8 [--card-accent:#0f2a44]">
    <div className="card-sovereign-header">
      <Briefcase size={22} className="text-[var(--card-accent)]" />
      <h3 className="card-sovereign-title text-archon-xl opacity-100">Perfil Industrial</h3>
    </div>

    <ArchonField label="Correo Electrónico" icon={Mail} required>
      <input
        type="email"
        placeholder="ana.karen@piic.com.mx"
        className="archon-input"
        value={formData.email}
        onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
          setFormData({ ...formData, email: e.target.value })
        }
      />
    </ArchonField>

    <ArchonField label="Departamento" icon={Briefcase}>
      <ArchonSelect
        options={departments}
        value={formData.department}
        onChange={(val: string): void => setFormData({ ...formData, department: val })}
      />
    </ArchonField>

    <PasswordFieldsSection
      editingUser={editingUser}
      formData={formData}
      setFormData={setFormData}
      showPassword={showPassword}
      onTogglePassword={onTogglePassword}
      passwordsMatch={passwordsMatch}
    />
  </div>
);

interface FormActionsBarProps {
  editingUser: UserIndustrial | null;
  isSubmitting: boolean;
  canSubmit: boolean;
  onDeleteClick: () => void;
  onCancelClick: () => void;
}

/** Barra de acciones: eliminar/cancelar/guardar (FC163 F1B-1, split). */
const FormActionsBar: React.FC<FormActionsBarProps> = ({
  editingUser,
  isSubmitting,
  canSubmit,
  onDeleteClick,
  onCancelClick,
}) => (
  <div className="archon-grid-2-sovereign mt-5 pt-0 border-t border-pinnacle-navy/5">
    <div className="flex gap-4">
      {editingUser && (
        <button type="button" onClick={onDeleteClick} className="btn-sentinel-red w-full">
          <Trash2 size={16} /> Eliminar Personal
        </button>
      )}
    </div>
    <div className="grid grid-cols-2 gap-4 w-full">
      <button type="button" onClick={onCancelClick} className="btn-sentinel-red w-full">
        Cancelar
      </button>
      <button
        type="submit"
        disabled={isSubmitting || !canSubmit}
        className={`btn-sentinel-emerald w-full ${
          !canSubmit ? 'opacity-50 grayscale cursor-not-allowed' : ''
        }`}
      >
        {isSubmitting && 'Transmitiendo...'}
        {!isSubmitting && (editingUser ? 'Sincronizar Cambios' : 'Confirmar Alta')}
        <Save size={16} />
      </button>
    </div>
  </div>
);

/** Título del modal de auditoría según la acción en curso (FC163 F1B-1, split). */
function auditModalTitle(auditAction: 'UPDATE' | 'DELETE', fullName: string): string {
  return auditAction === 'UPDATE'
    ? `Actualización de identidad para ${fullName}`
    : `Baja definitiva del personal: ${fullName}`;
}

interface RegistrationFormViewProps {
  editingUser: UserIndustrial | null;
  formData: UserFormData;
  setFormData: React.Dispatch<React.SetStateAction<UserFormData>>;
  departments: string[];
  showPassword: boolean;
  onTogglePassword: () => void;
  passwordsMatch: boolean;
  canSubmit: boolean;
  isSubmitting: boolean;
  error: string | null;
  onFileChange: (file: File | null) => void;
  onSubmit: (e: React.FormEvent) => void;
  onDeleteClick: () => void;
  onCancelClick: () => void;
  isAuditModalOpen: boolean;
  auditAction: 'UPDATE' | 'DELETE';
  onCloseAuditModal: () => void;
  onConfirmAudit: (reason: string) => Promise<void>;
}

/** Ensambla el formulario completo (tarjetas + acciones + modal de auditoría) (FC163 F1B-1, split — sub-split del orquestador). */
const RegistrationFormView: React.FC<RegistrationFormViewProps> = (props) => (
  <>
    <form
      data-testid="registration-form"
      name="registration-form"
      onSubmit={props.onSubmit}
      className="animate-in fade-in slide-in-from-bottom-8 duration-700 w-full pb-40 space-y-8"
    >
      {props.error && <ErrorBanner message={props.error} />}

      <div className="archon-grid-2-sovereign">
        <IdentityCard
          editingUser={props.editingUser}
          formData={props.formData}
          setFormData={props.setFormData}
          onFileChange={props.onFileChange}
        />
        <ProfileCard
          editingUser={props.editingUser}
          formData={props.formData}
          setFormData={props.setFormData}
          departments={props.departments}
          showPassword={props.showPassword}
          onTogglePassword={props.onTogglePassword}
          passwordsMatch={props.passwordsMatch}
        />
      </div>

      <FormActionsBar
        editingUser={props.editingUser}
        isSubmitting={props.isSubmitting}
        canSubmit={props.canSubmit}
        onDeleteClick={props.onDeleteClick}
        onCancelClick={props.onCancelClick}
      />
    </form>

    <AuditJustificationModal
      isOpen={props.isAuditModalOpen}
      onClose={props.onCloseAuditModal}
      onConfirm={props.onConfirmAudit}
      title={auditModalTitle(props.auditAction, props.formData.fullName)}
      actionType={props.auditAction}
    />
  </>
);

/**
 * 🔱 Archon Component: UserRegistrationForm
 * FC 082 F0c — el ALTA murió con POST /auth/register y /auth/sub-users
 * (bandas de roles {1,3,4}/{2,4,5} y concepto familiar — 084_AN §1a). El
 * formulario queda en modo EDICIÓN de identidades existentes; el alta renace
 * en F3 sobre el chasis Arc (§24.13 + Contrato de Onboarding §C).
 */
const UserRegistrationForm: React.FC = (): React.JSX.Element => {
  const { setActivePanel, editingUser, setEditingUser, updateUser, deleteUser, departments } =
    useUsers();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const { formData, setFormData, passwordsMatch, canSubmit } = useEditableFormData(editingUser);
  const {
    isSubmitting,
    error,
    isAuditModalOpen,
    auditAction,
    successData,
    handleFormSubmit,
    handleConfirmAudit,
    openDeleteAudit,
    closeAuditModal,
  } = useAuditFlow({ editingUser, formData, selectedFile, updateUser, deleteUser });

  const closeToDirectory = (): void => {
    setEditingUser(null);
    setActivePanel('DIRECTORY');
  };

  if (successData) {
    return <SuccessView data={successData} onClose={closeToDirectory} />;
  }

  return (
    <RegistrationFormView
      editingUser={editingUser}
      formData={formData}
      setFormData={setFormData}
      departments={departments}
      showPassword={showPassword}
      onTogglePassword={(): void => setShowPassword(!showPassword)}
      passwordsMatch={passwordsMatch}
      canSubmit={canSubmit}
      isSubmitting={isSubmitting}
      error={error}
      onFileChange={setSelectedFile}
      onSubmit={handleFormSubmit}
      onDeleteClick={openDeleteAudit}
      onCancelClick={closeToDirectory}
      isAuditModalOpen={isAuditModalOpen}
      auditAction={auditAction}
      onCloseAuditModal={closeAuditModal}
      onConfirmAudit={handleConfirmAudit}
    />
  );
};

export default UserRegistrationForm;
