import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import { AxiosError } from 'axios';
import PiicLogo from '../../components/Logo/PiicLogo';
import api from '../../api/client';
import serviceBackground from '../../assets/service-bg.png';
import { useAuth } from '../../context/AuthContext';
import MfaEnrollmentWizard from '../../components/Identity/MfaEnrollment/MfaEnrollmentWizard';
import { UserIndustrial } from '../../types/user';

interface LoginFormState {
  username: string;
  setUsername: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  loading: boolean;
  error: string | null;
  handleLogin: (e: React.FormEvent) => void;
  showCookies: boolean;
  acceptCookies: () => void;
  dismissCookies: () => void;
  mfaSetupToken: string | null;
  mfaJustActivated: boolean;
  handleMfaSetupComplete: () => void;
}

function getLoginErrorMessage(err: unknown): string {
  const axiosError = err as AxiosError<{ error: string }>;
  return axiosError.response?.status === 401
    ? 'Credenciales inválidas. Verifique su ID de Archon.'
    : 'Error de conexión. Intente de nuevo más tarde (Verifique que la API esté encendida).';
}

/** Banner de consentimiento de cookies — extraído de `useLoginForm` para mantenerlo bajo Gate 2
 *  (FC185 F3, sin cambio de comportamiento). */
function useCookieConsent(): {
  showCookies: boolean;
  acceptCookies: () => void;
  dismissCookies: () => void;
} {
  const [showCookies, setShowCookies] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('cookies_accepted')) setShowCookies(true);
  }, []);

  const acceptCookies = (): void => {
    localStorage.setItem('cookies_accepted', 'true');
    setShowCookies(false);
  };

  return { showCookies, acceptCookies, dismissCookies: (): void => setShowCookies(false) };
}

interface LoginResponseHandlers {
  readonly login: (token: string, user: UserIndustrial) => void;
  readonly navigate: (path: string) => void;
  readonly setError: (v: string | null) => void;
  readonly setMfaSetupToken: (v: string | null) => void;
}

interface LoginApiResponse {
  data: {
    mfaSetupRequired?: boolean;
    setupToken?: string;
    token?: string;
    user?: UserIndustrial;
  };
}

/** Traduce la respuesta de `/auth/login` a una de las 3 ramas (sesión completa, `mfaSetupRequired`
 *  FC185 F3, o error de protocolo) — extraída de `handleLogin` para mantener `useLoginForm` bajo
 *  Gate 2, mismo comportamiento verbatim. */
function handleLoginResponse(response: LoginApiResponse, handlers: LoginResponseHandlers): void {
  if (response.data.mfaSetupRequired) {
    handlers.setMfaSetupToken(response.data.setupToken ?? null);
  } else if (response.data.token && response.data.user) {
    handlers.login(response.data.token, response.data.user);
    handlers.navigate('/dashboard');
  } else {
    handlers.setError('Error de protocolo: El servidor no devolvió una clave de acceso válida.');
  }
}

/** Estado y submit del formulario de acceso (FC163 F2B4 Sub-Batch 4B-2).
 *  FC185 F3 — `mfaSetupRequired: true` (Ω/MU sin MFA enrolado, invariante 4 del FC) desvía a
 *  `MfaEnrollmentWizard` con el `setupToken` de alcance mínimo en vez de continuar el login;
 *  confirmar el enrolamiento NO emite sesión (F2 no la emite ahí) — el usuario vuelve al
 *  formulario y entra normal con su password ya enrolado. `mfaRequired: true` (login de dos pasos
 *  para quien YA tiene MFA) es alcance de F4, deliberadamente sin manejar aún aquí. */
