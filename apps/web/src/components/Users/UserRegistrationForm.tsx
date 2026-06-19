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
  Trash2,
  Building2,
  Users,
  MapPin,
} from 'lucide-react';
import { useUsers } from '../../context/UserContext';
import ArchonField from '../ArchonField';
import ArchonSelect from '../ArchonSelect';
import ArchonImageUploader from '../ArchonImageUploader';
import api from '../../api/client';
import AuditJustificationModal from '../Common/AuditJustificationModal';
import ArchonAddressField, { AddressValue, EMPTY_ADDRESS } from '../Common/ArchonAddressField';

/**
 * 🔱 Archon Component: UserRegistrationForm
 * Implementation: Sovereign Identity Enrollment (Axios-based)
 * v.78.100.230 - Role-First Conditional Fields
 * Refactor: Rol Archon first; role-scoped conditional fields per Archon Master bands.
 */

interface SuccessViewProps {
  data: { tempPass?: string; isEdit?: boolean };
  onClose: () => void;
}

interface ParentOwnerOption {
  id: number;
  label: string;
}

interface AreaOption {
  id: number;
  name: string;
}

interface CenterOption {
  id: number;
  label: string;
}

// ── Role classification helpers (outside component for cognitive-complexity budget) ──

function isAreaSubUser(roleId: number): boolean {
  return roleId === 2;
}

function isFamiliarSubUser(roleId: number): boolean {
  return roleId === 5;
}

function isPrivadoRole(roleId: number): boolean {
  return roleId === 4;
}

function isInternalStaff(roleId: number): boolean {
  return !isAreaSubUser(roleId) && !isFamiliarSubUser(roleId);
}

function getRoleFieldsValid(
  roleId: number,
  parentOwnerId: string,
  areaId: string,
  familiarType: string,
  centroOwnerId: string
): boolean {
  if (isAreaSubUser(roleId)) return Boolean(parentOwnerId && areaId);
  if (isFamiliarSubUser(roleId)) return Boolean(parentOwnerId && familiarType);
  if (isPrivadoRole(roleId)) return Boolean(centroOwnerId);
  return true;
}

function buildSubUserPayload(
  roleId: number,
  username: string,
  fullName: string,
  email: string,
  password: string,
  parentOwnerId: string,
  areaId: string,
  familiarType: string,
  tempPass: string
): Record<string, unknown> {
  const base: Record<string, unknown> = {
    username: username.toLowerCase(),
    fullName,
    email: email.toLowerCase(),
    roleId,
    password: password || tempPass,
    parentOwnerId: parseInt(parentOwnerId, 10),
  };
  if (isAreaSubUser(roleId)) {
    base.areaId = parseInt(areaId, 10);
  } else {
    base.familiarType = familiarType;
  }
  return base;
}

function computeCanSubmit(
  password: string,
  passwordsMatch: boolean,
  hasEditingUser: boolean,
  roleId: number,
  parentOwnerId: string,
  areaId: string,
  familiarType: string,
  centroOwnerId: string
): boolean {
  const passwordValid = !password || (passwordsMatch && password.length >= 8);
  const roleValid =
    hasEditingUser ||
    getRoleFieldsValid(roleId, parentOwnerId, areaId, familiarType, centroOwnerId);
  return passwordValid && roleValid;
}

function buildOwnerProfilePayload(
  roleId: number,
  rfc: string,
  razonSocial: string,
  telefono: string,
  addressVal: AddressValue
): Record<string, unknown> {
  if (roleId !== 4) return {};
  const profile: Record<string, unknown> = {};
  if (rfc) profile.rfc = rfc;
  if (razonSocial) profile.razon_social = razonSocial;
  if (telefono) profile.telefono = telefono;
  const result: Record<string, unknown> = { profile };
  if (addressVal.neighborhoodId) {
    const address: Record<string, unknown> = {
      neighborhoodId: parseInt(addressVal.neighborhoodId, 10),
    };
    if (addressVal.calle) address.calle = addressVal.calle;
    if (addressVal.numeroExt) address.numeroExt = addressVal.numeroExt;
    if (addressVal.numeroInt) address.numeroInt = addressVal.numeroInt;
    result.address = address;
  }
  return result;
}

