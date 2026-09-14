import React, { useState } from 'react';
import { Link } from 'react-router';
import { AxiosError } from 'axios';
import PiicLogo from '../../components/Logo/PiicLogo';
import api from '../../api/client';
import serviceBackground from '../../assets/service-bg.png';

/**
 * FC177 F2 — Public_Signup_Endpoint_And_Form. The public, unauthenticated counterpart to
 * `Login.tsx` (same visual chassis: pinnacle-navy hero + white form panel — this is a
 * customer-facing landing page, not an internal dashboard screen, so it does NOT use the
 * Sovereign/`ArchonField` primitives Cosmology uses). Submitting does not log the visitor in —
 * the account is born in quarantine (`is_active: false`); only Ω linking it to a Universo
 * (FC177 F3/F4) activates it.
 */

interface SignupFormData {
  fullName: string;
  email: string;
  password: string;
  rfc: string;
  razonSocial: string;
  regimenFiscal: string;
  codigoPostalFiscal: string;
  telefono: string;
}

const EMPTY_FORM: SignupFormData = {
  fullName: '',
  email: '',
  password: '',
  rfc: '',
  razonSocial: '',
  regimenFiscal: '',
  codigoPostalFiscal: '',
  telefono: '',
};

function getSignupErrorMessage(err: unknown): string {
  const axiosError = err as AxiosError<{ code?: string }>;
  if (axiosError.response?.status === 409) {
    return 'Ya existe una cuenta registrada con estos datos.';
  }
  if (axiosError.response?.status === 400) {
    return 'Revisa tus datos — el RFC, correo o código postal no tienen un formato válido.';
  }
  return 'Error de conexión. Intenta de nuevo más tarde.';
}

interface SignupFormState {
  data: SignupFormData;
  setField: (field: keyof SignupFormData, value: string) => void;
  loading: boolean;
  error: string | null;
  success: boolean;
  handleSubmit: (e: React.FormEvent) => void;
}

