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

/**
 * 🔱 Archon Component: UserRegistrationForm
 * FC 082 F0c — el ALTA murió con POST /auth/register y /auth/sub-users
 * (bandas de roles {1,3,4}/{2,4,5} y concepto familiar — 084_AN §1a). El
 * formulario queda en modo EDICIÓN de identidades existentes; el alta renace
 * en F3 sobre el chasis Arc (§24.13 + Contrato de Onboarding §C).
 */

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

const UserRegistrationForm: React.FC = (): React.JSX.Element => {
  const {
    setActivePanel,
    editingUser,
    setEditingUser,
    updateUser,
    deleteUser,
    departments,
    roles,
  } = useUsers();
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [successData, setSuccessData] = useState<{ isEdit?: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // 🛡️ Audit State
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [auditAction, setAuditAction] = useState<'UPDATE' | 'DELETE'>('UPDATE');

  const [formData, setFormData] = useState({
    username: '',
    fullName: '',
    email: '',
    roleId: '',
    department: '',
    employeeNumber: '',
    imageUrl: '',
    password: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (editingUser) {
      setFormData({
        username: editingUser.username,
        fullName: editingUser.fullName,
        email: editingUser.email,
        roleId: String(editingUser.roleId),
        department: editingUser.department || '',
        employeeNumber: editingUser.employeeNumber || '',
        imageUrl: editingUser.imageUrl || '',
        password: '',
        confirmPassword: '',
      });
    }
  }, [editingUser, roles]);

  const handleUpdate = async (reason: string): Promise<void> => {
    if (!editingUser) return;
    const success = await updateUser(
      editingUser.id,
      {
        fullName: formData.fullName,
        email: formData.email.toLowerCase(),
        roleId: parseInt(formData.roleId, 10),
        department: formData.department,
        employeeNumber: formData.employeeNumber,
        imageUrl: formData.imageUrl,
        password: formData.password || undefined,
      },
      reason
    );

    if (success) {
      if (selectedFile && editingUser) {
        await uploadProfilePhoto(editingUser.id, selectedFile);
      }
      setSuccessData({ isEdit: true });
    } else {
      setError('Error de sincronización. Verifique que la contraseña tenga al menos 8 caracteres.');
    }
  };

  const handleDelete = async (reason: string): Promise<void> => {
    if (!editingUser) return;
    const success = await deleteUser(editingUser.id, reason);
    if (success) {
      setSuccessData({ isEdit: true });
    } else {
      setError('Error al intentar eliminar la identidad del sistema.');
    }
  };

  const handleConfirmAudit = async (reason: string): Promise<void> => {
    setIsSubmitting(true);
    try {
      if (auditAction === 'UPDATE') {
        await handleUpdate(reason);
      } else if (auditAction === 'DELETE' && editingUser) {
        await handleDelete(reason);
      }
    } catch (err) {
      setError('Falla crítica en el protocolo de auditoría.');
    } finally {
      setIsSubmitting(false);
      setIsAuditModalOpen(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);

    // 🛡️ Sentinel Validation Protocol
    if (!formData.fullName || !formData.username || !formData.email) {
      setError('Todos los campos marcados con (*) son obligatorios.');
      return;
    }

    if (!editingUser) {
      // FC 082 F0c — puerta de alta cerrada durante la transición de identidad.
      setError(
        'El alta de usuarios está deshabilitada durante la transición de identidad (FC 082); renace con el chasis Arc en F3.'
      );
      return;
    }

    setAuditAction('UPDATE');
    setIsAuditModalOpen(true);
  };

  const passwordsMatch = formData.password === formData.confirmPassword;
  const canSubmit = !formData.password || (passwordsMatch && formData.password.length >= 8);

  const sortedRoles = [...roles].sort((a, b) => a.id - b.id);

  if (successData) {
    return (
      <SuccessView
        data={successData}
        onClose={(): void => {
          setEditingUser(null);
          setActivePanel('DIRECTORY');
        }}
      />
    );
  }

  return (
    <>
      <form
        data-testid="registration-form"
        name="registration-form"
        onSubmit={handleFormSubmit}
        className="animate-in fade-in slide-in-from-bottom-8 duration-700 w-full pb-40 space-y-8"
      >
        {error && (
          <div
            data-testid="error-message"
            className="bg-red-50 border-l-4 border-red-500 p-6 animate-in fade-in slide-in-from-top-4"
          >
            <div className="flex items-center gap-4">
              <div className="bg-red-100 p-2 rounded-[4px]">
                <Shield size={18} className="text-red-500" />
              </div>
              <p className="text-archon-md uppercase font-black tracking-widest text-pinnacle-navy">
                {error}
              </p>
            </div>
          </div>
        )}

        {/* 🔱 ROL ARCHON — primer campo, ancho completo */}
        <div className="card-archon-sovereign bg-white px-10 py-8 [--card-accent:#0f2a44]">
          <div className="card-sovereign-header mb-6">
            <Shield size={22} className="text-pinnacle-navy" />
            <h3 className="card-sovereign-title text-archon-xl opacity-100">Rol Archon</h3>
          </div>
          <ArchonField label="Rol del Sistema" icon={Shield} required>
            <ArchonSelect
              options={sortedRoles.map((r) => ({ value: r.id.toString(), label: r.label }))}
              value={formData.roleId}
              onChange={(val: string): void => setFormData({ ...formData, roleId: val })}
            />
          </ArchonField>
        </div>

        <div className="archon-grid-2-sovereign">
          <div className="card-archon-sovereign bg-white p-10 space-y-8 [--card-accent:#10b981]">
            <div className="card-sovereign-header">
              <Contact size={22} className="text-[var(--card-accent)]" />
              <h3 className="card-sovereign-title text-archon-xl opacity-100">
                {editingUser ? 'Actualizar Identidad' : 'Identidad de Personal'}
              </h3>
            </div>

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

            <div className="pt-8 mt-4 border-t border-pinnacle-navy/5">
              <ArchonField label="Fotografía de Identidad" icon={ImageIcon}>
                <ArchonImageUploader
                  reducedHeight={true}
                  images={formData.imageUrl ? [formData.imageUrl] : []}
                  onChange={(imgs: string[]): void =>
                    setFormData({ ...formData, imageUrl: imgs[0] || '' })
                  }
                  onFileChange={(files: File[]): void => setSelectedFile(files[0] || null)}
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
          </div>

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
                      editingUser
                        ? 'Dejar vacío para no cambiar'
                        : 'Opcional (Auto-generada si vacío)'
                    }
                    className="archon-input pr-12"
                    value={formData.password}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                  />
                  <button
                    type="button"
                    onClick={(): void => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-[4px] text-pinnacle-navy/20 hover:text-pinnacle-yellow hover:bg-pinnacle-yellow/10 transition-all duration-300 flex items-center justify-center border-0 bg-transparent outline-none focus:outline-none"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </ArchonField>
            </div>

            {formData.password && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <ArchonField label="Confirmar Contraseña" icon={CheckCircle} required>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Repita la clave para validar"
                      className={`archon-input transition-all duration-300 ${
                        formData.confirmPassword && !passwordsMatch
                          ? 'border-red-200 bg-red-50/10'
                          : ''
                      }`}
                      value={formData.confirmPassword}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                        setFormData({ ...formData, confirmPassword: e.target.value })
                      }
                    />
                    {formData.confirmPassword && (
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
            )}
          </div>
        </div>

        <div className="archon-grid-2-sovereign mt-5 pt-0 border-t border-pinnacle-navy/5">
          <div className="flex gap-4">
            {editingUser && (
              <button
                type="button"
                onClick={(): void => {
                  setAuditAction('DELETE');
                  setIsAuditModalOpen(true);
                }}
                className="btn-sentinel-red w-full"
              >
                <Trash2 size={16} /> Eliminar Personal
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4 w-full">
            <button
              type="button"
              onClick={(): void => {
                setEditingUser(null);
                setActivePanel('DIRECTORY');
              }}
              className="btn-sentinel-red w-full"
            >
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
      </form>

      <AuditJustificationModal
        isOpen={isAuditModalOpen}
        onClose={(): void => setIsAuditModalOpen(false)}
        onConfirm={(reason: string): Promise<void> => handleConfirmAudit(reason)}
        title={
          auditAction === 'UPDATE'
            ? `Actualización de identidad para ${formData.fullName}`
            : `Baja definitiva del personal: ${formData.fullName}`
        }
        actionType={auditAction}
      />
    </>
  );
};

export default UserRegistrationForm;
