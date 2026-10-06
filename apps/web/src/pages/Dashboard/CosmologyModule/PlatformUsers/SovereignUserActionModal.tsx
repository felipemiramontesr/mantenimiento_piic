import React, { useState } from 'react';
import { AlertTriangle, Globe } from 'lucide-react';
import ArchonModal from '../../../../components/UI/ArchonModal';
import ArchonField from '../../../../components/ArchonField';
import {
  deletePlatformUser,
  describeSovereignActionError,
  PlatformUser,
  resetPlatformUserMfa,
} from './platformUsersApi';

/**
 * FC204 F4 (Escenario 5) — confirmación nominal de las acciones soberanas sobre un usuario: Ω escribe
 * el nombre exacto del Universo del usuario; la baja además pide un motivo (≥ 5 caracteres). El
 * servidor vuelve a validar el nombre (FC204 F3): este chequeo solo evita enviar algo que no pasará.
 */

export type SovereignAction = 'reset-mfa' | 'delete';

export interface SovereignActionTarget {
  readonly user: PlatformUser;
  readonly action: SovereignAction;
}

const REASON_MIN = 5;

const COPY: Record<SovereignAction, { title: string; warning: string; confirm: string }> = {
  'reset-mfa': {
    title: 'Restablecer 2FA',
    warning: 'El usuario deberá configurar su 2FA de nuevo en su próximo inicio de sesión.',
    confirm: 'Confirmar restablecimiento',
  },
  delete: {
    title: 'Eliminar usuario',
    warning: 'Esta acción es irreversible: el usuario y sus accesos se eliminan del sistema.',
    confirm: 'Confirmar eliminación',
  },
};

/** El request de la acción, sin estado de componente. */
function runAction(
  target: SovereignActionTarget,
  universeName: string,
  reason: string
): Promise<void> {
  if (target.action === 'reset-mfa') return resetPlatformUserMfa(target.user.id, universeName);
  return deletePlatformUser(target.user.id, universeName, reason.trim());
}

interface ActionForm {
  typedName: string;
  setTypedName: (v: string) => void;
  reason: string;
  setReason: (v: string) => void;
  error: string | null;
  submitting: boolean;
  canSubmit: boolean;
  submit: () => void;
}

/** Estado del formulario: nombre escrito, motivo, envío y error del servidor. */
function useActionForm(target: SovereignActionTarget, onDone: () => void): ActionForm {
  const [typedName, setTypedName] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const nameMatches = typedName.trim() === target.user.tenantName;
  const reasonOk = target.action !== 'delete' || reason.trim().length >= REASON_MIN;

  const submit = (): void => {
    setSubmitting(true);
    setError(null);
    runAction(target, typedName.trim(), reason)
      .then(onDone)
      .catch((err) => setError(describeSovereignActionError(err)))
      .finally(() => setSubmitting(false));
  };

  return {
    typedName,
    setTypedName,
    reason,
    setReason,
    error,
    submitting,
    canSubmit: nameMatches && reasonOk && !submitting,
    submit,
  };
}

/** Nombre del Universo y, para la baja, el motivo. */
function ActionFields({
  form,
  target,
}: {
  readonly form: ActionForm;
  readonly target: SovereignActionTarget;
}): React.JSX.Element {
  return (
    <>
      <ArchonField label="Nombre del Universo" icon={Globe}>
        <input
          value={form.typedName}
          onChange={(e): void => form.setTypedName(e.target.value)}
          data-testid="sovereign-action-universe-name"
          className="archon-input"
        />
      </ArchonField>
      {target.action === 'delete' && (
        <ArchonField label={`Motivo (mínimo ${REASON_MIN} caracteres)`} icon={AlertTriangle}>
          <textarea
            value={form.reason}
            onChange={(e): void => form.setReason(e.target.value)}
            data-testid="sovereign-action-reason"
            className="w-full bg-[#0f2a44]/5 border-0 border-b-2 border-[#0f2a44]/10 focus:border-b-[#f2b705] focus:bg-white rounded-[4px] p-3 text-[#0f2a44] text-sm outline-none transition-all min-h-[80px] resize-none"
          />
        </ArchonField>
      )}
      {form.error && (
        <p
          role="alert"
          data-testid="sovereign-action-error"
          className="text-red-500 text-sm font-medium"
        >
          {form.error}
        </p>
      )}
    </>
  );
}

interface ContentProps {
  readonly target: SovereignActionTarget;
  readonly onClose: () => void;
  readonly onDone: () => void;
}

/** Cuerpo del modal — montado solo con un objetivo no nulo (patrón de `DestroyUniverseModal`). */
function SovereignUserActionContent({ target, onClose, onDone }: ContentProps): React.JSX.Element {
  const form = useActionForm(target, onDone);
  const copy = COPY[target.action];
  return (
    <ArchonModal isOpen onClose={onClose} maxWidth="max-w-lg" ariaLabel={copy.title}>
      <div className="p-8 space-y-4" data-testid="sovereign-action-modal">
        <h3 className="text-xl font-bold text-red-600">{copy.title}</h3>
        <p className="text-[#0f2a44]/60 text-sm">{copy.warning}</p>
        <p className="text-[#0f2a44]/60 text-sm">
          Usuario:{' '}
          <strong className="text-[#0f2a44]" data-testid="sovereign-action-username">
            {target.user.username}
          </strong>
        </p>
        <p className="text-[#0f2a44]/60 text-sm">
          Escribe{' '}
          <strong className="text-[#0f2a44]" data-testid="sovereign-action-expected-name">
            {target.user.tenantName}
          </strong>{' '}
          para confirmar.
        </p>
        <ActionFields form={form} target={target} />
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={onClose}
            className="btn-sentinel-red text-sm w-full py-2.5"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={form.submit}
            disabled={!form.canSubmit}
            data-testid="sovereign-action-submit"
            className="btn-sentinel-red text-sm disabled:opacity-50 w-full py-2.5"
          >
            {form.submitting ? 'Procesando…' : copy.confirm}
          </button>
        </div>
      </div>
    </ArchonModal>
  );
}

/** Modal de acción soberana — `target: null` ⇒ cerrado (no monta nada). */
export default function SovereignUserActionModal({
  target,
  onClose,
  onDone,
}: {
  readonly target: SovereignActionTarget | null;
  readonly onClose: () => void;
  readonly onDone: () => void;
}): React.JSX.Element {
  if (!target) return <></>;
  return (
    <SovereignUserActionContent
      key={`${target.action}-${target.user.id}`}
      target={target}
      onClose={onClose}
      onDone={onDone}
    />
  );
}
