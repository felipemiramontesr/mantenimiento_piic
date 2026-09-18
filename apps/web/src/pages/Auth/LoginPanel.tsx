import React, { useState } from 'react';
import { Link } from 'react-router';
import PiicLogo from '../../components/Logo/PiicLogo';
import MfaEnrollmentWizard from '../../components/Identity/MfaEnrollment/MfaEnrollmentWizard';
import MfaChallengeStep from '../../components/Identity/MfaEnrollment/MfaChallengeStep';
import { MfaChallengeState } from './useMfaChallenge';
import PasswordVisibilityToggle from './PasswordVisibilityToggle';

/**
 * FC163 F2B4 Sub-Batch 4B-2 (formulario original) + FC185 F3/F4 (asistente MFA obligatorio y
 * desafío de login) + FC184 F3 (toggle de visibilidad, Scenario 4) — extraído de `Login.tsx` a su
 * propio archivo porque el archivo combinado superaba el límite de 400 líneas de ESLint (Gate 2/1).
 */

interface LoginFormProps {
  readonly username: string;
  readonly password: string;
  readonly onUsernameChange: (v: string) => void;
  readonly onPasswordChange: (v: string) => void;
  readonly loading: boolean;
  readonly error: string | null;
  readonly onSubmit: (e: React.FormEvent) => void;
  readonly mfaJustActivated: boolean;
  readonly mfaChallengeExpired: boolean;
}

interface LoginCredentialFieldsProps {
  readonly username: string;
  readonly password: string;
  readonly onUsernameChange: (v: string) => void;
  readonly onPasswordChange: (v: string) => void;
  readonly loading: boolean;
}

/** Campo de usuario/correo — extraído de `LoginCredentialFields` para mantenerla bajo Gate 2. */
function LoginUsernameField({
  username,
  onUsernameChange,
  loading,
}: Pick<
  LoginCredentialFieldsProps,
  'username' | 'onUsernameChange' | 'loading'
>): React.JSX.Element {
  return (
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
  );
}

/** Campo de clave de seguridad + toggle de visibilidad (FC184 F3, Scenario 4) — extraído de
 *  `LoginCredentialFields` para mantenerla bajo Gate 2. */
