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
import UniversesDirectory from './UniversesDirectory';

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

// ─── Archon Section: creates top-level universes (FC158 T2 — solo ERP, ─────────
// la pestaña "Universo VIM"/Especialidades fue purgada: código muerto desde
// FC082 F0c, único universo vivo es FMS) ────────────────────────────────────────

function buildUniversePayload(
  form: FormState,
  addressValue: AddressValue,
  areas: string[]
): Record<string, unknown> {
  const profile: Record<string, unknown> = { rfc: form.rfc };
  if (form.razonSocial) profile.razon_social = form.razonSocial;
  if (form.telefono) profile.telefono = form.telefono;

  const address = addressValue.neighborhoodId
    ? {
        neighborhoodId: parseInt(addressValue.neighborhoodId, 10),
        calle: addressValue.calle,
        numeroExt: addressValue.numeroExt,
        numeroInt: addressValue.numeroInt || undefined,
      }
    : undefined;

  return {
    username: form.username,
    email: form.email,
    password: form.password,
    fullName: form.fullName || undefined,
    roleId: 1,
    profile,
    ...(address ? { address } : {}),
    ...(areas.length > 0 ? { areas } : {}),
  };
}

function extractErrorMessage(err: unknown): string {
  return (
    (err as { response?: { data?: { message?: string; code?: string } } })?.response?.data
      ?.message ??
    (err as { response?: { data?: { code?: string } } })?.response?.data?.code ??
    'Error al crear el universo.'
  );
}

/** FC158 — extracted from UniverseForm (Gate 2 max-lines-per-function): all state + handlers. */
interface UseUniverseFormResult {
  form: FormState;
  addressValue: AddressValue;
  areas: string[];
  loading: boolean;
  status: { ok: boolean; message: string } | null;
  set: (field: keyof FormState) => (value: string) => void;
  setAddressValue: (v: AddressValue) => void;
  setAreas: (a: string[]) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
}

function useUniverseForm(): UseUniverseFormResult {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [addressValue, setAddressValue] = useState<AddressValue>(EMPTY_ADDRESS);
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
    setAreas([]);
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    try {
      await api.post('/onboarding/universe', buildUniversePayload(form, addressValue, areas));
      setStatus({ ok: true, message: 'Universo ERP creado exitosamente.' });
      resetFields();
    } catch (err: unknown) {
      setStatus({ ok: false, message: extractErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  };

  return {
    form,
    addressValue,
    areas,
    loading,
    status,
    set,
    setAddressValue,
    setAreas,
    handleSubmit,
  };
}

function CredencialesSection({
  form,
  set,
}: {
  form: FormState;
  set: (field: keyof FormState) => (value: string) => void;
}): React.ReactElement {
  return (
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
  );
}

function PerfilSection({
  form,
  set,
}: {
  form: FormState;
  set: (field: keyof FormState) => (value: string) => void;
}): React.ReactElement {
  return (
    <div className="space-y-4">
      <SectionHeader icon={Briefcase}>Perfil Empresarial</SectionHeader>
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
    </div>
  );
}

function DireccionSection({
  addressValue,
  setAddressValue,
}: {
  addressValue: AddressValue;
  setAddressValue: (v: AddressValue) => void;
}): React.ReactElement {
  return (
    <div className="space-y-4">
      <SectionHeader icon={MapPin}>Dirección</SectionHeader>
      <ArchonAddressField value={addressValue} onChange={setAddressValue} />
    </div>
  );
}

const UniverseForm: React.FC = (): React.ReactElement => {
  const {
    form,
    addressValue,
    areas,
    loading,
    status,
    set,
    setAddressValue,
    setAreas,
    handleSubmit,
  } = useUniverseForm();

  return (
    <form onSubmit={handleSubmit} className="space-y-6" data-testid="universe-form">
      <p className="text-xs text-pinnacle-navy/50">
        Crea un Propietario de Flotilla — raíz de un universo ERP industrial.
      </p>

      <CredencialesSection form={form} set={set} />
      <PerfilSection form={form} set={set} />
      <DireccionSection addressValue={addressValue} setAddressValue={setAddressValue} />

      {/* Áreas Iniciales */}
      <div className="space-y-3" data-testid="uni-areas-section">
        <SectionHeader icon={LayoutGrid}>Áreas Iniciales</SectionHeader>
        <AreasSelect value={areas} onChange={setAreas} />
        <p className="text-xs text-pinnacle-navy/40 uppercase tracking-widest">
          Estas áreas se crearán al registrar. Pueden gestionarse después.
        </p>
      </div>

      <StatusBanner status={status} />

      <button
        type="submit"
        disabled={loading}
        className="w-full h-11 flex items-center justify-center rounded-[4px] bg-pinnacle-navy text-pinnacle-yellow text-xs font-black uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
        data-testid="btn-create-universe"
      >
        {loading ? 'Creando...' : 'Crear Universo ERP'}
      </button>
    </form>
  );
};

// ─── Module root ──────────────────────────────────────────────────────────────

type OnboardingView = 'FORM' | 'DIRECTORY';

/** FC158 — extracted from OnboardingModule (Gate 2 max-lines-per-function). */
function UniverseFormCard(): React.ReactElement {
  return (
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
  );
}

const OnboardingModule: React.FC = (): React.ReactElement => {
  const { setSectionData } = useSovereignLayout();
  const { isOmnipotent } = usePermissions();
  const [view, setView] = useState<OnboardingView>('FORM');

  const omnipotent = isOmnipotent();

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
        buttonText: view === 'FORM' ? 'Universos Registrados' : 'Crear Universo',
        isActive: view === 'DIRECTORY',
        reverseArrow: view === 'DIRECTORY',
        onClick: (): void => setView((v) => (v === 'FORM' ? 'DIRECTORY' : 'FORM')),
      }
    );
  }, [setSectionData, view]);

  return (
    <div className="animate-in fade-in duration-700">
      <section className="archon-workspace-chassis">
        <div className="archon-axial-container space-y-6">
          {omnipotent && view === 'DIRECTORY' && <UniversesDirectory />}

          {view === 'FORM' && omnipotent && <UniverseFormCard />}

          {view === 'FORM' && !omnipotent && (
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
