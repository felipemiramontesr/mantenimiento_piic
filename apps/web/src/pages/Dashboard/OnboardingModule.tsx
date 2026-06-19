import React, { useEffect, useState } from 'react';
import {
  Globe,
  UserPlus,
  User,
  Mail,
  Key,
  Contact,
  Hash,
  Briefcase,
  Phone,
  Eye,
  EyeOff,
  MapPin,
  Wrench,
  LayoutGrid,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useSovereignLayout } from '../../context/SovereignLayoutContext';
import usePermissions from '../../hooks/usePermissions';
import api from '../../api/client';
import ArchonAddressField, {
  AddressValue,
  EMPTY_ADDRESS,
} from '../../components/Common/ArchonAddressField';
import AreasSelect from '../../components/Common/AreasSelect';
import SpecialtiesSelect from '../../components/Common/SpecialtiesSelect';

type UniverseTab = 'ERP' | 'VIM';
type ClientTab = 'PRIVATE' | 'FAMILIAR';

interface FormState {
  username: string;
  email: string;
  password: string;
  fullName: string;
  rfc: string;
  razonSocial: string;
  telefono: string;
  targetOwnerId: string;
}

const EMPTY_FORM: FormState = {
  username: '',
  email: '',
  password: '',
  fullName: '',
  rfc: '',
  razonSocial: '',
  telefono: '',
  targetOwnerId: '',
};

const LABEL_CLS =
  'text-archon-base font-black uppercase tracking-[0.15em] text-[#0f2a44]/50 flex items-center gap-2 mb-1';

const tabBase =
  'flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-[4px] transition-all duration-150 cursor-pointer';
const tabActive = `${tabBase} bg-pinnacle-navy text-pinnacle-yellow`;
const tabInactive = `${tabBase} text-pinnacle-navy/50 hover:bg-pinnacle-navy/5`;

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({
  icon: Icon,
  children,
}: {
  icon: LucideIcon;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
      <Icon size={12} className="text-pinnacle-yellow" />
      <span className="text-archon-sm font-black uppercase tracking-widest text-pinnacle-navy/40">
        {children}
      </span>
    </div>
  );
}

function FieldGroup({
  label,
  id,
  type = 'text',
  value,
  onChange,
  hint,
  required,
  icon: Icon,
}: {
  label: string;
  id: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  required?: boolean;
  icon?: LucideIcon;
}): React.ReactElement {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      <label htmlFor={id} className={LABEL_CLS}>
        {Icon && <Icon size={12} className="text-[#f2b705]" />}
        {label}
        {required && <span className="ml-1 opacity-40">*</span>}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e): void => onChange(e.target.value)}
        placeholder={hint}
        className="archon-input"
        autoComplete="off"
      />
    </div>
  );
}

