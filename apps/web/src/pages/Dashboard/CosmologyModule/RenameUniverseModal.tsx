import React, { useState } from 'react';
import { Globe, Pencil } from 'lucide-react';
import api from '../../../api/client';
import ArchonModal from '../../../components/UI/ArchonModal';
import ArchonField from '../../../components/ArchonField';
import type { UniverseRow } from './CosmologyForms';
import {
  UNIVERSE_LABEL_MAX,
  describeRenameError,
  normalizeUniverseLabel,
  validateUniverseLabel,
} from './universeLabel';

/**
 * FC192 — Renombrar Universo (solo Ω: el módulo de Cosmología ya se niega a no-Ω). `PATCH
 * /cosmology/universes/:id/label`. Validación en vivo (3–100 caracteres normalizados) y mensaje
 * claro si el servidor responde 409 (nombre ya usado). El `id` y el `code` del universo no cambian.
 */

interface RenameUniverseModalProps {
  readonly universe: UniverseRow | null;
  readonly onClose: () => void;
  readonly onRenamed: (universeId: number, label: string) => void;
}

/** El `PATCH` en crudo: devuelve el nombre ya normalizado que guardó el servidor. */
async function submitRename(universeId: number, label: string): Promise<string> {
  const response = await api.patch<{ success: boolean; universe: { label: string } }>(
    `/cosmology/universes/${universeId}/label`,
    { label }
  );
  return response.data.universe.label;
}

interface RenameForm {
  value: string;
  setValue: (v: string) => void;
  normalizedLength: number;
  message: string | null;
  canSubmit: boolean;
  submitting: boolean;
  submit: () => void;
}

/** Estado del formulario: valor, validación en vivo, envío y el error del servidor. */
function useRenameForm(
  universe: UniverseRow,
  onRenamed: (universeId: number, label: string) => void
): RenameForm {
  const [value, setValue] = useState(universe.label);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const normalized = normalizeUniverseLabel(value);
  const validation = validateUniverseLabel(normalized, universe.label);
  const dirty = value !== universe.label;

  const submit = (): void => {
    setSubmitting(true);
    setServerError(null);
    submitRename(universe.id, normalized)
      .then((savedLabel) => onRenamed(universe.id, savedLabel))
      .catch((err) => setServerError(describeRenameError(err)))
      .finally(() => setSubmitting(false));
  };

  return {
    value,
    setValue: (v: string): void => {
      setValue(v);
      setServerError(null);
    },
    normalizedLength: normalized.length,
    message: serverError ?? (dirty ? validation : null),
    canSubmit: validation === null && !submitting,
    submitting,
    submit,
  };
}

/** Campo del nombre + contador del nombre normalizado + mensaje (validación en vivo o error del servidor). */
function RenameFields({ form }: { readonly form: RenameForm }): React.JSX.Element {
  return (
    <>
      <ArchonField label="Nombre del Universo" icon={Globe}>
        <input
          value={form.value}
          onChange={(e): void => form.setValue(e.target.value)}
          data-testid="rename-universe-input"
          className="archon-input"
        />
      </ArchonField>
      <p className="text-xs text-[#0f2a44]/50 text-right" data-testid="rename-universe-counter">
        {form.normalizedLength}/{UNIVERSE_LABEL_MAX}
      </p>
      {form.message && (
        <p
          role="alert"
          data-testid="rename-universe-error"
          className="text-red-500 text-sm font-medium"
        >
          {form.message}
        </p>
      )}
    </>
  );
}

interface RenameActionsProps {
  readonly canSubmit: boolean;
  readonly submitting: boolean;
  readonly onClose: () => void;
}

/** Par Cancelar / Guardar — el envío lo dispara el `submit` del formulario. */
function RenameActions({ canSubmit, submitting, onClose }: RenameActionsProps): React.JSX.Element {
  return (
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
        disabled={!canSubmit}
        data-testid="rename-universe-submit"
        className="btn-sentinel-emerald text-sm disabled:opacity-50"
      >
        {submitting ? 'Guardando…' : 'Guardar nombre'}
      </button>
    </div>
  );
}

interface RenameUniverseModalContentProps {
  readonly universe: UniverseRow;
  readonly onClose: () => void;
  readonly onRenamed: (universeId: number, label: string) => void;
}

/** Cuerpo del modal — montado solo con un universo no nulo (mismo patrón que `DestroyUniverseModal`). */
function RenameUniverseModalContent({
  universe,
  onClose,
  onRenamed,
}: RenameUniverseModalContentProps): React.JSX.Element {
  const form = useRenameForm(universe, onRenamed);

  return (
    <ArchonModal isOpen onClose={onClose} maxWidth="max-w-lg" ariaLabel="Renombrar Universo">
      <form
        className="p-8 space-y-4"
        data-testid="rename-universe-form"
        onSubmit={(e): void => {
          e.preventDefault();
          if (form.canSubmit) form.submit();
        }}
      >
        <h3 className="text-xl font-bold text-[#0f2a44] flex items-center gap-2">
          <Pencil size={18} /> Renombrar Universo
        </h3>
        <p className="text-[#0f2a44]/60 text-sm">
          El nombre debe ser único. El identificador del universo no cambia.
        </p>
        <RenameFields form={form} />
        <RenameActions canSubmit={form.canSubmit} submitting={form.submitting} onClose={onClose} />
      </form>
    </ArchonModal>
  );
}

/** Modal de renombrado — `universe: null` ⇒ cerrado (no monta nada). */
export default function RenameUniverseModal({
  universe,
  onClose,
  onRenamed,
}: RenameUniverseModalProps): React.JSX.Element {
  if (!universe) return <></>;
  return (
    <RenameUniverseModalContent
      key={universe.id}
      universe={universe}
      onClose={onClose}
      onRenamed={onRenamed}
    />
  );
}