const SuccessView: React.FC<SuccessViewProps> = ({ data, onClose }) => (
  <div className="card-archon-sovereign bg-white p-12 w-full flex flex-col items-center text-center space-y-8 rounded-[4px] border-t-emerald-500">
    <CheckCircle size={64} className="text-emerald-500 animate-in zoom-in duration-500" />
    <div className="space-y-4">
      <h2 className="text-2xl font-black text-pinnacle-navy uppercase tracking-tight">
        {data.isEdit ? 'Actualización Exitosa' : 'Incorporación Exitosa'}
      </h2>
      <p className="text-pinnacle-navy/60 font-medium">
        {data.isEdit
          ? 'La identidad ha sido sincronizada correctamente en los sistemas Archon.'
          : 'El personal ha sido registrado bajo el estándar Archon. Entregue la siguiente clave temporal al operador:'}
      </p>
    </div>

    {!data.isEdit && data.tempPass && (
      <div className="w-full bg-pinnacle-navy/5 p-6 rounded-[4px] border-2 border-dashed border-pinnacle-navy/20 group relative">
        <span className="text-3xl font-black text-pinnacle-navy tracking-[0.2em] font-mono">
          {data.tempPass}
        </span>
        <button
          type="button"
          onClick={(): Promise<void> => navigator.clipboard.writeText(data.tempPass || '')}
          className="absolute top-2 right-2 p-2 opacity-0 group-hover:opacity-100 transition-opacity text-pinnacle-navy/40 hover:text-pinnacle-navy"
        >
          <Copy size={16} />
        </button>
      </div>
    )}

    <button onClick={onClose} className="btn-sentinel-red">
      Volver al Directorio
    </button>
  </div>
);