function PasswordField({
  label,
  id,
  value,
  onChange,
  required,
}: {
  label: string;
  id: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}): React.ReactElement {
  const [show, setShow] = useState(false);
  return (
    <div className="flex flex-col gap-1.5 w-full">
      <label htmlFor={id} className={LABEL_CLS}>
        <Key size={12} className="text-[#f2b705]" />
        {label}
        {required && <span className="ml-1 opacity-40">*</span>}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e): void => onChange(e.target.value)}
          className="archon-input"
          style={{ paddingRight: '2.5rem' }}
          autoComplete="new-password"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={(): void => setShow((s) => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-pinnacle-navy/40 hover:text-pinnacle-navy transition-colors"
          data-testid={`${id}-toggle`}
          aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        >
          {show ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
    </div>
  );
}

function StatusBanner({
  status,
}: {
  status: { ok: boolean; message: string } | null;
}): React.ReactElement | null {
  if (!status) return null;
  return (
    <div
      className={`rounded-[4px] px-4 py-3 text-sm font-bold ${
        status.ok
          ? 'bg-green-50 text-green-700 border border-green-200'
          : 'bg-red-50 text-red-700 border border-red-200'
      }`}
      data-testid="onboarding-status"
    >
      {status.message}
    </div>
  );
}

// ─── Archon Section: creates top-level universes ─────────────────────────────

const UniverseForm: React.FC = (): React.ReactElement => {
  const [tab, setTab] = useState<UniverseTab>('ERP');
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [addressValue, setAddressValue] = useState<AddressValue>(EMPTY_ADDRESS);
  const [especialidades, setEspecialidades] = useState<string[]>([]);
  const [areas, setAreas] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);

  const set =
    (field: keyof FormState) =>
    (value: string): void =>
      setForm((f) => ({ ...f, [field]: value }));

  const resetFields = (): void => {
    setForm(EMPTY_FORM);
    setAddressValue(EMPTY_ADDRESS);
    setEspecialidades([]);
    setAreas([]);
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    try {
      const roleId = tab === 'ERP' ? 1 : 3;

      const profile: Record<string, unknown> = { rfc: form.rfc };
      if (form.razonSocial) profile.razon_social = form.razonSocial;
      if (form.telefono) profile.telefono = form.telefono;
      if (tab === 'VIM' && especialidades.length > 0)
        profile.especialidades = especialidades.join(',');

      const address = addressValue.neighborhoodId
        ? {
            neighborhoodId: parseInt(addressValue.neighborhoodId, 10),
            calle: addressValue.calle,
            numeroExt: addressValue.numeroExt,
            numeroInt: addressValue.numeroInt || undefined,
          }
        : undefined;

      await api.post('/onboarding/universe', {
        username: form.username,
        email: form.email,
        password: form.password,
        fullName: form.fullName || undefined,
        roleId,
        profile,
        ...(address ? { address } : {}),
        ...(tab === 'ERP' && areas.length > 0 ? { areas } : {}),
      });
      setStatus({ ok: true, message: `Universo ${tab} creado exitosamente.` });
      resetFields();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string; code?: string } } })?.response?.data
          ?.message ??
        (err as { response?: { data?: { code?: string } } })?.response?.data?.code ??
        'Error al crear el universo.';
      setStatus({ ok: false, message: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6" data-testid="universe-form">
      <div className="flex gap-2 bg-slate-100 p-1 rounded-[4px]">
        <button
          type="button"
          className={tab === 'ERP' ? tabActive : tabInactive}
          onClick={(): void => {
            setTab('ERP');
            resetFields();
            setStatus(null);
          }}
          data-testid="tab-erp"
        >
          Universo ERP
        </button>
        <button
          type="button"
          className={tab === 'VIM' ? tabActive : tabInactive}
          onClick={(): void => {
            setTab('VIM');
            resetFields();
            setStatus(null);
          }}
          data-testid="tab-vim"
        >
          Universo VIM
        </button>
      </div>

      <p className="text-xs text-pinnacle-navy/50">
        {tab === 'ERP'
          ? 'Crea un Propietario de Flotilla — raíz de un universo ERP industrial.'
          : 'Crea un Centro Especializado — raíz de un universo VIM de atención al cliente.'}
      </p>

      {/* Credenciales */}
      <div className="space-y-4">
        <SectionHeader icon={User}>Credenciales de Acceso</SectionHeader>
        <div className="archon-grid-2-sovereign">
          <FieldGroup
            label="Usuario"
            id="uni-username"
            value={form.username}
            onChange={set('username')}
            hint="nombre.usuario"
            required
            icon={User}
          />
          <FieldGroup
            label="Correo"
            id="uni-email"
            type="email"
            value={form.email}
            onChange={set('email')}
            hint="correo@empresa.mx"
            required
            icon={Mail}
          />
          <PasswordField
            label="Contraseña"
            id="uni-password"
            value={form.password}
            onChange={set('password')}
            required
          />
          <FieldGroup
            label="Nombre Completo"
            id="uni-fullname"
            value={form.fullName}
            onChange={set('fullName')}
            hint="Opcional"
            icon={Contact}
          />
        </div>
      </div>

      {/* Perfil */}
      <div className="space-y-4">
        <SectionHeader icon={Briefcase}>
          {tab === 'ERP' ? 'Perfil Empresarial' : 'Datos del Centro'}
        </SectionHeader>
        <div className="archon-grid-2-sovereign">
          <FieldGroup
            label="RFC"
            id="uni-rfc"
            value={form.rfc}
            onChange={set('rfc')}
            hint="RFC de la empresa"
            required
            icon={Hash}
          />
          <FieldGroup
            label="Razón Social"
            id="uni-razon-social"
            value={form.razonSocial}
            onChange={set('razonSocial')}
            hint="Nombre legal de la empresa"
            required
            icon={Briefcase}
          />
          <FieldGroup
            label="Teléfono"
            id="uni-telefono"
            type="tel"
            value={form.telefono}
            onChange={set('telefono')}
            hint="Teléfono de contacto"
            icon={Phone}
          />
        </div>

        {tab === 'VIM' && (
          <div data-testid="uni-especialidades-section">
            <label className={LABEL_CLS}>
              <Wrench size={12} className="text-[#f2b705]" />
              Especialidades
            </label>
            <SpecialtiesSelect value={especialidades} onChange={setEspecialidades} />
          </div>
        )}

        {tab === 'ERP' && (
          <div data-testid="uni-areas-section">
            <label className={LABEL_CLS}>
              <LayoutGrid size={12} className="text-[#f2b705]" />
              Áreas Iniciales
            </label>
            <AreasSelect value={areas} onChange={setAreas} />
            <p className="text-xs text-pinnacle-navy/40 mt-1 uppercase tracking-widest">
              Estas áreas se crearán al registrar. Pueden gestionarse después.
            </p>
          </div>
        )}
      </div>

      {/* Dirección */}
      <div className="space-y-4">
        <SectionHeader icon={MapPin}>Dirección</SectionHeader>
        <ArchonAddressField value={addressValue} onChange={setAddressValue} />
      </div>

      <StatusBanner status={status} />

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2 rounded-[4px] bg-pinnacle-navy text-pinnacle-yellow text-xs font-black uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
        data-testid="btn-create-universe"
      >
        {loading ? 'Creando...' : `Crear Universo ${tab}`}
      </button>
    </form>
  );
};

