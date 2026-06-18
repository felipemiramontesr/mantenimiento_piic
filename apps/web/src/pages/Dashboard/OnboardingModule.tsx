import React, { useEffect, useState } from 'react';
import { Globe, UserPlus } from 'lucide-react';
import { useSovereignLayout } from '../../context/SovereignLayoutContext';
import usePermissions from '../../hooks/usePermissions';
import api from '../../api/client';

type UniverseTab = 'ERP' | 'VIM';
type ClientTab = 'PRIVATE' | 'FAMILIAR';

interface FormState {
  username: string;
  email: string;
  password: string;
  fullName: string;
  rfc: string;
  targetOwnerId: string;
}

const EMPTY_FORM: FormState = {
  username: '',
  email: '',
  password: '',
  fullName: '',
  rfc: '',
  targetOwnerId: '',
};

const inputCls =
  'w-full rounded-[4px] border border-slate-300 bg-white px-3 py-2 text-sm text-pinnacle-navy placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-pinnacle-navy/30';
const labelCls = 'block text-xs font-bold uppercase tracking-widest text-pinnacle-navy/60 mb-1';
const tabBase =
  'flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-[4px] transition-all duration-150 cursor-pointer';
const tabActive = `${tabBase} bg-pinnacle-navy text-pinnacle-yellow`;
const tabInactive = `${tabBase} text-pinnacle-navy/50 hover:bg-pinnacle-navy/5`;

function FieldGroup({
  label,
  id,
  type = 'text',
  value,
  onChange,
  hint,
  required,
}: {
  label: string;
  id: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  required?: boolean;
}): React.ReactElement {
  return (
    <div>
      <label htmlFor={id} className={labelCls}>
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e): void => onChange(e.target.value)}
        placeholder={hint}
        className={inputCls}
        autoComplete="off"
      />
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
      const roleId = tab === 'ERP' ? 1 : 3;
      await api.post('/onboarding/universe', {
        username: form.username,
        email: form.email,
        password: form.password,
        fullName: form.fullName || undefined,
        roleId,
        profile: { rfc: form.rfc },
      });
      setStatus({ ok: true, message: `Universo ${tab} creado exitosamente.` });
      setForm(EMPTY_FORM);
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
    <form onSubmit={handleSubmit} className="space-y-4" data-testid="universe-form">
      <div className="flex gap-2 bg-slate-100 p-1 rounded-[4px]">
        <button
          type="button"
          className={tab === 'ERP' ? tabActive : tabInactive}
          onClick={(): void => {
            setTab('ERP');
            setForm(EMPTY_FORM);
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
            setForm(EMPTY_FORM);
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FieldGroup
          label="Usuario"
          id="uni-username"
          value={form.username}
          onChange={set('username')}
          hint="nombre.usuario"
          required
        />
        <FieldGroup
          label="Correo"
          id="uni-email"
          type="email"
          value={form.email}
          onChange={set('email')}
          hint="correo@empresa.mx"
          required
        />
        <FieldGroup
          label="Contraseña"
          id="uni-password"
          type="password"
          value={form.password}
          onChange={set('password')}
          required
        />
        <FieldGroup
          label="Nombre completo"
          id="uni-fullname"
          value={form.fullName}
          onChange={set('fullName')}
          hint="Opcional"
        />
        <FieldGroup
          label="RFC"
          id="uni-rfc"
          value={form.rfc}
          onChange={set('rfc')}
          hint="RFC de la empresa"
          required
        />
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FieldGroup
          label="Usuario"
          id="cli-username"
          value={form.username}
          onChange={set('username')}
          hint="nombre.usuario"
          required
        />
        <FieldGroup
          label="Correo"
          id="cli-email"
          type="email"
          value={form.email}
          onChange={set('email')}
          hint="correo@cliente.mx"
          required
        />
        <FieldGroup
          label="Contraseña"
          id="cli-password"
          type="password"
          value={form.password}
          onChange={set('password')}
          required
        />
        <FieldGroup
          label="Nombre completo"
          id="cli-fullname"
          value={form.fullName}
          onChange={set('fullName')}
          hint="Opcional"
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
          />
        )}
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
