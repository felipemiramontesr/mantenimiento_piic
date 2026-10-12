import React, { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { describeArcsialError, HANDLE_PATTERN, normalizeHandle } from './arcsialApi';
import {
  ActorView,
  BIO_MAX,
  fetchActor,
  isHttpsUrl,
  updateActorHandle,
  updateActorProfile,
} from './arcsialCoreApi';

/**
 * FC210 F3 — formulario unificado del perfil de Arcsial: nombre para mostrar, biografía, avatar (URL
 * https), aparecer o no en las búsquedas por nombre y el @handle. La presentación va a
 * `PATCH /social/actors/profile`; el handle, solo si cambió, a `PATCH /social/actors/handle`.
 */

interface ProfileDraft {
  readonly handle: string;
  readonly displayName: string;
  readonly bio: string;
  readonly avatarUrl: string;
  readonly isSearchable: boolean;
}

const AVATAR_ERROR = 'El avatar debe ser una dirección https.';
const NAME_ERROR = 'El nombre para mostrar no puede quedar vacío.';
const LABEL = 'space-y-1 text-xs font-bold uppercase tracking-widest text-[#0f2a44]/60';

/** Código de error con la forma que entiende `describeArcsialError`. */
function coded(code: string): unknown {
  return { response: { data: { code } } };
}

/** Primer motivo que impide guardar, o null. */
function validationError(draft: ProfileDraft): string | null {
  if (!HANDLE_PATTERN.test(normalizeHandle(draft.handle))) {
    return describeArcsialError(coded('INVALID_HANDLE_FORMAT'));
  }
  if (draft.displayName.trim() === '') return NAME_ERROR;
  const avatar = draft.avatarUrl.trim();
  return avatar !== '' && !isHttpsUrl(avatar) ? AVATAR_ERROR : null;
}

/** Guarda la presentación y, si cambió, el handle. */
async function saveProfile(draft: ProfileDraft, currentHandle: string): Promise<void> {
  await updateActorProfile({
    displayName: draft.displayName.trim(),
    bio: draft.bio.trim() || null,
    avatarUrl: draft.avatarUrl.trim() || null,
    isSearchable: draft.isSearchable,
  });
  const handle = normalizeHandle(draft.handle);
  if (handle !== currentHandle) await updateActorHandle(handle);
}

/** Del actor propio al borrador del formulario. */
function toDraft(actor: ActorView): ProfileDraft {
  return {
    handle: actor.handle,
    displayName: actor.displayName,
    bio: actor.bio ?? '',
    avatarUrl: actor.avatarUrl ?? '',
    isSearchable: actor.isSearchable ?? true,
  };
}

interface SettingsState {
  readonly draft: ProfileDraft | null;
  readonly error: string | null;
  readonly saved: boolean;
  readonly change: (next: ProfileDraft) => void;
  readonly save: (draft: ProfileDraft) => void;
}

/** Carga el actor propio en el borrador y lo guarda; al guardar avisa con `onSaved`. */
function useProfileSettings(ownHandle: string, onSaved: () => void): SettingsState {
  const [draft, setDraft] = useState<ProfileDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const fail = (err: unknown): void => setError(describeArcsialError(err));
  useEffect(() => {
    fetchActor(ownHandle)
      .then((actor) => setDraft(toDraft(actor)))
      .catch(fail);
  }, [ownHandle]);
  const change = (next: ProfileDraft): void => {
    setSaved(false);
    setDraft(next);
  };
  const confirm = (): void => {
    setSaved(true);
    onSaved();
  };
  const save = (current: ProfileDraft): void => {
    const invalid = validationError(current);
    setError(invalid);
    if (!invalid) saveProfile(current, ownHandle).then(confirm).catch(fail);
  };
  return { draft, error, saved, change, save };
}

interface FieldsProps {
  readonly draft: ProfileDraft;
  readonly change: (next: ProfileDraft) => void;
}

/** Handle y nombre para mostrar. */
function IdentityFields({ draft, change }: FieldsProps): React.JSX.Element {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className={LABEL}>
        <span className="block">Handle</span>
        <input
          value={draft.handle}
          onChange={(e): void => change({ ...draft, handle: e.target.value })}
          data-testid="settings-handle"
          className="archon-input normal-case"
        />
      </label>
      <label className={LABEL}>
        <span className="block">Nombre para mostrar</span>
        <input
          value={draft.displayName}
          onChange={(e): void => change({ ...draft, displayName: e.target.value })}
          maxLength={100}
          data-testid="settings-display-name"
          className="archon-input normal-case"
        />
      </label>
    </div>
  );
}

