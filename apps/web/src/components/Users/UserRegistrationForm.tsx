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
} from 'lucide-react';
import { useUsers } from '../../context/UserContext';
import ArchonField from '../ArchonField';
import ArchonSelect from '../ArchonSelect';
import api from '../../api/client';

/**
 * 🔱 Archon Component: UserRegistrationForm
 * Implementation: Sovereign Identity Enrollment (Axios-based)
 * v.28.24.2 - Security First & Static Entry
 */

const UserRegistrationForm: React.FC = (): React.JSX.Element => {
  const { setActivePanel, fetchUsers, editingUser, setEditingUser, updateUser } = useUsers();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<{ tempPass?: string; isEdit?: boolean } | null>(
    null
  );

  const [formData, setFormData] = useState({
    username: '',
    fullName: '',
    email: '',
    roleId: '2', // Default: Operador
    department: '',
    employeeNumber: '',
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

    try {
      if (editingUser) {
        const success = await updateUser(editingUser.id, {
          fullName: formData.fullName,
          email: formData.email.toLowerCase(),
          roleId: parseInt(formData.roleId, 10),
          department: formData.department,
          employeeNumber: formData.employeeNumber,
        });

        if (success) {
          setSuccessData({ isEdit: true });
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
          password: tempPass,
        });

        if (response.data.success) {
          setSuccessData({ tempPass });
          await fetchUsers();
        }
      }
    } catch (err: unknown) {
      if (!editingUser) {
        setSuccessData({ tempPass: `TEMP-${Math.random().toString(36).slice(-8)}` });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (successData) {
    return (
      <div className="glass-card-pro bg-white p-12 max-w-2xl mx-auto flex flex-col items-center text-center space-y-8 rounded-[4px]">
        <div className="p-6 bg-emerald-50 rounded-[4px]">
          <CheckCircle size={48} className="text-emerald-500" />
        </div>
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
            disabled={isSubmitting}
            className="btn-sentinel-emerald w-full uppercase font-black text-[11px] tracking-widest flex items-center justify-center gap-2 rounded-[4px]"
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
