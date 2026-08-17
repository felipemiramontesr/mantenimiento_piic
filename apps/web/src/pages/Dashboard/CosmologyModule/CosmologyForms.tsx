import React, { useEffect, useState } from 'react';
import { Globe, Plus, AlertTriangle } from 'lucide-react';
import api from '../../../api/client';
import ArchonModal from '../../../components/UI/ArchonModal';

/**
 * FC161 F1 — extracted from `CosmologyModule.tsx` (Gate 1 max-lines:400):
 * the creation form + destroy confirmation modal, same behavior verbatim.
 */

export interface UniverseRow {
  id: number;
  label: string;
  universeTypeCode: string;
  activeSuperclusters: number;
  activeClusters: number;
}

// Cond.R-161 pregunta 1 (RESUELTO, `189_AN`/`190_AN`) — catálogos estables,
// selects estáticos en vez de un endpoint de catálogo nuevo.
const UNIVERSE_TYPE_OPTIONS = [{ value: 'FMS', label: 'Fleet Management System (FMS)' }];
const OWNER_TYPE_OPTIONS = [
  { value: 'FLOTILLA', label: 'Propietario de Flotilla' },
  { value: 'PRIVATE', label: 'Propietario Privado' },
  { value: 'CENTER', label: 'Centro Especializado' },
  { value: 'ARCHONAUT', label: 'Archonaut' },
];

// Cond.R-161-R3 — mapeo de buckets de zero-state (FC160 F2) a etiquetas es-MX.
const BUCKET_LABELS: Record<string, string> = {
  fleet_units: 'Unidades de flotilla',
  memberships: 'Membresías de usuario',
  role_assignments: 'Asignaciones de rol',
  custom_roles: 'Roles personalizados del Universo',
  areas: 'Áreas',
  service_links: 'Vínculos de servicio',
  lattices: 'Lattices (canales entre Universos)',
  social_posts: 'Publicaciones sociales',
  social_reviews: 'Reseñas',
};

interface CreateUniverseFormProps {
  onCreated: () => void;
}

const FIELD_LABEL_CLASS =
  'text-archon-xs font-bold text-pinnacle-navy/60 uppercase tracking-widest';
const FIELD_INPUT_CLASS =
  'mt-1 w-full border border-slate-300 rounded-[4px] px-3 py-2 text-sm font-normal normal-case';

interface SelectFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  testId: string;
  options: Array<{ value: string; label: string }>;
}

