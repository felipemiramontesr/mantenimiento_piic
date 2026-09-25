import React from 'react';
import { Smartphone, Mail } from 'lucide-react';
import { MfaMethod } from '../../../api/mfa';

/**
 * FC195 F3 — selector de método, solo para quien puede elegir (Arc). Ω y MU nunca lo ven: el
 * asistente entra directo a TOTP (D-Ω6). Se dice sin rodeos que la app es más segura
 * (Invariante 2: el correo no prueba posesión de un dispositivo).
 */

interface MethodOptionProps {
  readonly method: MfaMethod;
  readonly title: string;
  readonly description: string;
  readonly icon: React.ReactNode;
  readonly onChoose: (method: MfaMethod) => void;
}

function MethodOption({
  method,
  title,
  description,
  icon,
  onChoose,
}: MethodOptionProps): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={(): void => onChoose(method)}
      data-testid={`mfa-method-${method}`}
      className="w-full flex items-start gap-4 p-4 text-left rounded-[4px] border border-pinnacle-navy/10 hover:border-pinnacle-yellow bg-pinnacle-navy/[0.02]"
    >
      <span className="text-pinnacle-navy mt-1">{icon}</span>
      <span>
        <span className="block font-black text-pinnacle-navy">{title}</span>
        <span className="block text-sm text-pinnacle-navy/60 mt-1">{description}</span>
      </span>
    </button>
  );
}

interface MfaMethodChoiceStepProps {
  readonly onChoose: (method: MfaMethod) => void;
}

/** Paso 0 del asistente cuando hay más de un método permitido. */
export default function MfaMethodChoiceStep({
  onChoose,
}: MfaMethodChoiceStepProps): React.JSX.Element {
  return (
    <div className="space-y-6" data-testid="mfa-method-choice">
      <div>
        <h3 className="text-pinnacle-navy font-display font-black text-2xl tracking-tight">
          Elige tu verificación en dos pasos
        </h3>
        <p className="text-pinnacle-navy/60 text-sm mt-1">
          Es obligatoria para entrar a Archon. Puedes cambiar a la app más adelante.
        </p>
      </div>
      <MethodOption
        method="totp"
        title="App autenticadora (recomendada)"
        description="Google Authenticator, Microsoft Authenticator o Authy. La opción más segura."
        icon={<Smartphone size={22} />}
        onChoose={onChoose}
      />
      <MethodOption
        method="email"
        title="Código por correo electrónico"
        description="Te enviamos un código de 8 caracteres cada vez que inicias sesión."
        icon={<Mail size={22} />}
        onChoose={onChoose}
      />
    </div>
  );
}