// ─── Centro Section: creates VIM clients ─────────────────────────────────────

const ClientForm: React.FC = (): React.ReactElement => {
  const [tab, setTab] = useState<ClientTab>('PRIVATE');
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);

  const set =
    (field: keyof FormState) =>
    (value: string): void =>
      setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    try {
      const roleId = tab === 'PRIVATE' ? 4 : 5;
      const payload: Record<string, unknown> = {
        username: form.username,
        email: form.email,
        password: form.password,
        fullName: form.fullName || undefined,
        roleId,
      };
      if (tab === 'FAMILIAR') {
        payload.targetOwnerId = Number(form.targetOwnerId);
      }
      await api.post('/onboarding/client', payload);
      setStatus({
        ok: true,
        message: tab === 'PRIVATE' ? 'Propietario Privado registrado.' : 'Familiar agregado.',
      });
      setForm(EMPTY_FORM);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string; code?: string } } })?.response?.data
          ?.message ??
        (err as { response?: { data?: { code?: string } } })?.response?.data?.code ??
        'Error al registrar el cliente.';
      setStatus({ ok: false, message: msg });
    } finally {
      setLoading(false);
    }
  };

  const clientBtnLabel = tab === 'PRIVATE' ? 'Registrar Propietario Privado' : 'Agregar Familiar';

  return (
    <form onSubmit={handleSubmit} className="space-y-4" data-testid="client-form">
      <div className="flex gap-2 bg-slate-100 p-1 rounded-[4px]">
        <button
          type="button"
          className={tab === 'PRIVATE' ? tabActive : tabInactive}
          onClick={(): void => {
            setTab('PRIVATE');
            setForm(EMPTY_FORM);
            setStatus(null);
          }}
          data-testid="tab-private"
        >
          P. Privado
        </button>
        <button
          type="button"
          className={tab === 'FAMILIAR' ? tabActive : tabInactive}
          onClick={(): void => {
            setTab('FAMILIAR');
            setForm(EMPTY_FORM);
            setStatus(null);
          }}
          data-testid="tab-familiar"
        >
          Familiar
        </button>
      </div>

      <p className="text-xs text-pinnacle-navy/50">
        {tab === 'PRIVATE'
          ? 'Registra un nuevo Propietario Privado — abre su propia cuenta en tu universo VIM.'
          : 'Agrega un Familiar a un Propietario Privado existente en tu universo.'}
      </p>

      {/* Credenciales */}
      <div className="space-y-4">
        <SectionHeader icon={User}>Credenciales de Acceso</SectionHeader>
        <div className="archon-grid-2-sovereign">
          <FieldGroup
            label="Usuario"
            id="cli-username"
            value={form.username}
            onChange={set('username')}
            hint="nombre.usuario"
            required
            icon={User}
          />
          <FieldGroup
            label="Correo"
            id="cli-email"
            type="email"
            value={form.email}
            onChange={set('email')}
            hint="correo@cliente.mx"
            required
            icon={Mail}
          />
          <PasswordField
            label="Contraseña"
            id="cli-password"
            value={form.password}
            onChange={set('password')}
            required
          />
          <FieldGroup
            label="Nombre Completo"
            id="cli-fullname"
            value={form.fullName}
            onChange={set('fullName')}
            hint="Opcional"
            icon={Contact}
          />
          {tab === 'FAMILIAR' && (
            <FieldGroup
              label="ID del Propietario Privado"
              id="cli-target"
              type="number"
              value={form.targetOwnerId}
              onChange={set('targetOwnerId')}
              hint="ID numérico del owner"
              required
              icon={Hash}
            />
          )}
        </div>
      </div>

      <StatusBanner status={status} />

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2 rounded-[4px] bg-pinnacle-navy text-pinnacle-yellow text-xs font-black uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
        data-testid="btn-create-client"
      >
        {loading ? 'Registrando...' : clientBtnLabel}
      </button>
    </form>
  );
};