/** Estado + submit del formulario de autoregistro (FC177 F2). */
function useSignupForm(): SignupFormState {
  const [data, setData] = useState<SignupFormData>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const setField = (field: keyof SignupFormData, value: string): void => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { telefono, ...required } = data;
    api
      .post('/public/signup', { ...required, ...(telefono ? { telefono } : {}) })
      .then(() => setSuccess(true))
      .catch((err: unknown) => setError(getSignupErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  return { data, setField, loading, error, success, handleSubmit };
}

/** Panel de marketing izquierdo, mismo patrón que `HeroContent` de Login.tsx. */
function SignupHeroContent(): React.JSX.Element {
  return (
    <section className="relative z-20 hidden md:flex flex-col md:col-span-2 min-h-screen p-0 overflow-hidden">
      <main className="flex-1 flex flex-col justify-center px-6 md:px-20 gap-8 animate-in fade-in slide-in-from-bottom duration-1000 delay-200">
        <div className="w-full">
          <h1 className="text-pinnacle-white font-display font-black text-3xl md:text-5xl lg:text-6xl leading-[1.05] max-w-[20ch]">
            Crea tu cuenta y comienza tu propio proceso de incorporación
          </h1>
        </div>
        <p className="text-pinnacle-white/70 text-lg md:text-xl max-w-[42ch] font-sans">
          Regístrate con tus datos fiscales. Un administrador de Archon vinculará tu cuenta a tu
          Universo — no necesitas esperar a que alguien capture tus datos por ti.
        </p>
      </main>
    </section>
  );
}

interface SignupFieldsProps {
  readonly data: SignupFormData;
  readonly onChange: (field: keyof SignupFormData, value: string) => void;
  readonly loading: boolean;
}

const FIELD_LABEL_CLASS =
  'font-sans text-archon-base font-black text-pinnacle-navy uppercase tracking-[0.18em] opacity-70';
const FIELD_INPUT_CLASS =
  'w-full h-12 bg-pinnacle-navy/[0.03] border-none border-b-2 border-pinnacle-navy/10 px-5 text-[15px] font-bold text-pinnacle-navy outline-none transition-all focus:bg-transparent focus:border-pinnacle-yellow focus:pl-3 rounded-[4px] placeholder:text-pinnacle-navy/20';

/** Nombre, correo, contraseña — identidad del solicitante. */
function SignupIdentityFields({ data, onChange, loading }: SignupFieldsProps): React.JSX.Element {
  return (
    <>
      <div className="flex flex-col gap-1 mb-4">
        <label htmlFor="signup-fullname" className={FIELD_LABEL_CLASS}>
          Nombre Completo
        </label>
        <input
          id="signup-fullname"
          type="text"
          value={data.fullName}
          onChange={(e): void => onChange('fullName', e.target.value)}
          className={FIELD_INPUT_CLASS}
          disabled={loading}
          required
        />
      </div>
      <div className="flex flex-col gap-1 mb-4">
        <label htmlFor="signup-email" className={FIELD_LABEL_CLASS}>
          Correo Electrónico
        </label>
        <input
          id="signup-email"
          type="email"
          value={data.email}
          onChange={(e): void => onChange('email', e.target.value)}
          className={FIELD_INPUT_CLASS}
          disabled={loading}
          required
        />
      </div>
      <div className="flex flex-col gap-1 mb-4">
        <label htmlFor="signup-password" className={FIELD_LABEL_CLASS}>
          Contraseña
        </label>
        <input
          id="signup-password"
          type="password"
          minLength={8}
          value={data.password}
          onChange={(e): void => onChange('password', e.target.value)}
          className={FIELD_INPUT_CLASS}
          disabled={loading}
          required
        />
      </div>
    </>
  );
}

/** RFC + Código Postal fiscal — mitad superior de los datos de la Constancia SAT. */
function SignupRfcAndCpFields({ data, onChange, loading }: SignupFieldsProps): React.JSX.Element {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="signup-rfc" className={FIELD_LABEL_CLASS}>
          RFC
        </label>
        <input
          id="signup-rfc"
          type="text"
          value={data.rfc}
          onChange={(e): void => onChange('rfc', e.target.value.toUpperCase())}
          className={FIELD_INPUT_CLASS}
          disabled={loading}
          required
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="signup-cp" className={FIELD_LABEL_CLASS}>
          Código Postal Fiscal
        </label>
        <input
          id="signup-cp"
          type="text"
          maxLength={5}
          value={data.codigoPostalFiscal}
          onChange={(e): void => onChange('codigoPostalFiscal', e.target.value)}
          className={FIELD_INPUT_CLASS}
          disabled={loading}
          required
        />
      </div>
    </div>
  );
}

/** Régimen Fiscal + Teléfono (opcional) — mitad inferior de los datos fiscales. */
function SignupRegimenAndTelefonoFields({
  data,
  onChange,
  loading,
}: SignupFieldsProps): React.JSX.Element {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      <div className="flex flex-col gap-1">
        <label htmlFor="signup-regimen" className={FIELD_LABEL_CLASS}>
          Régimen Fiscal
        </label>
        <input
          id="signup-regimen"
          type="text"
          value={data.regimenFiscal}
          onChange={(e): void => onChange('regimenFiscal', e.target.value)}
          className={FIELD_INPUT_CLASS}
          disabled={loading}
          required
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="signup-telefono" className={FIELD_LABEL_CLASS}>
          Teléfono (Opcional)
        </label>
        <input
          id="signup-telefono"
          type="tel"
          value={data.telefono}
          onChange={(e): void => onChange('telefono', e.target.value)}
          className={FIELD_INPUT_CLASS}
          disabled={loading}
        />
      </div>
    </div>
  );
}

/** RFC, Razón Social, Régimen Fiscal, CP — datos de la Constancia de Situación Fiscal (SAT).
 *  Compuesto de 2 sub-componentes para mantenerse bajo el presupuesto de Gate 2. */
function SignupFiscalFields(props: SignupFieldsProps): React.JSX.Element {
  const { data, onChange, loading } = props;
  return (
    <>
      <p className="text-pinnacle-navy/40 font-sans text-xs mb-3 mt-2">
        Estos datos deben coincidir con tu Constancia de Situación Fiscal (SAT) para poder
        facturarte correctamente.
      </p>
      <SignupRfcAndCpFields data={data} onChange={onChange} loading={loading} />
      <div className="flex flex-col gap-1 mb-4">
        <label htmlFor="signup-razon-social" className={FIELD_LABEL_CLASS}>
          Razón Social
        </label>
        <input
          id="signup-razon-social"
          type="text"
          value={data.razonSocial}
          onChange={(e): void => onChange('razonSocial', e.target.value)}
          className={FIELD_INPUT_CLASS}
          disabled={loading}
          required
        />
      </div>
      <SignupRegimenAndTelefonoFields data={data} onChange={onChange} loading={loading} />
    </>
  );
}