/** Biografía y avatar. */
function PresentationFields({ draft, change }: FieldsProps): React.JSX.Element {
  return (
    <>
      <label className={`block ${LABEL}`}>
        <span className="block">Biografía</span>
        <textarea
          value={draft.bio}
          onChange={(e): void => change({ ...draft, bio: e.target.value })}
          maxLength={BIO_MAX}
          rows={3}
          data-testid="settings-bio"
          className="archon-input w-full resize-none normal-case"
        />
      </label>
      <label className={`block ${LABEL}`}>
        <span className="block">Avatar (dirección https)</span>
        <input
          value={draft.avatarUrl}
          onChange={(e): void => change({ ...draft, avatarUrl: e.target.value })}
          placeholder="https://…"
          data-testid="settings-avatar"
          className="archon-input normal-case"
        />
      </label>
    </>
  );
}

/** Aparecer o no en las búsquedas por nombre. */
function SearchableField({ draft, change }: FieldsProps): React.JSX.Element {
  return (
    <label className="flex items-center gap-2 text-sm text-[#0f2a44]">
      <input
        type="checkbox"
        checked={draft.isSearchable}
        onChange={(e): void => change({ ...draft, isSearchable: e.target.checked })}
        data-testid="settings-searchable"
      />
      <span>Aparecer en las búsquedas por nombre</span>
    </label>
  );
}

/** Los campos del formulario, una vez cargado el actor propio. */
function SettingsFields(props: FieldsProps): React.JSX.Element {
  return (
    <>
      <IdentityFields {...props} />
      <PresentationFields {...props} />
      <SearchableField {...props} />
    </>
  );
}

/** Motivo del rechazo o confirmación del guardado. */
function SettingsStatus({ state }: { readonly state: SettingsState }): React.JSX.Element {
  return (
    <>
      {state.error && (
        <p role="alert" data-testid="settings-error" className="text-sm font-medium text-red-500">
          {state.error}
        </p>
      )}
      {state.saved && (
        <output data-testid="settings-saved" className="block text-sm font-medium text-emerald-600">
          Perfil guardado.
        </output>
      )}
    </>
  );
}

interface ProfileSettingsFormProps {
  /** Handle actual del actor de la sesión. */
  readonly ownHandle: string;
  readonly onSaved: () => void;
}

/** Formulario del perfil de Arcsial de la sesión. */
export default function ProfileSettingsForm({
  ownHandle,
  onSaved,
}: ProfileSettingsFormProps): React.JSX.Element {
  const state = useProfileSettings(ownHandle, onSaved);
  const { draft, change } = state;
  const submit = (event: React.FormEvent): void => {
    event.preventDefault();
    if (draft) state.save(draft);
  };
  return (
    <form
      onSubmit={submit}
      data-testid="profile-settings"
      className="card-archon-sovereign space-y-4 bg-white p-6 [--card-accent:#0f2a44]"
    >
      {draft && <SettingsFields draft={draft} change={change} />}
      <SettingsStatus state={state} />
      <button
        type="submit"
        disabled={!draft}
        data-testid="settings-save"
        className="btn-sentinel-emerald text-xs disabled:opacity-50"
      >
        <Save size={12} /> Guardar perfil
      </button>
    </form>
  );
}