const UserRegistrationForm: React.FC = (): React.JSX.Element => {
  const {
    setActivePanel,
    fetchUsers,
    editingUser,
    setEditingUser,
    updateUser,
    deleteUser,
    departments,
    roles,
  } = useUsers();
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [successData, setSuccessData] = useState<{ tempPass?: string; isEdit?: boolean } | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // 🛡️ Audit State
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [auditAction, setAuditAction] = useState<'UPDATE' | 'DELETE'>('UPDATE');

  // 🔱 Sub-user parent catalog
  const [parentOwners, setParentOwners] = useState<ParentOwnerOption[]>([]);
  const [areas, setAreas] = useState<AreaOption[]>([]);

  // 🔱 Fase 5: Rol 4 CENTER catalog
  const [centers, setCenters] = useState<CenterOption[]>([]);

  // 🔱 Fase 6: Multi-campo address for Rol 1/3/4
  const [addressValue, setAddressValue] = useState<AddressValue>(EMPTY_ADDRESS);

  const [formData, setFormData] = useState({
    username: '',
    fullName: '',
    email: '',
    roleId: roles.find((r) => r.label?.toLowerCase().includes('operador'))?.id.toString() || '',
    department: '',
    employeeNumber: '',
    imageUrl: '',
    password: '',
    confirmPassword: '',
    parentOwnerId: '',
    areaId: '',
    familiarType: '',
    // Fase 6 profile fields (Rol 4):
    rfc: '',
    razonSocial: '',
    telefono: '',
    centroOwnerId: '',
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
        parentOwnerId: '',
        areaId: '',
        familiarType: '',
        rfc: '',
        razonSocial: '',
        telefono: '',
        centroOwnerId: '',
      });
      setAddressValue(EMPTY_ADDRESS);
    }
  }, [editingUser, roles]);

  const roleIdNum = parseInt(formData.roleId, 10) || 0;
  const isPrivadoOwner = isPrivadoRole(roleIdNum);

  useEffect(() => {
    if (!isPrivadoOwner) return;
    const loadCenters = async (): Promise<void> => {
      try {
        const res = await api.get<{ success: boolean; data: CenterOption[] }>('/catalogs/centers');
        setCenters(res.data?.data || []);
      } catch {
        setCenters([]);
      }
    };
    loadCenters();
  }, [isPrivadoOwner]);

  useEffect(() => {
    if (!isAreaSubUser(roleIdNum) && !isFamiliarSubUser(roleIdNum)) return;
    const loadParentOwners = async (): Promise<void> => {
      try {
        const res = await api.get<{ success: boolean; data: ParentOwnerOption[] }>(
          '/catalogs/FLEET_OWNER'
        );
        setParentOwners(res.data?.data || []);
      } catch {
        setParentOwners([]);
      }
    };
    loadParentOwners();
  }, [roleIdNum]);

  useEffect(() => {
    if (!isAreaSubUser(roleIdNum) || !formData.parentOwnerId) return;
    const loadAreas = async (): Promise<void> => {
      try {
        const res = await api.get<{ success: boolean; data: AreaOption[] }>(
          `/owners/${formData.parentOwnerId}/areas`
        );
        setAreas(res.data?.data || []);
      } catch {
        setAreas([]);
      }
    };
    loadAreas();
  }, [roleIdNum, formData.parentOwnerId]);

  const generateTempPassword = (length = 12): string => {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let retVal = '';
    for (let i = 0; i < length; i += 1) {
      retVal += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return retVal;
  };

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
        const formDataUpload = new FormData();
        formDataUpload.append('file', selectedFile);
        await api.post(`/users/${editingUser.id}/upload-profile`, formDataUpload, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
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

  const handleCreateSubUser = async (tempPass: string): Promise<void> => {
    const payload = buildSubUserPayload(
      roleIdNum,
      formData.username,
      formData.fullName,
      formData.email,
      formData.password,
      formData.parentOwnerId,
      formData.areaId,
      formData.familiarType,
      tempPass
    );
    const response = await api.post('/auth/sub-users', payload);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Error en el servidor.');
    }
    setSuccessData({ tempPass });
    await fetchUsers();
  };

  const handleCreate = async (): Promise<void> => {
    const tempPass = generateTempPassword();
    if (isAreaSubUser(roleIdNum) || isFamiliarSubUser(roleIdNum)) {
      await handleCreateSubUser(tempPass);
      return;
    }
    const response = await api.post('/auth/register', {
      username: formData.username.toLowerCase(),
      fullName: formData.fullName,
      email: formData.email.toLowerCase(),
      roleId: roleIdNum,
      department: formData.department,
      employeeNumber: formData.employeeNumber,
      password: formData.password || tempPass,
      profile_picture_url: formData.imageUrl,
      ...buildOwnerProfilePayload(
        roleIdNum,
        formData.rfc,
        formData.razonSocial,
        formData.telefono,
        addressValue
      ),
      ...(roleIdNum === 4 &&
        formData.centroOwnerId && {
          centroOwnerId: parseInt(formData.centroOwnerId, 10),
        }),
    });

    if (response.data.success) {
      const { userId } = response.data;
      if (selectedFile && userId) {
        const formDataUpload = new FormData();
        formDataUpload.append('file', selectedFile);
        await api.post(`/users/${userId}/upload-profile`, formDataUpload, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      setSuccessData({ tempPass });
      await fetchUsers();
    } else {
      throw new Error(response.data.error || 'Error en el servidor.');
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

    if (!editingUser && formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    if (editingUser) {
      setAuditAction('UPDATE');
      setIsAuditModalOpen(true);
    } else {
      setIsSubmitting(true);
      try {
        await handleCreate();
      } catch (err: unknown) {
        const errObj = err as { response?: { data?: { error?: string } }; message?: string };
        const msg = errObj.response?.data?.error || errObj.message || 'Falla en el alta.';
        setError(msg);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const passwordsMatch = formData.password === formData.confirmPassword;
  const canSubmit = computeCanSubmit(
    formData.password,
    passwordsMatch,
    !!editingUser,
    roleIdNum,
    formData.parentOwnerId,
    formData.areaId,
    formData.familiarType,
    formData.centroOwnerId
  );

  const sortedRoles = [...roles].filter((r) => ![1, 3].includes(r.id)).sort((a, b) => a.id - b.id);

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
              onChange={(val: string): void =>
                setFormData({
                  ...formData,
                  roleId: val,
                  parentOwnerId: '',
                  areaId: '',
                  familiarType: '',
                })
              }
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

            {isAreaSubUser(roleIdNum) && (
              <div
                data-testid="area-subuser-fields"
                className="pt-6 border-t border-pinnacle-navy/5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300"
              >
                <ArchonField label="Propietario de Flotilla" icon={Building2} required>
                  <ArchonSelect
                    options={parentOwners.map((o) => ({ value: o.id.toString(), label: o.label }))}
                    value={formData.parentOwnerId}
                    onChange={(val: string): void =>
                      setFormData({ ...formData, parentOwnerId: val, areaId: '' })
                    }
                  />
                </ArchonField>
                {formData.parentOwnerId && (
                  <ArchonField label="Área de Trabajo" icon={MapPin} required>
                    <ArchonSelect
                      options={areas.map((a) => ({ value: a.id.toString(), label: a.name }))}
                      value={formData.areaId}
                      onChange={(val: string): void => setFormData({ ...formData, areaId: val })}
                    />
                  </ArchonField>
                )}
              </div>
            )}

            {isFamiliarSubUser(roleIdNum) && (
              <div
                data-testid="familiar-subuser-fields"
                className="pt-6 border-t border-pinnacle-navy/5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300"
              >
                <ArchonField label="Propietario Familiar" icon={Users} required>
                  <ArchonSelect
                    options={parentOwners.map((o) => ({ value: o.id.toString(), label: o.label }))}
                    value={formData.parentOwnerId}
                    onChange={(val: string): void =>
                      setFormData({ ...formData, parentOwnerId: val })
                    }
                  />
                </ArchonField>
                <ArchonField label="Tipo de Familiar" icon={Users} required>
                  <div className="flex gap-3 pt-1">
                    {(['PAREJA', 'HIJO_A'] as const).map((type) => (
                      <button
                        key={type}
                        type="button"
                        data-testid={`familiar-type-${type.toLowerCase()}`}
                        onClick={(): void => setFormData({ ...formData, familiarType: type })}
                        className={`flex-1 py-2.5 rounded-[4px] text-archon-md font-black uppercase tracking-widest transition-all duration-300 ${
                          formData.familiarType === type
                            ? 'bg-pinnacle-navy text-white'
                            : 'bg-pinnacle-navy/5 text-pinnacle-navy/60 hover:bg-pinnacle-navy/10'
                        }`}
                      >
                        {type === 'HIJO_A' ? 'HIJO/A' : type}
                      </button>
                    ))}
                  </div>
                </ArchonField>
              </div>
            )}

            {isInternalStaff(roleIdNum) && (
              <ArchonField label="Departamento" icon={Briefcase}>
                <ArchonSelect
                  options={departments}
                  value={formData.department}
                  onChange={(val: string): void => setFormData({ ...formData, department: val })}
                />
              </ArchonField>
            )}

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

        {/* 🔱 Rol 4 — Perfil de Propietario Privado */}
        {roleIdNum === 4 && !editingUser && (
          <div
            data-testid="owner-profile-section"
            className="card-archon-sovereign bg-white p-10 space-y-8 [--card-accent:#8b5cf6]"
          >
            <div className="card-sovereign-header">
              <Building2 size={22} className="text-[var(--card-accent)]" />
              <h3 className="card-sovereign-title text-archon-xl opacity-100">Perfil Personal</h3>
            </div>
            <div className="grid grid-cols-2 gap-8">
              <ArchonField label="RFC (Opcional)" icon={Shield}>
                <input
                  type="text"
                  placeholder="RFC (opcional)"
                  className="archon-input"
                  data-testid="centro-rfc-input"
                  value={formData.rfc}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                    setFormData({ ...formData, rfc: e.target.value })
                  }
                />
              </ArchonField>
              <ArchonField label="Nombre Legal" icon={Briefcase} required>
                <input
                  type="text"
                  placeholder="Nombre del propietario"
                  className="archon-input"
                  data-testid="centro-razon-social-input"
                  value={formData.razonSocial}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                    setFormData({ ...formData, razonSocial: e.target.value })
                  }
                />
              </ArchonField>
            </div>
            <div className="grid grid-cols-2 gap-8">
              <ArchonField label="Teléfono" icon={Contact}>
                <input
                  type="tel"
                  placeholder="Teléfono"
                  className="archon-input"
                  data-testid="centro-telefono-input"
                  value={formData.telefono}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                    setFormData({ ...formData, telefono: e.target.value })
                  }
                />
              </ArchonField>
            </div>
            <ArchonAddressField value={addressValue} onChange={setAddressValue} />
          </div>
        )}

        {/* 🔱 Fase 5: Rol 4 — Centro de Servicio Asignado */}
        {isPrivadoOwner && !editingUser && (
          <div
            data-testid="privado-centro-section"
            className="card-archon-sovereign bg-white p-8 space-y-4 [--card-accent:#0f2a44]"
          >
            <div className="card-sovereign-header">
              <Building2 size={20} className="text-[var(--card-accent)]" />
              <h3 className="card-sovereign-title text-archon-xl opacity-100">
                Centro de Servicio
              </h3>
            </div>
            <ArchonField label="Centro Especializado Asignado" icon={Building2} required>
              <ArchonSelect
                options={centers.map((c) => ({ value: c.id.toString(), label: c.label }))}
                value={formData.centroOwnerId}
                onChange={(val: string): void => setFormData({ ...formData, centroOwnerId: val })}
              />
            </ArchonField>
            <p className="text-archon-base uppercase tracking-widest opacity-40 text-sm">
              El propietario privado quedará vinculado operativamente a este centro.
            </p>
          </div>
        )}

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