function LoginPasswordField({
  password,
  onPasswordChange,
  loading,
}: Pick<
  LoginCredentialFieldsProps,
  'password' | 'onPasswordChange' | 'loading'
>): React.JSX.Element {
  const [visible, setVisible] = useState(false);
  return (
    <div className="flex flex-col gap-1 relative mb-6">
      <label
        htmlFor="login-password"
        className="font-sans text-archon-base font-black text-pinnacle-navy uppercase tracking-[0.18em] opacity-70"
      >
        Clave de Seguridad
      </label>
      <div className="relative">
        <input
          id="login-password"
          type={visible ? 'text' : 'password'}
          placeholder="••••••••"
          value={password}
          onChange={(e): void => onPasswordChange(e.target.value)}
          className="w-full h-14 bg-pinnacle-navy/[0.03] border-none border-b-2 border-pinnacle-navy/10 px-5 text-[15px] font-bold text-pinnacle-navy outline-none transition-all focus:bg-transparent focus:border-pinnacle-yellow focus:pl-3 rounded-[4px] placeholder:text-pinnacle-navy/20"
          disabled={loading}
          required
        />
        <PasswordVisibilityToggle
          visible={visible}
          onToggle={(): void => setVisible((v) => !v)}
          targetId="login-password"
        />
      </div>
    </div>
  );
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
      <LoginUsernameField
        username={username}
        onUsernameChange={onUsernameChange}
        loading={loading}
      />
      <LoginPasswordField
        password={password}
        onPasswordChange={onPasswordChange}
        loading={loading}
      />
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

interface LoginFormBannersProps {
  readonly mfaJustActivated: boolean;
  readonly mfaChallengeExpired: boolean;
  readonly error: string | null;
}

/** Los 3 banners posibles del formulario (éxito MFA, expiración de reto, error) — extraídos para
 *  mantener `LoginForm` bajo Gate 2. */
function LoginFormBanners({
  mfaJustActivated,
  mfaChallengeExpired,
  error,
}: LoginFormBannersProps): React.JSX.Element {
  return (
    <>
      {mfaJustActivated && (
        <div
          data-testid="mfa-just-activated-banner"
          className="mb-6 p-4 bg-emerald-500/10 text-emerald-700 text-archon-md font-black rounded-[4px] border-l-4 border-emerald-500 animate-in slide-in-from-top duration-300"
        >
          MFA activado. Ingresa tu contraseña de nuevo para continuar.
        </div>
      )}

      {mfaChallengeExpired && (
        <div
          data-testid="mfa-challenge-expired-banner"
          className="mb-6 p-4 bg-amber-500/10 text-amber-700 text-archon-md font-black rounded-[4px] border-l-4 border-amber-500 animate-in slide-in-from-top duration-300"
        >
          El código de verificación expiró. Inicia sesión de nuevo.
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 text-red-600 text-archon-md font-black uppercase rounded-[4px] border-l-4 border-red-500 animate-in slide-in-from-top duration-300">
          {error}
        </div>
      )}
    </>
  );
}

/** Encabezado + banners + inputs + submit del formulario de acceso (FC163 F2B4 Sub-Batch 4B-2). */
function LoginForm({
  username,
  password,
  onUsernameChange,
  onPasswordChange,
  loading,
  error,
  onSubmit,
  mfaJustActivated,
  mfaChallengeExpired,
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

      <LoginFormBanners
        mfaJustActivated={mfaJustActivated}
        mfaChallengeExpired={mfaChallengeExpired}
        error={error}
      />

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
  readonly mfaChallenge: MfaChallengeState;
}

/** El contenido principal del panel es 1 de 3, mutuamente excluyentes — extraído a una función con
 *  if/else (no ternario anidado) para mantener `LoginPanel` legible y pasar `no-nested-ternary`. */
function renderLoginPanelMain(
  mfaChallenge: MfaChallengeState,
  mfaSetupToken: string | null,
  onMfaSetupComplete: () => void,
  formProps: Omit<LoginFormProps, 'mfaChallengeExpired'>
): React.JSX.Element {
  if (mfaChallenge.mfaToken) {
    return (
      <div className="w-full max-w-[440px]" data-testid="mfa-mandatory-challenge">
        <MfaChallengeStep
          code={mfaChallenge.code}
          onCodeChange={mfaChallenge.setCode}
          loading={mfaChallenge.loading}
          error={mfaChallenge.error}
          onSubmit={mfaChallenge.handleSubmit}
          useBackupCode={mfaChallenge.useBackupCode}
          onToggleBackupCode={mfaChallenge.toggleBackupCode}
          secondsRemaining={mfaChallenge.secondsRemaining}
          onBack={mfaChallenge.reset}
        />
      </div>
    );
  }
  if (mfaSetupToken) {
    return (
      <div className="w-full max-w-[440px]" data-testid="mfa-mandatory-setup">
        <MfaEnrollmentWizard token={mfaSetupToken} onComplete={onMfaSetupComplete} />
      </div>
    );
  }
  return <LoginForm {...formProps} mfaChallengeExpired={mfaChallenge.justExpired} />;
}

/** Panel derecho: logo móvil, uno de 3 contenidos exclusivos entre sí, pie de página (FC163 F2B4
 *  Sub-Batch 4B-2; FC185 F3/F4 — `mfaChallenge.mfaToken` gana sobre `mfaSetupToken`, que gana
 *  sobre el formulario normal: un usuario nunca ve dos de los tres a la vez). */
export default function LoginPanel(props: LoginPanelProps): React.JSX.Element {
  const { mfaSetupToken, onMfaSetupComplete, mfaChallenge, ...formProps } = props;
  return (
    <section className="relative z-30 flex flex-col items-center justify-center col-span-1 min-h-screen bg-white shadow-[-20px_0_50px_rgba(0,0,0,0.2)]">
      <div className="w-full h-full flex flex-col animate-in fade-in zoom-in duration-1000 delay-300">
        <header className="h-[10vh] md:hidden bg-pinnacle-navy flex items-center px-6">
          <PiicLogo />
        </header>

        <main className="flex-1 flex flex-col justify-center px-6 md:px-16">
          {renderLoginPanelMain(mfaChallenge, mfaSetupToken, onMfaSetupComplete, formProps)}
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
