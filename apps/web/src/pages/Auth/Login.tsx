import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { AxiosError } from 'axios';
import api from '../../api/client';
import serviceBackground from '../../assets/service-bg.png';
import { useAuth } from '../../context/AuthContext';
import useMfaChallenge, { MfaChallengeState } from './useMfaChallenge';
import LoginPanel from './LoginPanel';
import { UserIndustrial } from '../../types/user';
import { MfaMethod } from '../../api/mfa';
import { ChallengeInfo } from './useEmailChallenge';

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
  mfaAllowedMethods: readonly MfaMethod[];
  mfaJustActivated: boolean;
  handleMfaSetupComplete: () => void;
  mfaChallenge: MfaChallengeState;
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
  readonly setMfaAllowedMethods: (v: readonly MfaMethod[]) => void;
  readonly startMfaChallenge: (mfaToken: string, info?: ChallengeInfo) => void;
}

interface LoginApiResponse {
  data: {
    mfaSetupRequired?: boolean;
    setupToken?: string;
    mfaRequired?: boolean;
    mfaToken?: string;
    /** FC195 — métodos que puede enrolar (con `mfaSetupRequired`). */
    allowedMethods?: MfaMethod[];
    /** FC195 — canal del reto y a dónde se envió el código (con `mfaRequired`). */
    channel?: MfaMethod;
    maskedEmail?: string | null;
    codeSent?: boolean;
    token?: string;
    user?: UserIndustrial;
  };
}

/** Traduce la respuesta de `/auth/login` a una de 4 ramas (sesión completa, `mfaSetupRequired`
 *  F3, `mfaRequired` F4, o error de protocolo) — extraída de `handleLogin` para mantener
 *  `useLoginForm` bajo Gate 2, mismo comportamiento verbatim para las ramas preexistentes. */
function handleLoginResponse(response: LoginApiResponse, handlers: LoginResponseHandlers): void {
  const { data } = response;
  if (data.mfaSetupRequired) {
    handlers.setMfaAllowedMethods(data.allowedMethods ?? ['totp']);
    handlers.setMfaSetupToken(data.setupToken ?? null);
  } else if (data.mfaRequired && data.mfaToken) {
    handlers.startMfaChallenge(data.mfaToken, {
      channel: data.channel,
      maskedEmail: data.maskedEmail,
      codeSent: data.codeSent,
    });
  } else if (response.data.token && response.data.user) {
    handlers.login(response.data.token, response.data.user);
    handlers.navigate('/dashboard');
  } else {
    handlers.setError('Error de protocolo: El servidor no devolvió una clave de acceso válida.');
  }
}

/** Estado del enrolamiento obligatorio F3 (`mfaSetupToken`/`mfaJustActivated`) — extraído de
 *  `useLoginForm` para mantenerlo bajo Gate 2, mismo comportamiento verbatim. */
function useMfaSetupFlow(setPassword: (v: string) => void): {
  mfaSetupToken: string | null;
  setMfaSetupToken: (v: string | null) => void;
  mfaAllowedMethods: readonly MfaMethod[];
  setMfaAllowedMethods: (v: readonly MfaMethod[]) => void;
  mfaJustActivated: boolean;
  setMfaJustActivated: (v: boolean) => void;
  handleMfaSetupComplete: () => void;
} {
  const [mfaSetupToken, setMfaSetupToken] = useState<string | null>(null);
  const [mfaAllowedMethods, setMfaAllowedMethods] = useState<readonly MfaMethod[]>(['totp']);
  const [mfaJustActivated, setMfaJustActivated] = useState(false);

  const handleMfaSetupComplete = (): void => {
    setMfaSetupToken(null);
    setMfaJustActivated(true);
    setPassword('');
  };

  return {
    mfaSetupToken,
    setMfaSetupToken,
    mfaAllowedMethods,
    setMfaAllowedMethods,
    mfaJustActivated,
    setMfaJustActivated,
    handleMfaSetupComplete,
  };
}

interface PerformLoginState {
  readonly setLoading: (v: boolean) => void;
  readonly setError: (v: string | null) => void;
  readonly setMfaJustActivated: (v: boolean) => void;
}

/** El submit completo: banderas de estado + `POST /auth/login` + traducción de la respuesta —
 *  extraído de `useLoginForm` para mantenerlo bajo Gate 2, mismo comportamiento verbatim. */
function performLogin(
  username: string,
  password: string,
  state: PerformLoginState,
  responseHandlers: LoginResponseHandlers
): void {
  state.setLoading(true);
  state.setError(null);
  state.setMfaJustActivated(false);

  api
    .post('/auth/login', { username, password })
    .then((response) => handleLoginResponse(response, responseHandlers))
    .catch((err: unknown) => state.setError(getLoginErrorMessage(err)))
    .finally(() => state.setLoading(false));
}

/** Fábrica del `onSubmit` del formulario — extraída de `useLoginForm` para mantenerlo bajo
 *  Gate 2, mismo comportamiento verbatim. */
function makeHandleLogin(
  username: string,
  password: string,
  state: PerformLoginState,
  responseHandlers: LoginResponseHandlers
): (e: React.FormEvent) => void {
  return (e: React.FormEvent): void => {
    e.preventDefault();
    performLogin(username, password, state, responseHandlers);
  };
}

/** Estado y submit del formulario de acceso (FC163 F2B4 Sub-Batch 4B-2).
 *  FC185 F3 — `mfaSetupRequired: true` (Ω/MU sin MFA enrolado, invariante 4 del FC) desvía a
 *  `MfaEnrollmentWizard` con el `setupToken` de alcance mínimo en vez de continuar el login;
 *  confirmar el enrolamiento NO emite sesión (F2 no la emite ahí) — el usuario vuelve al
 *  formulario y entra normal con su password ya enrolado. FC185 F4 — `mfaRequired: true` desvía a
 *  `useMfaChallenge`, cuyo `onSuccess` reusa el MISMO `login()+navigate()` que un login normal. */
function useLoginForm(): LoginFormState {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showCookies, acceptCookies, dismissCookies } = useCookieConsent();
  const setupFlow = useMfaSetupFlow(setPassword);
  const mfaChallenge = useMfaChallenge((token, user) => {
    login(token, user);
    navigate('/dashboard');
  });

  const handleLogin = makeHandleLogin(
    username,
    password,
    { setLoading, setError, setMfaJustActivated: setupFlow.setMfaJustActivated },
    {
      login,
      navigate,
      setError,
      setMfaSetupToken: setupFlow.setMfaSetupToken,
      setMfaAllowedMethods: setupFlow.setMfaAllowedMethods,
      startMfaChallenge: mfaChallenge.start,
    }
  );

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
    mfaSetupToken: setupFlow.mfaSetupToken,
    mfaAllowedMethods: setupFlow.mfaAllowedMethods,
    mfaJustActivated: setupFlow.mfaJustActivated,
    handleMfaSetupComplete: setupFlow.handleMfaSetupComplete,
    mfaChallenge,
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
    mfaAllowedMethods,
    mfaJustActivated,
    handleMfaSetupComplete,
    mfaChallenge,
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
        mfaAllowedMethods={mfaAllowedMethods}
        onMfaSetupComplete={handleMfaSetupComplete}
        mfaChallenge={mfaChallenge}
      />

      {showCookies && <CookieBanner onReject={dismissCookies} onAccept={acceptCookies} />}
    </div>
  );
};

export default LoginPage;
