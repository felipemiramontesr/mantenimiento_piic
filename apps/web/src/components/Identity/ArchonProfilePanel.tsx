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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const user = currentUser as any;
      setFormData({
        fullName: user.fullName || user.full_name || '',
        email: user.email || '',
        employeeNumber: user.employeeNumber || user.employee_number || '',
        imageUrl: user.imageUrl || user.image_url || user.profile_picture_url || '',
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
    <div className="animate-in fade-in duration-700">
      <form
        onSubmit={handleFormSubmit}
        className="animate-in fade-in slide-in-from-bottom-8 duration-700 w-full max-w-[1700px] mx-auto pb-40 space-y-8"
      >
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

        {/* 🔱 TWO COLUMN GRID (Sovereign Information Density) */}
        <div className="archon-grid-2 items-start">
          {/* Personal Data Panel */}
          <div className="glass-card-pro bg-white p-12 space-y-10">
            <div className="archon-card-header-pro">
              <Contact size={20} className="text-[#10b981]" />
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-[#0f2a44]">
                Información Personal
              </h3>
            </div>

            <div className="space-y-8">
              <ArchonField label="Nombre Completo" icon={User} required>
                <input
                  required
                  type="text"
                  className="archon-input"
                  value={formData.fullName}
                  onChange={(e): void => setFormData({ ...formData, fullName: e.target.value })}
                />
              </ArchonField>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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

              <div className="pt-8 border-t border-[#0f2a44]/5">
                <ArchonField label="Fotografía de Perfil" icon={ImageIcon}>
                  <ArchonImageUploader
                    images={formData.imageUrl ? [formData.imageUrl] : []}
                    onChange={(imgs): void => setFormData({ ...formData, imageUrl: imgs[0] || '' })}
                    onFileChange={(files): void => setSelectedFile(files[0] || null)}
                    maxImages={1}
                    title="Arrastra tu fotografía de perfil"
                    allowedFormats="JPG, PNG"
                    accept="image/jpeg, image/png"
                    variant="square"
                  />
                </ArchonField>
              </div>
            </div>
          </div>

          {/* Security & System Panel */}
          <div className="glass-card-pro bg-white p-12 space-y-10">
            <div className="archon-card-header-pro">
              <Key size={20} className="text-[#0f2a44]" />
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-[#0f2a44]">
                Seguridad y Acceso
              </h3>
            </div>

            <div className="space-y-8">
              <ArchonField label="Correo Electrónico" icon={Mail} required>
                <input
                  required
                  type="email"
                  className="archon-input"
                  value={formData.email}
                  onChange={(e): void => setFormData({ ...formData, email: e.target.value })}
                />
              </ArchonField>

              <div className="space-y-6">
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
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full text-[#0f2a44]/20 hover:text-[#f2b705] hover:bg-[#f2b705]/10 transition-all duration-300 flex items-center justify-center border-0 bg-transparent outline-none focus:outline-none"
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

              <div className="pt-8 border-t border-[#0f2a44]/5 flex items-center justify-between opacity-60">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-[#0f2a44]">
                    Rol de Sistema
                  </p>
                  <p className="text-xs font-bold text-[#0f2a44]">
                    {currentUser?.roleName || 'Usuario'}
                  </p>
                </div>
                <Shield size={20} className="text-[#0f2a44]/20" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-center pt-8">
          <button
            type="submit"
            disabled={isSubmitting || !canSubmit}
            className={`btn-sentinel-navy w-full md:w-auto px-32 py-5 uppercase font-black text-[11px] tracking-[0.4em] flex items-center justify-center gap-4 rounded-[4px] transition-all duration-500 ${
              !canSubmit ? 'opacity-30 grayscale cursor-not-allowed' : 'shadow-xl'
            }`}
          >
            {isSubmitting ? 'Sincronizando...' : 'Actualizar Perfil'}
            <Save size={16} />
          </button>
        </div>
      </form>
    </div>
  );
};

export default ArchonProfilePanel;
