import React, { useState } from 'react';
import { Globe, Link2, UserCog } from 'lucide-react';
import ArchonModal from '../../../../components/UI/ArchonModal';
import ArchonField from '../../../../components/ArchonField';
import ArchonSelect from '../../../../components/ArchonSelect';
import type { UniverseRow } from '../CosmologyForms';
import {
  describeSovereignActionError,
  linkPlatformUserToUniverse,
  PlatformUser,
} from './platformUsersApi';

/**
 * FC206 F1 (T1 · Escenarios 1–4) — Ω vincula un usuario itinerante a un Universo existente: elige el
 * Universo, el rol (ARC por defecto; MU solo si el Universo aún no tiene MU) y escribe el nombre exacto
 * del Universo. El servidor repite cada validación (puertas del candidato, nombre y ancla MU).
 */

type LinkRole = 'ARC' | 'MU';

const ROLE_OPTIONS = [
  { value: 'ARC', label: 'Arconauta (ARC)' },
  { value: 'MU', label: 'Master of Universe (MU)' },
];

interface LinkForm {
  universe: UniverseRow | null;
  setUniverseId: (id: string) => void;
  role: LinkRole;
  setRole: (role: LinkRole) => void;
  typedName: string;
  setTypedName: (v: string) => void;
  error: string | null;
  submitting: boolean;
  canSubmit: boolean;
  submit: () => void;
}

/** Estado del formulario; con un Universo que ya tiene MU, el rol queda fijo en ARC. */
function useLinkForm(user: PlatformUser, universes: UniverseRow[], onDone: () => void): LinkForm {
  const [universeId, setUniverseId] = useState('');
  const [chosenRole, setChosenRole] = useState<LinkRole>('ARC');
  const [typedName, setTypedName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const universe = universes.find((u) => String(u.id) === universeId) ?? null;
  const role: LinkRole = universe?.hasMu ? 'ARC' : chosenRole;
  // Universo listo para enviar: elegido, nombre exacto y sin envío en curso (si no, null).
  const ready =
    universe !== null && typedName.trim() === universe.label && !submitting ? universe : null;

  /** También lo dispara Enter en el formulario: sin `ready` no envía nada. */
  const submit = (): void => {
    if (ready === null) return;
    setSubmitting(true);
    setError(null);
    linkPlatformUserToUniverse(user.id, ready.id, role, typedName.trim())
      .then(onDone)
      .catch((err) => setError(describeSovereignActionError(err)))
      .finally(() => setSubmitting(false));
  };

  return {
    universe,
    setUniverseId,
    role,
    setRole: setChosenRole,
    typedName,
    setTypedName,
    error,
    submitting,
    canSubmit: ready !== null,
    submit,
  };
}

/** Universo, rol y nombre de confirmación. */
function LinkFields({
  form,
  universes,
}: {
  readonly form: LinkForm;
  readonly universes: UniverseRow[];
}): React.JSX.Element {
  return (
    <>
      <ArchonField label="Universo destino" icon={Globe}>
        <ArchonSelect
          options={universes.map((u) => ({ value: String(u.id), label: u.label }))}
          value={form.universe ? String(form.universe.id) : ''}
          onChange={form.setUniverseId}
          placeholder="Selecciona un Universo"
        />
      </ArchonField>
      <ArchonField label="Rol" icon={UserCog}>
        {form.universe?.hasMu ? (
          <p className="text-sm text-[#0f2a44]/70" data-testid="link-universe-role-fixed">
            Arconauta (ARC): este Universo ya tiene Master of Universe.
          </p>
        ) : (
          <ArchonSelect
            options={ROLE_OPTIONS}
            value={form.role}
            onChange={(value): void => form.setRole(value as LinkRole)}
          />
        )}
      </ArchonField>
      <ArchonField label="Escribe el nombre exacto del Universo" icon={Link2}>
        <input
          value={form.typedName}
          onChange={(e): void => form.setTypedName(e.target.value)}
          data-testid="link-universe-name"
          className="archon-input"
        />
      </ArchonField>
      {form.error && (
        <p
          role="alert"
          data-testid="link-universe-error"
          className="text-red-500 text-sm font-medium"
        >
          {form.error}
        </p>
      )}
    </>
  );
}

interface ContentProps {
  readonly user: PlatformUser;
  readonly universes: UniverseRow[];
  readonly onClose: () => void;
  readonly onDone: () => void;
}

/** Cuerpo del modal — montado solo con un usuario no nulo. */
function LinkUniverseContent({
  user,
  universes,
  onClose,
  onDone,
}: ContentProps): React.JSX.Element {
  const form = useLinkForm(user, universes, onDone);
  return (
    <ArchonModal isOpen onClose={onClose} maxWidth="max-w-lg" ariaLabel="Vincular a Universo">
      <form
        className="p-8 space-y-4"
        data-testid="link-universe-modal"
        onSubmit={(e): void => {
          e.preventDefault();
          form.submit();
        }}
      >
        <h3 className="text-xl font-bold text-[#0f2a44]">Vincular a Universo</h3>
        <p className="text-[#0f2a44]/60 text-sm">
          Usuario:{' '}
          <strong className="text-[#0f2a44]" data-testid="link-universe-username">
            {user.username}
          </strong>
        </p>
        <LinkFields form={form} universes={universes} />
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-bold text-[#0f2a44]/60 hover:text-[#0f2a44]"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!form.canSubmit}
            data-testid="link-universe-submit"
            className="btn-sentinel-emerald text-sm disabled:opacity-50 w-full py-2.5"
          >
            {form.submitting ? 'Vinculando…' : 'Vincular'}
          </button>
        </div>
      </form>
    </ArchonModal>
  );
}

/** Modal de vinculación — `user: null` ⇒ cerrado (no monta nada). */
export default function LinkUniverseModal({
  user,
  universes,
  onClose,
  onDone,
}: {
  readonly user: PlatformUser | null;
  readonly universes: UniverseRow[];
  readonly onClose: () => void;
  readonly onDone: () => void;
}): React.JSX.Element {
  if (!user) return <></>;
  return (
    <LinkUniverseContent
      key={user.id}
      user={user}
      universes={universes}
      onClose={onClose}
      onDone={onDone}
    />
  );
}