interface SignupFormProps extends SignupFieldsProps {
  readonly error: string | null;
  readonly onSubmit: (e: React.FormEvent) => void;
}

/** Encabezado + banner de error + campos + submit del formulario de autoregistro. */
function SignupForm({
  data,
  onChange,
  loading,
  error,
  onSubmit,
}: SignupFormProps): React.JSX.Element {
  return (
    <div className="w-full max-w-[480px]">
      <header className="mb-8">
        <h2 className="text-pinnacle-navy font-display font-black text-4xl lg:text-5xl tracking-tight leading-tight">
          Crear Cuenta
        </h2>
        <p className="text-pinnacle-navy/40 font-display font-bold text-archon-md uppercase tracking-[0.25em] mt-2">
          Autoregistro
        </p>
      </header>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 text-red-600 text-archon-md font-black uppercase rounded-[4px] border-l-4 border-red-500 animate-in slide-in-from-top duration-300">
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} className="flex flex-col" data-testid="signup-form">
        <SignupIdentityFields data={data} onChange={onChange} loading={loading} />
        <SignupFiscalFields data={data} onChange={onChange} loading={loading} />
        <button
          type="submit"
          disabled={loading}
          data-testid="signup-submit"
          className="btn-archon-primary w-full"
        >
          {loading ? 'Registrando…' : 'Crear Cuenta'}
        </button>
        <p className="text-center text-pinnacle-navy/50 text-sm mt-6">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="text-pinnacle-yellow font-bold">
            Inicia sesión
          </Link>
        </p>
      </form>
    </div>
  );
}

/** Confirmación post-registro — Scenario 1: nace en cuarentena, NO se inicia sesión aquí. */
function SignupSuccessPanel(): React.JSX.Element {
  return (
    <div className="w-full max-w-[440px] text-center" data-testid="signup-success">
      <h2 className="text-pinnacle-navy font-display font-black text-3xl lg:text-4xl tracking-tight leading-tight mb-4">
        Registro Recibido
      </h2>
      <p className="text-pinnacle-navy/60 text-lg mb-8">
        Tu cuenta fue creada correctamente y está pendiente de activación. Un administrador la
        vinculará a tu Universo — recibirás acceso cuando eso ocurra.
      </p>
      <Link to="/login" className="btn-archon-ghost">
        Volver al inicio de sesión
      </Link>
    </div>
  );
}

/** Panel derecho: logo móvil, formulario/confirmación, pie de página (mismo patrón que LoginPanel). */
function SignupPanel(props: SignupFormState): React.JSX.Element {
  const { data, setField, loading, error, success, handleSubmit } = props;
  return (
    <section className="relative z-30 flex flex-col items-center justify-center col-span-1 min-h-screen bg-white shadow-[-20px_0_50px_rgba(0,0,0,0.2)] py-12">
      <div className="w-full h-full flex flex-col animate-in fade-in zoom-in duration-1000 delay-300">
        <header className="h-[10vh] md:hidden bg-pinnacle-navy flex items-center px-6">
          <PiicLogo />
        </header>

        <main className="flex-1 flex flex-col justify-center px-6 md:px-16">
          {success ? (
            <SignupSuccessPanel />
          ) : (
            <SignupForm
              data={data}
              onChange={setField}
              loading={loading}
              error={error}
              onSubmit={handleSubmit}
            />
          )}
        </main>
      </div>
    </section>
  );
}

/** Public self-registration page — FC177 F2, same visual chassis as `LoginPage`. */
const SignupPage: React.FC = () => {
  const formState = useSignupForm();

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 min-h-screen overflow-hidden bg-pinnacle-navy font-sans">
      <img
        src={serviceBackground}
        alt="Service Workshop"
        className="fixed inset-0 w-full h-full object-cover z-0 animate-[pulse_60s_infinite_alternate] opacity-40 md:opacity-100"
      />
      <div className="fixed inset-0 z-10 bg-gradient-to-br from-pinnacle-navy/80 to-pinnacle-navy/95 backdrop-blur-[2px]" />

      <SignupHeroContent />
      <SignupPanel {...formState} />
    </div>
  );
};

export default SignupPage;
