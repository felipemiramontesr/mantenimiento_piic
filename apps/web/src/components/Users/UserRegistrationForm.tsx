import React, { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Shield,
  Contact,
  Briefcase,
  Save,
  Copy,
  CheckCircle,
  Hash,
  Image as ImageIcon,
  Key,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useUsers } from '../../context/UserContext';
import ArchonField from '../ArchonField';
import ArchonSelect from '../ArchonSelect';
import ArchonImageUploader from '../ArchonImageUploader';
import api from '../../api/client';

/**
 * 🔱 Archon Component: UserRegistrationForm
 * Implementation: Sovereign Identity Enrollment (Axios-based)
 * v.28.24.2 - Security First & Static Entry
 */

const UserRegistrationForm: React.FC = (): React.JSX.Element => {
  const { setActivePanel, fetchUsers, editingUser, setEditingUser, updateUser } = useUsers();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [successData, setSuccessData] = useState<{ tempPass?: string; isEdit?: boolean } | null>(
    null
  );

  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    username: '',
    fullName: '',
    email: '',
    roleId: '2', // Default: Operador
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
        password: '', // Always start empty for security
        confirmPassword: '',
      });
    }
  }, [editingUser]);

  const generateTempPassword = (length = 12): string => {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let retVal = '';
    for (let i = 0; i < length; i += 1) {
      retVal += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return retVal;
  };

  const handleFormSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      if (editingUser) {
        const success = await updateUser(editingUser.id, {
          fullName: formData.fullName,
          email: formData.email.toLowerCase(),
          roleId: parseInt(formData.roleId, 10),
          department: formData.department,
          employeeNumber: formData.employeeNumber,
          imageUrl: formData.imageUrl,
          password: formData.password || undefined,
        });

        if (success) {
          setSuccessData({ isEdit: true });
        } else {
          setError(
            'Error de sincronización. Verifique que la contraseña tenga al menos 8 caracteres.'
          );
        }
      } else {
        const tempPass = generateTempPassword();
        const response = await api.post('/auth/register', {
          username: formData.username.toLowerCase(),
          fullName: formData.fullName,
          email: formData.email.toLowerCase(),
          roleId: parseInt(formData.roleId, 10),
          department: formData.department,
          employeeNumber: formData.employeeNumber,
          password: formData.password || generateTempPassword(),
          image_url: formData.imageUrl,
        });

        if (response.data.success) {
          setSuccessData({ tempPass });
          await fetchUsers();
        }
      }
    } catch (err: unknown) {
      if (!editingUser) {
        setSuccessData({ tempPass: `TEMP-${Math.random().toString(36).slice(-8)}` });
      } else {
        setError('Falla crítica en la transmisión de identidad.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const passwordsMatch = formData.password === formData.confirmPassword;
  const canSubmit = !formData.password || (passwordsMatch && formData.password.length >= 8);

  if (successData) {
    return (
      <div className="glass-card-pro bg-white p-12 w-full flex flex-col items-center text-center space-y-8 rounded-[4px]">
        <CheckCircle size={64} className="text-emerald-500 animate-in zoom-in duration-500" />
        <div className="space-y-4">
          <h2 className="text-2xl font-black text-[#0f2a44] uppercase tracking-tight">
            {successData.isEdit ? 'Actualización Exitosa' : 'Incorporación Exitosa'}
          </h2>
          <p className="text-[#0f2a44]/60 font-medium">
            {successData.isEdit
              ? 'La identidad ha sido sincronizada correctamente en los sistemas Archon.'
              : 'El personal ha sido registrado bajo el estándar Archon. Entregue la siguiente clave temporal al operador:'}
          </p>
        </div>

        {!successData.isEdit && successData.tempPass && (
          <div className="w-full bg-[#0f2a44]/5 p-6 rounded-[4px] border-2 border-dashed border-[#0f2a44]/20 group relative">
            <span className="text-3xl font-black text-[#0f2a44] tracking-[0.2em] font-mono">
              {successData.tempPass}
            </span>
            <button
              type="button"
              onClick={(): Promise<void> =>
                navigator.clipboard.writeText(successData.tempPass || '')
              }
              className="absolute top-2 right-2 p-2 opacity-0 group-hover:opacity-100 transition-opacity text-[#0f2a44]/40 hover:text-[#0f2a44]"
            >
              <Copy size={16} />
            </button>
          </div>
        )}

        <button
          onClick={(): void => {
            setEditingUser(null);
            setActivePanel('DIRECTORY');
          }}
          className="btn-sentinel-navy px-12 py-4 uppercase font-black tracking-widest text-[11px] rounded-[4px]"
        >
          Volver al Directorio
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleFormSubmit} className="space-y-8 archon-central-axis pb-20">
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-6 animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center gap-4">
            <div className="bg-red-100 p-2 rounded">
              <Shield size={18} className="text-red-500" />
            </div>
            <p className="text-[11px] uppercase font-black tracking-widest text-[#0f2a44]">
              {error}
            </p>
          </div>
        </div>
      )}
      <div className="archon-grid-2">
        <div className="glass-card-pro bg-white p-10 space-y-8">
          <div className="archon-card-header-pro">
            <Contact size={22} className="text-[#10b981]" />
            <h3>{editingUser ? 'Actualizar Identidad' : 'Identidad de Personal'}</h3>
          </div>

          <ArchonField label="Nombre Completo" icon={User} required>
            <input
              required
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
                required
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

          <div className="pt-8 mt-4 border-t border-[#0f2a44]/5">
            <ArchonField label="Fotografía de Identidad" icon={ImageIcon}>
              <ArchonImageUploader
                images={formData.imageUrl ? [formData.imageUrl] : []}
                onChange={(imgs: string[]): void =>
                  setFormData({ ...formData, imageUrl: imgs[0] || '' })
                }
                maxImages={1}
              />
            </ArchonField>
            <p className="text-[10px] uppercase tracking-widest opacity-40 mt-4 text-center">
              Estándar Archon: Formato cuadrado recomendado
            </p>
          </div>
        </div>

        <div className="glass-card-pro bg-white p-10 space-y-8">
          <div className="archon-card-header-pro">
            <Briefcase size={22} className="text-[#0f2a44]" />
            <h3>Perfil Industrial</h3>
          </div>

          <ArchonField label="Correo Electrónico" icon={Mail} required>
            <input
              required
              type="email"
              placeholder="ana.karen@piic.com.mx"
              className="archon-input"
              value={formData.email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                setFormData({ ...formData, email: e.target.value })
              }
            />
          </ArchonField>

          <div className="grid grid-cols-2 gap-8">
            <ArchonField label="Rol Archon" icon={Shield} required>
              <ArchonSelect
                options={[
                  { value: '1', label: 'Administrador' },
                  { value: '2', label: 'Operador' },
                  { value: '3', label: 'Técnico' },
                ]}
                value={formData.roleId}
                onChange={(val: string): void => setFormData({ ...formData, roleId: val })}
              />
            </ArchonField>
            <ArchonField label="Departamento" icon={Briefcase}>
              <input
                type="text"
                placeholder="Ej. Administración"
                className="archon-input"
                value={formData.department}
                onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                  setFormData({ ...formData, department: e.target.value })
                }
              />
            </ArchonField>
          </div>

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
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1 bg-transparent border-none appearance-none focus:outline-none text-[#0f2a44]/20 hover:text-[#0f2a44] transition-colors flex items-center justify-center leading-none"
                  style={{ background: 'none', border: 'none', boxShadow: 'none' }}
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
                        <span className="text-[10px] font-bold text-red-500 uppercase tracking-tighter">
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

      <div className="archon-grid-2">
        <div />
        <div className="grid grid-cols-2 gap-6">
          <button
            type="button"
            onClick={(): void => {
              setEditingUser(null);
              setActivePanel('DIRECTORY');
            }}
            className="btn-sentinel-red w-full uppercase font-black text-[11px] tracking-widest rounded-[4px]"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !canSubmit}
            className={`btn-sentinel-emerald w-full uppercase font-black text-[11px] tracking-widest flex items-center justify-center gap-2 rounded-[4px] transition-all duration-300 ${
              !canSubmit ? 'opacity-50 grayscale cursor-not-allowed' : ''
            }`}
          >
            {isSubmitting && 'Transmitiendo...'}
            {!isSubmitting && (editingUser ? 'Guardar Cambios' : 'Confirmar Alta')}
            <Save size={16} />
          </button>
        </div>
      </div>
    </form>
  );
};

export default UserRegistrationForm;
