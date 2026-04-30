import React, { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Shield,
  Contact,
  Save,
  CheckCircle,
  Hash,
  Image as ImageIcon,
  Key,
  Eye,
  EyeOff,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import ArchonField from '../ArchonField';
import ArchonImageUploader from '../ArchonImageUploader';
import api from '../../api/client';

/**
 * 🔱 Archon Component: ArchonProfilePanel
 * Implementation: Sovereign Identity Management (Profile Settings)
 * Aesthetic: Industrial Registry Standard
 * v.20.0.0
 */

const ArchonProfilePanel: React.FC = (): React.JSX.Element => {
  const { currentUser, updateCurrentUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    employeeNumber: '',
    imageUrl: '',
    password: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (currentUser) {
      setFormData({
        fullName: currentUser.fullName,
        email: currentUser.email,
        employeeNumber: currentUser.employeeNumber || '',
        imageUrl: currentUser.imageUrl || '',
        password: '',
        confirmPassword: '',
      });
    }
  }, [currentUser]);

  const handleFormSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      if (!currentUser) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const payload: any = {
        fullName: formData.fullName,
        email: formData.email.toLowerCase(),
        employeeNumber: formData.employeeNumber,
        profilePictureUrl: formData.imageUrl,
      };

      if (formData.password) {
        payload.password = formData.password;
      }

      const response = await api.patch(`/auth/users/${currentUser.id}`, payload);

      if (response.data.success) {
        let finalImageUrl = formData.imageUrl;

        if (selectedFile) {
          const formDataUpload = new FormData();
          formDataUpload.append('file', selectedFile);
          const uploadRes = await api.post(
            `/users/${currentUser.id}/upload-profile`,
            formDataUpload,
            {
              headers: { 'Content-Type': 'multipart/form-data' },
            }
          );
          if (uploadRes.data.success) {
            finalImageUrl = uploadRes.data.imageUrl;
          }
        }

        updateCurrentUser({
          fullName: formData.fullName,
          email: formData.email,
          employeeNumber: formData.employeeNumber,
          imageUrl: finalImageUrl,
        });

        setSuccess(true);
        setTimeout(() => setSuccess(false), 5000);
      }
    } catch (err: unknown) {
      setError('Falla crítica al actualizar el perfil. Verifique su conexión.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const passwordsMatch = formData.password === formData.confirmPassword;
  const canSubmit = !formData.password || (passwordsMatch && formData.password.length >= 8);

  return (
    <div className="workspace-container-pro animate-in fade-in duration-700">
      <header className="workspace-header-pro mb-12">
        <div className="flex flex-col items-start">
          <div className="flex items-center gap-12 mb-8">
            <UserCheck size={28} className="text-[#f2b705]" />
            <h2 className="text-[#0f2a44] tracking-tighter font-black text-2xl uppercase">
              Configuración de Identidad
            </h2>
          </div>
          <p className="text-[#0f2a44] text-[10px] font-bold uppercase tracking-[0.2em] opacity-60">
            Gestión de Perfil, Seguridad de Acceso & Credenciales Archon
          </p>
        </div>
      </header>

      <form onSubmit={handleFormSubmit} className="space-y-8 archon-central-axis pb-20">
        {success && (
          <div className="bg-emerald-50 border-l-4 border-emerald-500 p-6 animate-in fade-in slide-in-from-top-4">
            <div className="flex items-center gap-4">
              <CheckCircle size={20} className="text-emerald-500" />
              <p className="text-[11px] uppercase font-black tracking-widest text-[#0f2a44]">
                Perfil actualizado con éxito. La identidad ha sido sincronizada.
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-6 animate-in fade-in slide-in-from-top-4">
            <div className="flex items-center gap-4">
              <Shield size={20} className="text-red-500" />
              <p className="text-[11px] uppercase font-black tracking-widest text-[#0f2a44]">
                {error}
              </p>
            </div>
          </div>
        )}

        <div className="archon-grid-2">
          {/* Personal Data Panel */}
          <div className="glass-card-pro bg-white p-10 space-y-8">
            <div className="archon-card-header-pro">
              <Contact size={22} className="text-[#10b981]" />
              <h3>Información Personal</h3>
            </div>

            <ArchonField label="Nombre Completo" icon={User} required>
              <input
                required
                type="text"
                className="archon-input"
                value={formData.fullName}
                onChange={(e): void => setFormData({ ...formData, fullName: e.target.value })}
              />
            </ArchonField>

            <div className="grid grid-cols-2 gap-8">
              <ArchonField label="Usuario (Inalterable)" icon={Shield}>
                <input
                  type="text"
                  className="archon-input opacity-50 cursor-not-allowed"
                  disabled
                  value={currentUser?.username || ''}
                />
              </ArchonField>
              <ArchonField label="No. de Empleado" icon={Hash}>
                <input
                  type="text"
                  className="archon-input"
                  value={formData.employeeNumber}
                  onChange={(e): void =>
                    setFormData({ ...formData, employeeNumber: e.target.value })
                  }
                />
              </ArchonField>
            </div>

            <div className="pt-8 mt-4 border-t border-[#0f2a44]/5">
              <ArchonField label="Fotografía de Perfil" icon={ImageIcon}>
                <ArchonImageUploader
                  images={formData.imageUrl ? [formData.imageUrl] : []}
                  onChange={(imgs): void => setFormData({ ...formData, imageUrl: imgs[0] || '' })}
                  onFileChange={(files): void => setSelectedFile(files[0] || null)}
                  maxImages={1}
                />
              </ArchonField>
              <p className="text-[10px] uppercase tracking-widest opacity-40 mt-4 text-center">
                Visualización en Red Archon
              </p>
            </div>
          </div>

          {/* Security & System Panel */}
          <div className="glass-card-pro bg-white p-10 space-y-8">
            <div className="archon-card-header-pro">
              <Key size={22} className="text-[#0f2a44]" />
              <h3>Seguridad y Acceso</h3>
            </div>

            <ArchonField label="Correo Electrónico" icon={Mail} required>
              <input
                required
                type="email"
                className="archon-input"
                value={formData.email}
                onChange={(e): void => setFormData({ ...formData, email: e.target.value })}
              />
            </ArchonField>

            <div className="space-y-6 pt-4">
              <ArchonField label="Nueva Contraseña" icon={Key}>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    minLength={8}
                    placeholder="Dejar vacío para mantener actual"
                    className="archon-input pr-12"
                    value={formData.password}
                    onChange={(e): void => setFormData({ ...formData, password: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={(): void => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-[#0f2a44]/20 hover:text-[#0f2a44] transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </ArchonField>

              {formData.password && (
                <div className="animate-in fade-in slide-in-from-top-2">
                  <ArchonField label="Confirmar Nueva Contraseña" icon={CheckCircle} required>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        className={`archon-input ${
                          formData.confirmPassword && !passwordsMatch
                            ? 'border-red-200 bg-red-50/10'
                            : ''
                        }`}
                        value={formData.confirmPassword}
                        onChange={(e): void =>
                          setFormData({ ...formData, confirmPassword: e.target.value })
                        }
                      />
                      {formData.confirmPassword && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                          {passwordsMatch ? (
                            <CheckCircle
                              size={16}
                              className="text-emerald-500 animate-in zoom-in"
                            />
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

            <div className="pt-12 mt-4 border-t border-[#0f2a44]/5">
              <div className="bg-[#0f2a44]/5 p-6 rounded-[4px] flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#0f2a44]">
                    Rol de Sistema
                  </p>
                  <p className="text-xs font-bold text-[#0f2a44]/60">
                    {currentUser?.role?.name || 'Usuario'}
                  </p>
                </div>
                <Shield size={24} className="text-[#0f2a44]/10" />
              </div>
            </div>
          </div>
        </div>

        <div className="archon-grid-2">
          <div />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting || !canSubmit}
              className={`btn-sentinel-navy w-full md:w-auto px-24 py-4 uppercase font-black text-[11px] tracking-[0.3em] flex items-center justify-center gap-4 rounded-[4px] transition-all duration-300 ${
                !canSubmit ? 'opacity-50 grayscale cursor-not-allowed' : ''
              }`}
            >
              {isSubmitting ? 'Sincronizando Identidad...' : 'Actualizar Perfil Archon'}
              <Save size={16} />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default ArchonProfilePanel;