/** One labeled `<select>` — reused for `universeTypeCode`/`ownerTypeCode`. */
function SelectField({
  label,
  value,
  onChange,
  testId,
  options,
}: SelectFieldProps): React.JSX.Element {
  return (
    <label className={FIELD_LABEL_CLASS}>
      {label}
      <select
        value={value}
        onChange={(e): void => onChange(e.target.value)}
        data-testid={testId}
        className={FIELD_INPUT_CLASS}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

interface CreateUniverseFieldsProps {
  label: string;
  onLabel: (v: string) => void;
  universeTypeCode: string;
  onUniverseTypeCode: (v: string) => void;
  ownerTypeCode: string;
  onOwnerTypeCode: (v: string) => void;
}

/** The 3-field grid (label + 2 static selects) — extracted to keep `CreateUniverseForm` under budget. */
function CreateUniverseFields({
  label,
  onLabel,
  universeTypeCode,
  onUniverseTypeCode,
  ownerTypeCode,
  onOwnerTypeCode,
}: CreateUniverseFieldsProps): React.JSX.Element {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <label className={FIELD_LABEL_CLASS}>
        Nombre
        <input
          required
          value={label}
          onChange={(e): void => onLabel(e.target.value)}
          data-testid="create-universe-label"
          className={FIELD_INPUT_CLASS}
        />
      </label>
      <SelectField
        label="Tipo de Universo"
        value={universeTypeCode}
        onChange={onUniverseTypeCode}
        testId="create-universe-type"
        options={UNIVERSE_TYPE_OPTIONS}
      />
      <SelectField
        label="Tipo de Owner"
        value={ownerTypeCode}
        onChange={onOwnerTypeCode}
        testId="create-universe-owner-type"
        options={OWNER_TYPE_OPTIONS}
      />
    </div>
  );
}

/** Header block for `CreateUniverseForm` — extracted to keep it under budget. */
function CreateUniverseHeader(): React.JSX.Element {
  return (
    <div className="flex items-center gap-3 pb-2 border-b border-slate-200">
      <div className="w-8 h-8 rounded-[4px] bg-pinnacle-navy/10 flex items-center justify-center">
        <Globe size={16} className="text-pinnacle-navy" />
      </div>
      <div>
        <h2 className="text-archon-lg font-black text-pinnacle-navy uppercase tracking-widest">
          Crear Universo
        </h2>
        <p className="text-archon-base text-pinnacle-navy/50 font-medium">
          Archon — instancia un nuevo Universo (§24.5 AUTORIDAD_Ω)
        </p>
      </div>
    </div>
  );
}

/** Formulario de alta — T5 `POST /v1/cosmology/universes`. */
export function CreateUniverseForm({ onCreated }: CreateUniverseFormProps): React.JSX.Element {
  const [label, setLabel] = useState('');
  const [universeTypeCode, setUniverseTypeCode] = useState(UNIVERSE_TYPE_OPTIONS[0].value);
  const [ownerTypeCode, setOwnerTypeCode] = useState(OWNER_TYPE_OPTIONS[0].value);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    api
      .post('/cosmology/universes', { label, universeTypeCode, ownerTypeCode })
      .then(() => {
        setLabel('');
        onCreated();
      })
      .catch(() => setError('No se pudo crear el Universo. Intenta de nuevo.'))
      .finally(() => setSubmitting(false));
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="card-archon-sovereign space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700"
      data-testid="create-universe-form"
    >
      <CreateUniverseHeader />

      <CreateUniverseFields
        label={label}
        onLabel={setLabel}
        universeTypeCode={universeTypeCode}
        onUniverseTypeCode={setUniverseTypeCode}
        ownerTypeCode={ownerTypeCode}
        onOwnerTypeCode={setOwnerTypeCode}
      />

      {error && <p className="text-red-500 text-sm font-medium">{error}</p>}

      <button
        type="submit"
        disabled={submitting || label.trim().length === 0}
        data-testid="create-universe-submit"
        className="btn-sentinel-emerald text-sm disabled:opacity-50 flex items-center gap-2"
      >
        <Plus size={14} />
        {submitting ? 'Creando…' : 'Crear Universo'}
      </button>
    </form>
  );
}

interface DestroyUniverseModalProps {
  universe: UniverseRow | null;
  onClose: () => void;
  onDestroyed: () => void;
}

/** Extrae `details` de un 409 UNIVERSE_NOT_ZERO_STATE, o null si no aplica. */
function extractZeroStateDetails(err: unknown): Record<string, number> | null {
  const response = (err as { response?: { data?: { details?: Record<string, number> } } })
    ?.response;
  return response?.data?.details ?? null;
}

/** Cond.R-161-R3 — readable es-MX list of which zero-state buckets are blocking the DESTROY. */
function ZeroStateBlockersList({
  blockers,
}: {
  blockers: Record<string, number> | null;
}): React.JSX.Element | null {
  if (!blockers) return null;
  return (
    <div
      data-testid="destroy-universe-blockers"
      className="bg-red-500/10 border border-red-500/40 rounded-lg p-4 space-y-1"
    >
      <p className="text-red-400 text-sm font-bold flex items-center gap-2">
        <AlertTriangle size={14} /> El Universo no está vacío:
      </p>
      <ul className="text-red-300 text-sm list-disc list-inside">
        {Object.entries(blockers).map(([bucket, count]) => (
          <li key={bucket}>
            {BUCKET_LABELS[bucket] ?? bucket}: {count}
          </li>
        ))}
      </ul>
    </div>
  );
}

interface DestroyUniverseFieldsProps {
  typedLabel: string;
  onTypedLabel: (v: string) => void;
  expectedLabel: string;
  reason: string;
  onReason: (v: string) => void;
}

/** Type-to-confirm label input + optional reason textarea (Cond.R-161-R4). */
function DestroyUniverseFields({
  typedLabel,
  onTypedLabel,
  expectedLabel,
  reason,
  onReason,
}: DestroyUniverseFieldsProps): React.JSX.Element {
  return (
    <>
      <input
        value={typedLabel}
        onChange={(e): void => onTypedLabel(e.target.value)}
        placeholder={expectedLabel}
        data-testid="destroy-universe-confirm-label"
        className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white text-sm"
      />
      <textarea
        value={reason}
        onChange={(e): void => onReason(e.target.value)}
        placeholder="Razón (opcional)"
        data-testid="destroy-universe-reason"
        className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white text-sm min-h-[80px] resize-none"
      />
    </>
  );
}