function useLoginForm(): LoginFormState {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mfaSetupToken, setMfaSetupToken] = useState<string | null>(null);
  const [mfaJustActivated, setMfaJustActivated] = useState(false);
  const { showCookies, acceptCookies, dismissCookies } = useCookieConsent();

  const handleLogin = (e: React.FormEvent): void => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMfaJustActivated(false);

    api
      .post('/auth/login', { username, password })
      .then((response) =>
        handleLoginResponse(response, { login, navigate, setError, setMfaSetupToken })
      )
      .catch((err: unknown) => setError(getLoginErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  const handleMfaSetupComplete = (): void => {
    setMfaSetupToken(null);
    setMfaJustActivated(true);
    setPassword('');
  };

  return {
    username,
    setUsername,
    password,
    setPassword,
    loading,
    error,
    handleLogin,
    showCookies,
    acceptCookies,
    dismissCookies,
    mfaSetupToken,
    mfaJustActivated,
    handleMfaSetupComplete,
  };
}

/** Panel izquierdo de marketing/hero, oculto en móvil (FC163 F2B4 Sub-Batch 4B-2). */
function HeroContent(): React.JSX.Element {
  return (
    <section className="relative z-20 hidden md:flex flex-col md:col-span-2 min-h-screen p-0 overflow-hidden">
      <main className="flex-1 flex flex-col justify-center px-6 md:px-20 gap-8 animate-in fade-in slide-in-from-bottom duration-1000 delay-200">
        <div className="w-full">
          <h1 className="text-pinnacle-white font-display font-black text-3xl md:text-5xl lg:text-6xl leading-[1.05] max-w-[20ch]">
            Suministro industrial, tecnológico y <br className="hidden lg:block" /> comercial para
            operaciones que no pueden detenerse
          </h1>
        </div>
        <p className="text-pinnacle-white/70 text-lg md:text-xl whitespace-nowrap font-sans">
          Respuesta rápida y suministro confiable para el sector minero e industrial.
        </p>
        <div className="flex flex-col md:flex-row gap-4 mt-4">
          <a
            href="https://wa.me/5214929421780"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-archon-primary"
          >
            Contactar a un asesor
          </a>
          <a
            href="https://piic.com.mx/"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-archon-ghost"
          >
            Ver sitio Web
          </a>
        </div>
      </main>
    </section>
  );
}

interface LoginFormProps {
  readonly username: string;
  readonly password: string;
  readonly onUsernameChange: (v: string) => void;
  readonly onPasswordChange: (v: string) => void;
  readonly loading: boolean;
  readonly error: string | null;
  readonly onSubmit: (e: React.FormEvent) => void;
  readonly mfaJustActivated: boolean;
}

interface LoginCredentialFieldsProps {
  readonly username: string;
  readonly password: string;
  readonly onUsernameChange: (v: string) => void;
  readonly onPasswordChange: (v: string) => void;
  readonly loading: boolean;
}

/** Campos de usuario y contraseña del formulario de acceso (FC163 F2B4 Sub-Batch 4B-2). */
function LoginCredentialFields({
  username,
  password,
  onUsernameChange,
  onPasswordChange,
  loading,
}: LoginCredentialFieldsProps): React.JSX.Element {
  return (
    <>
      <div className="flex flex-col gap-1 relative mb-4">
        <label
          htmlFor="login-username"
          className="font-sans text-archon-base font-black text-pinnacle-navy uppercase tracking-[0.18em] opacity-70"
        >
          Usuario o Correo
        </label>
        <input
          id="login-username"
          type="text"
          placeholder="usuario o correo@empresa.com"
          value={username}
          onChange={(e): void => onUsernameChange(e.target.value)}
          className="w-full h-14 bg-pinnacle-navy/[0.03] border-none border-b-2 border-pinnacle-navy/10 px-5 text-[15px] font-bold text-pinnacle-navy outline-none transition-all focus:bg-transparent focus:border-pinnacle-yellow focus:pl-3 rounded-[4px] placeholder:text-pinnacle-navy/20"
          disabled={loading}
          required
        />
      </div>

      <div className="flex flex-col gap-1 relative mb-6">
        <label
          htmlFor="login-password"
          className="font-sans text-archon-base font-black text-pinnacle-navy uppercase tracking-[0.18em] opacity-70"
        >
          Clave de Seguridad
        </label>
        <input
          id="login-password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e): void => onPasswordChange(e.target.value)}
          className="w-full h-14 bg-pinnacle-navy/[0.03] border-none border-b-2 border-pinnacle-navy/10 px-5 text-[15px] font-bold text-pinnacle-navy outline-none transition-all focus:bg-transparent focus:border-pinnacle-yellow focus:pl-3 rounded-[4px] placeholder:text-pinnacle-navy/20"
          disabled={loading}
          required
        />
      </div>
    </>
  );
}

/** Botón de submit + links de contraseña olvidada / autoregistro (FC163 F2B4; FC177 F2 — link a /signup). */
function LoginSubmitButton({ loading }: { readonly loading: boolean }): React.JSX.Element {
  return (
    <div className="flex flex-col">
      <button type="submit" disabled={loading} className="btn-archon-primary w-full !md:w-full">
        {loading ? 'Autenticando Archon...' : 'Acceder al Sistema'}
      </button>
      <div className="flex items-center justify-between mt-[5px]">
        <button
          type="button"
          className="text-pinnacle-yellow font-display font-bold text-xs hover:opacity-80 transition-all"
        >
          ¿Olvidaste tu contraseña?
        </button>
        <Link
          to="/signup"
          className="text-pinnacle-navy/50 font-display font-bold text-xs hover:opacity-80 transition-all"
        >
          Crear cuenta
        </Link>
      </div>
    </div>
  );
}

/** Encabezado + banner de error + inputs + submit del formulario de acceso (FC163 F2B4 Sub-Batch 4B-2). */
function LoginForm({
  username,
  password,
  onUsernameChange,
  onPasswordChange,
  loading,
  error,
  onSubmit,
  mfaJustActivated,
}: LoginFormProps): React.JSX.Element {
  return (
    <div className="w-full max-w-[440px]">
      <header className="mb-12">
        <h2 className="text-pinnacle-navy font-display font-black text-4xl lg:text-5xl tracking-tight leading-tight">
          Acceso Archon
        </h2>
        <p className="text-pinnacle-navy/40 font-display font-bold text-archon-md uppercase tracking-[0.25em] mt-2">
          Control de Flotas
        </p>
      </header>

      {mfaJustActivated && (
        <div
          data-testid="mfa-just-activated-banner"
          className="mb-6 p-4 bg-emerald-500/10 text-emerald-700 text-archon-md font-black rounded-[4px] border-l-4 border-emerald-500 animate-in slide-in-from-top duration-300"
        >
          MFA activado. Ingresa tu contraseña de nuevo para continuar.
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 text-red-600 text-archon-md font-black uppercase rounded-[4px] border-l-4 border-red-500 animate-in slide-in-from-top duration-300">
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} className="flex flex-col gap-6">
        <LoginCredentialFields
          username={username}
          password={password}
          onUsernameChange={onUsernameChange}
          onPasswordChange={onPasswordChange}
          loading={loading}
        />
        <LoginSubmitButton loading={loading} />
      </form>
    </div>
  );
}

interface CookieBannerProps {
  readonly onReject: () => void;
  readonly onAccept: () => void;
}

/** Banner de consentimiento de cookies, fijo al pie (FC163 F2B4 Sub-Batch 4B-2). */
function CookieBanner({ onReject, onAccept }: CookieBannerProps): React.JSX.Element {
  return (
    <div className="fixed bottom-0 left-0 w-full bg-pinnacle-yellow h-[10vh] px-6 md:px-16 z-[1000] flex items-center justify-between animate-in slide-in-from-bottom duration-500 shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
      <p className="text-pinnacle-navy text-archon-md font-bold max-w-4xl leading-tight hidden md:block">
        Utilizamos cookies propias y de terceros. Al continuar navegando, acepta esta{' '}
        <a
          href="https://piic.com.mx/politicas"
          target="_blank"
          rel="noopener noreferrer"
          className="font-black underline"
        >
          política de uso, tratamiento de información y cookies.
        </a>
      </p>
      <div className="flex gap-4 w-full md:w-auto justify-center md:justify-end">
        <button
          type="button"
          onClick={onReject}
          className="px-8 h-10 bg-white text-pinnacle-navy rounded-[4px] font-black text-archon-base uppercase tracking-widest hover:bg-pinnacle-navy hover:text-white transition-all shadow-sm"
        >
          RECHAZAR
        </button>
        <button
          type="button"
          onClick={onAccept}
          className="px-8 h-10 bg-pinnacle-navy text-white rounded-[4px] font-black text-archon-base uppercase tracking-widest hover:bg-white hover:text-pinnacle-navy transition-all shadow-md"
        >
          ACEPTAR
        </button>
      </div>
    </div>
  );
}

interface LoginPanelProps {
  readonly username: string;
  readonly password: string;
  readonly onUsernameChange: (v: string) => void;
  readonly onPasswordChange: (v: string) => void;
  readonly loading: boolean;
  readonly error: string | null;
  readonly onSubmit: (e: React.FormEvent) => void;
  readonly mfaJustActivated: boolean;
  readonly mfaSetupToken: string | null;
  readonly onMfaSetupComplete: () => void;
}

/** Panel derecho: logo móvil, formulario de acceso o asistente MFA obligatorio, pie de página
 *  (FC163 F2B4 Sub-Batch 4B-2; FC185 F3 — `mfaSetupToken` reemplaza el formulario por el
 *  asistente, invariante 4 del FC: Ω/MU no puede saltarse el enrolamiento). */
function LoginPanel(props: LoginPanelProps): React.JSX.Element {
  const { mfaSetupToken, onMfaSetupComplete, ...formProps } = props;
  return (
    <section className="relative z-30 flex flex-col items-center justify-center col-span-1 min-h-screen bg-white shadow-[-20px_0_50px_rgba(0,0,0,0.2)]">
      <div className="w-full h-full flex flex-col animate-in fade-in zoom-in duration-1000 delay-300">
        <header className="h-[10vh] md:hidden bg-pinnacle-navy flex items-center px-6">
          <PiicLogo />
        </header>

        <main className="flex-1 flex flex-col justify-center px-6 md:px-16">
          {mfaSetupToken ? (
            <div className="w-full max-w-[440px]" data-testid="mfa-mandatory-setup">
              <MfaEnrollmentWizard token={mfaSetupToken} onComplete={onMfaSetupComplete} />
            </div>
          ) : (
            <LoginForm {...formProps} />
          )}
        </main>

        <footer className="h-[10vh] flex items-center justify-center border-t border-pinnacle-navy/5 px-8">
          <div className="flex flex-col items-center gap-1 text-center">
            <span className="text-pinnacle-navy/40 font-bold text-archon-sm uppercase tracking-widest">
              © Todos los derechos reservados. Dreamtek.
            </span>
          </div>
        </footer>
      </div>
    </section>
  );
}

/**
 * LoginPage Component - ARCHON System (V.78.100.80)
 *
 * Final hardening of the Atomic Tailwind Architecture.
 * - Uses .btn-archon-* component classes for interaction consistency.
 * - Restores test-compliant placeholders and labels.
 * - Purged all inline kinetic transforms (scale/active).
 */
const LoginPage: React.FC = () => {
  const {
    username,
    setUsername,
    password,
    setPassword,
    loading,
    error,
    handleLogin,
    showCookies,
    acceptCookies,
    dismissCookies,
    mfaSetupToken,
    mfaJustActivated,
    handleMfaSetupComplete,
  } = useLoginForm();

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 min-h-screen overflow-hidden bg-pinnacle-navy font-sans">
      <img
        src={serviceBackground}
        alt="Service Workshop"
        className="fixed inset-0 w-full h-full object-cover z-0 animate-[pulse_60s_infinite_alternate] opacity-40 md:opacity-100"
      />
      <div className="fixed inset-0 z-10 bg-gradient-to-br from-pinnacle-navy/80 to-pinnacle-navy/95 backdrop-blur-[2px]"></div>

      <HeroContent />

      <LoginPanel
        username={username}
        password={password}
        onUsernameChange={setUsername}
        onPasswordChange={setPassword}
        loading={loading}
        error={error}
        onSubmit={handleLogin}
        mfaJustActivated={mfaJustActivated}
        mfaSetupToken={mfaSetupToken}
        onMfaSetupComplete={handleMfaSetupComplete}
      />

      {showCookies && <CookieBanner onReject={dismissCookies} onAccept={acceptCookies} />}
    </div>
  );
};

export default LoginPage;