// ─── Module root ──────────────────────────────────────────────────────────────

const OnboardingModule: React.FC = (): React.ReactElement => {
  const { setSectionData } = useSovereignLayout();
  const { isOmnipotent, isSuiteVIM } = usePermissions();

  const omnipotent = isOmnipotent();
  const vimCentro = isSuiteVIM();

  useEffect((): void => {
    setSectionData(
      'Onboarding de Universos',
      'Creación y registro de universos, propietarios y miembros en el Multiverso Archon',
      null,
      {
        variant: 'yellow',
        headerTitle: 'Onboarding',
        HeaderIcon: Globe,
        PayloadIcon: UserPlus,
        actionTitle: 'Onboarding',
        description: 'Registrar universos y clientes',
        buttonText: 'Onboarding de Universos',
        isActive: false,
        onClick: (): void => {
          /* noop */
        },
      }
    );
  }, [setSectionData]);

  return (
    <div className="animate-in fade-in duration-700">
      <section className="archon-workspace-chassis">
        <div className="archon-axial-container space-y-6">
          {omnipotent && (
            <div className="card-archon-sovereign space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="flex items-center gap-3 pb-2 border-b border-slate-200">
                <div className="w-8 h-8 rounded-[4px] bg-pinnacle-navy/10 flex items-center justify-center">
                  <Globe size={16} className="text-pinnacle-navy" />
                </div>
                <div>
                  <h2 className="text-archon-lg font-black text-pinnacle-navy uppercase tracking-widest">
                    Crear Universo
                  </h2>
                  <p className="text-archon-base text-pinnacle-navy/50 font-medium">
                    Archon — Orquestador soberano del Multiverso
                  </p>
                </div>
              </div>
              <UniverseForm />
            </div>
          )}

          {vimCentro && (
            <div className="card-archon-sovereign space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="flex items-center gap-3 pb-2 border-b border-slate-200">
                <div className="w-8 h-8 rounded-[4px] bg-pinnacle-navy/10 flex items-center justify-center">
                  <UserPlus size={16} className="text-pinnacle-navy" />
                </div>
                <div>
                  <h2 className="text-archon-lg font-black text-pinnacle-navy uppercase tracking-widest">
                    Registrar Cliente
                  </h2>
                  <p className="text-archon-base text-pinnacle-navy/50 font-medium">
                    Centro Especializado — Incorporar propietarios al universo VIM
                  </p>
                </div>
              </div>
              <ClientForm />
            </div>
          )}

          {!omnipotent && !vimCentro && (
            <div className="card-archon-sovereign text-center py-12 text-pinnacle-navy/40 text-sm font-medium">
              Sin acceso a funciones de onboarding para este perfil.
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default OnboardingModule;