/** T6 `DELETE /v1/cosmology/universes/:id` — the raw request, no component state. */
async function submitDestroy(universeId: number, reason: string): Promise<void> {
  const payload = reason.trim().length >= 5 ? { reason: reason.trim() } : undefined;
  await api.delete(`/cosmology/universes/${universeId}`, { data: payload });
}

interface DestroyUniverseActionsProps {
  onClose: () => void;
  onConfirm: () => void;
  disabled: boolean;
  submitting: boolean;
}

/** Cancel/confirm button pair — extracted to keep `DestroyUniverseModal` under budget. */
function DestroyUniverseActions({
  onClose,
  onConfirm,
  disabled,
  submitting,
}: DestroyUniverseActionsProps): React.JSX.Element {
  return (
    <div className="grid grid-cols-2 gap-4">
      <button type="button" onClick={onClose} className="btn-sentinel-red text-sm w-full py-2.5">
        Cancelar
      </button>
      <button
        type="button"
        onClick={onConfirm}
        disabled={disabled}
        data-testid="destroy-universe-submit"
        className="btn-sentinel-red text-sm disabled:opacity-50 w-full py-2.5"
      >
        {submitting ? 'Destruyendo…' : 'Confirmar Destrucción'}
      </button>
    </div>
  );
}

/** Resets the modal's local form state whenever the target Universe changes. */
function useResetOnChange(universe: UniverseRow | null): {
  typedLabel: string;
  setTypedLabel: (v: string) => void;
  reason: string;
  setReason: (v: string) => void;
  blockers: Record<string, number> | null;
  setBlockers: (v: Record<string, number> | null) => void;
} {
  const [typedLabel, setTypedLabel] = useState('');
  const [reason, setReason] = useState('');
  const [blockers, setBlockers] = useState<Record<string, number> | null>(null);
  useEffect(() => {
    setTypedLabel('');
    setReason('');
    setBlockers(null);
  }, [universe]);
  return { typedLabel, setTypedLabel, reason, setReason, blockers, setBlockers };
}

/** Submit state + handler for the destroy confirm button — extracted so
 *  `DestroyUniverseModal` stays under budget. */
function useDestroySubmission(
  universe: UniverseRow | null,
  reason: string,
  onDestroyed: () => void,
  setBlockers: (v: Record<string, number> | null) => void
): { submitting: boolean; handleConfirm: () => void } {
  const [submitting, setSubmitting] = useState(false);
  const handleConfirm = (): void => {
    if (!universe) return;
    setSubmitting(true);
    setBlockers(null);
    submitDestroy(universe.id, reason)
      .then(() => onDestroyed())
      .catch((err) => {
        const details = extractZeroStateDetails(err);
        if (details) setBlockers(details);
      })
      .finally(() => setSubmitting(false));
  };
  return { submitting, handleConfirm };
}

/** Modal de destrucción — T6 `DELETE /v1/cosmology/universes/:id`, confirmación
 *  por escritura del `label` (Cond.R-161-R4) + razón opcional (micro-extensión). */
export function DestroyUniverseModal({
  universe,
  onClose,
  onDestroyed,
}: DestroyUniverseModalProps): React.JSX.Element {
  const { typedLabel, setTypedLabel, reason, setReason, blockers, setBlockers } =
    useResetOnChange(universe);
  const { submitting, handleConfirm } = useDestroySubmission(
    universe,
    reason,
    onDestroyed,
    setBlockers
  );

  if (!universe) return <></>;

  return (
    <ArchonModal
      isOpen
      onClose={onClose}
      maxWidth="max-w-2xl"
      ariaLabel="Confirmar destrucción de Universo"
    >
      <div className="p-8 space-y-4">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <span className="text-red-500">🚨 Destruir Universo</span>
        </h3>
        <p className="text-gray-400 text-sm">
          Esta acción es irreversible. Escribe{' '}
          <strong className="text-white">{universe.label}</strong> para confirmar.
        </p>

        <ZeroStateBlockersList blockers={blockers} />

        <DestroyUniverseFields
          typedLabel={typedLabel}
          onTypedLabel={setTypedLabel}
          expectedLabel={universe.label}
          reason={reason}
          onReason={setReason}
        />

        <DestroyUniverseActions
          onClose={onClose}
          onConfirm={handleConfirm}
          disabled={typedLabel !== universe.label || submitting}
          submitting={submitting}
        />
      </div>
    </ArchonModal>
  );
}
