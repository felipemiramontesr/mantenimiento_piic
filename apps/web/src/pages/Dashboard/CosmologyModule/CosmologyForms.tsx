import React, { useEffect, useState } from 'react';
import { Globe, Plus, AlertTriangle, Tag, Layers, Users } from 'lucide-react';
import api from '../../../api/client';
import ArchonModal from '../../../components/UI/ArchonModal';
import ArchonField from '../../../components/ArchonField';
import ArchonSelect from '../../../components/ArchonSelect';
import { LinkedUserSection, useLinkedUserState } from './LinkedUserSection';

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
  readonly onCreated: () => void;
}

interface CreateUniverseFieldsProps {
  readonly label: string;
  readonly onLabel: (v: string) => void;
  readonly universeTypeCode: string;
  readonly onUniverseTypeCode: (v: string) => void;
  readonly ownerTypeCode: string;
  readonly onOwnerTypeCode: (v: string) => void;
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
      <ArchonField label="Nombre" icon={Tag} required>
        <input
          required
          value={label}
          onChange={(e): void => onLabel(e.target.value)}
          data-testid="create-universe-label"
          className="archon-input"
        />
      </ArchonField>
      <ArchonField label="Tipo de Universo" icon={Layers} required>
        <ArchonSelect
          options={UNIVERSE_TYPE_OPTIONS}
          value={universeTypeCode}
          onChange={onUniverseTypeCode}
        />
      </ArchonField>
      <ArchonField label="Tipo de Owner" icon={Users} required>
        <ArchonSelect
          options={OWNER_TYPE_OPTIONS}
          value={ownerTypeCode}
          onChange={onOwnerTypeCode}
        />
      </ArchonField>
    </div>
  );
}

/** Header block for `CreateUniverseForm` — extracted to keep it under budget. */
function CreateUniverseHeader(): React.JSX.Element {
  return (
    <div className="card-sovereign-header">
      <Globe size={22} className="text-[var(--card-accent)]" />
      <h3 className="card-sovereign-title text-archon-xl opacity-100">Crear Universo</h3>
    </div>
  );
}

/** FC177 F4 — `linkedUserId` omitted entirely when the toggle is off / nothing picked yet (same
 *  optionality FC176 F2's `initialAdmin` had — Universo puede crearse sin vincular a nadie). */
function buildCreateUniversePayload(
  label: string,
  universeTypeCode: string,
  ownerTypeCode: string,
  linkedUserId: number | null
): Record<string, unknown> {
  return {
    label,
    universeTypeCode,
    ownerTypeCode,
    ...(linkedUserId !== null ? { linkedUserId } : {}),
  };
}

interface CreateUniverseSubmitFooterProps {
  readonly error: string | null;
  readonly submitting: boolean;
  readonly disabled: boolean;
}

/** Error text + submit button — extracted to keep `CreateUniverseForm` under budget. */
function CreateUniverseSubmitFooter({
  error,
  submitting,
  disabled,
}: CreateUniverseSubmitFooterProps): React.JSX.Element {
  return (
    <>
      {error && <p className="text-red-500 text-sm font-medium">{error}</p>}
      <button
        type="submit"
        disabled={disabled}
        data-testid="create-universe-submit"
        className="btn-sentinel-emerald text-sm disabled:opacity-50"
      >
        <Plus size={14} />
        {submitting ? 'Creando…' : 'Crear Universo'}
      </button>
    </>
  );
}

/** Formulario de alta — T5 `POST /v1/cosmology/universes`, con vinculación opcional de un usuario
 *  pendiente como Administrador del Universo (FC177 F3/F4, payload `linkedUserId`). */
export function CreateUniverseForm({ onCreated }: CreateUniverseFormProps): React.JSX.Element {
  const [label, setLabel] = useState('');
  const [universeTypeCode, setUniverseTypeCode] = useState(UNIVERSE_TYPE_OPTIONS[0].value);
  const [ownerTypeCode, setOwnerTypeCode] = useState(OWNER_TYPE_OPTIONS[0].value);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const linking = useLinkedUserState();

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    api
      .post(
        '/cosmology/universes',
        buildCreateUniversePayload(label, universeTypeCode, ownerTypeCode, linking.linkedUserId)
      )
      .then(() => {
        setLabel('');
        linking.reset();
        onCreated();
      })
      .catch(() => setError('No se pudo crear el Universo. Intenta de nuevo.'))
      .finally(() => setSubmitting(false));
  };

  const linkingIncomplete = linking.props.includeLink && linking.linkedUserId === null;

  return (
    <form
      onSubmit={handleSubmit}
      className="card-archon-sovereign bg-white p-10 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 [--card-accent:#0f2a44]"
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

      <LinkedUserSection {...linking.props} />

      <CreateUniverseSubmitFooter
        error={error}
        submitting={submitting}
        disabled={submitting || label.trim().length === 0 || linkingIncomplete}
      />
    </form>
  );
}

interface DestroyUniverseModalProps {
  readonly universe: UniverseRow | null;
  readonly onClose: () => void;
  readonly onDestroyed: () => void;
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
  readonly blockers: Record<string, number> | null;
}): React.JSX.Element | null {
  if (!blockers) return null;
  return (
    <div
      data-testid="destroy-universe-blockers"
      className="bg-red-50 border border-red-200 rounded-[4px] p-4 space-y-1"
    >
      <p className="text-red-700 text-sm font-bold flex items-center gap-2">
        <AlertTriangle size={14} /> El Universo no está vacío:
      </p>
      <ul className="text-red-600 text-sm list-disc list-inside">
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
  readonly typedLabel: string;
  readonly onTypedLabel: (v: string) => void;
  readonly expectedLabel: string;
  readonly reason: string;
  readonly onReason: (v: string) => void;
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
      <ArchonField label="Nombre del Universo" icon={Globe}>
        <input
          value={typedLabel}
          onChange={(e): void => onTypedLabel(e.target.value)}
          placeholder={expectedLabel}
          data-testid="destroy-universe-confirm-label"
          className="archon-input"
        />
      </ArchonField>
      <ArchonField label="Razón (opcional)" icon={AlertTriangle}>
        <textarea
          value={reason}
          onChange={(e): void => onReason(e.target.value)}
          placeholder="Razón (opcional)"
          data-testid="destroy-universe-reason"
          className="w-full bg-[#0f2a44]/5 border-0 border-b-2 border-[#0f2a44]/10 focus:border-b-[#f2b705] focus:bg-white rounded-[4px] p-3 text-[#0f2a44] text-sm outline-none transition-all min-h-[80px] resize-none"
        />
      </ArchonField>
    </>
  );
}

/** T6 `DELETE /v1/cosmology/universes/:id` — the raw request, no component state. */
async function submitDestroy(universeId: number, reason: string): Promise<void> {
  const payload = reason.trim().length >= 5 ? { reason: reason.trim() } : undefined;
  await api.delete(`/cosmology/universes/${universeId}`, { data: payload });
}

interface DestroyUniverseActionsProps {
  readonly onClose: () => void;
  readonly onConfirm: () => void;
  readonly disabled: boolean;
  readonly submitting: boolean;
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
function useResetOnChange(universe: UniverseRow): {
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
  universe: UniverseRow,
  reason: string,
  onDestroyed: () => void,
  setBlockers: (v: Record<string, number> | null) => void
): { submitting: boolean; handleConfirm: () => void } {
  const [submitting, setSubmitting] = useState(false);
  const handleConfirm = (): void => {
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

interface DestroyUniverseModalContentProps {
  readonly universe: UniverseRow;
  readonly onClose: () => void;
  readonly onDestroyed: () => void;
}

/** FC165 F3 Slice3.1 — cuerpo del modal, aislado en un componente propio para
 *  que `universe: UniverseRow` (no-nulo) sea un invariante de TIPO, no de
 *  runtime: purga la guardia `if (!universe) return` que Sonar marcaba como
 *  rama inalcanzable (el gate de null vive en `DestroyUniverseModal`, que
 *  solo monta este componente cuando `universe` ya es no-nulo). */
function DestroyUniverseModalContent({
  universe,
  onClose,
  onDestroyed,
}: DestroyUniverseModalContentProps): React.JSX.Element {
  const { typedLabel, setTypedLabel, reason, setReason, blockers, setBlockers } =
    useResetOnChange(universe);
  const { submitting, handleConfirm } = useDestroySubmission(
    universe,
    reason,
    onDestroyed,
    setBlockers
  );

  return (
    <ArchonModal
      isOpen
      onClose={onClose}
      maxWidth="max-w-2xl"
      ariaLabel="Confirmar destrucción de Universo"
    >
      <div className="p-8 space-y-4">
        <h3 className="text-xl font-bold text-[#0f2a44] flex items-center gap-2">
          <span className="text-red-600">🚨 Destruir Universo</span>
        </h3>
        <p className="text-[#0f2a44]/60 text-sm">
          Esta acción es irreversible. Escribe{' '}
          <strong className="text-[#0f2a44]">{universe.label}</strong> para confirmar.
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

/** Modal de destrucción — T6 `DELETE /v1/cosmology/universes/:id`, confirmación
 *  por escritura del `label` (Cond.R-161-R4) + razón opcional (micro-extensión). */
export function DestroyUniverseModal({
  universe,
  onClose,
  onDestroyed,
}: DestroyUniverseModalProps): React.JSX.Element {
  if (!universe) return <></>;
  return (
    <DestroyUniverseModalContent universe={universe} onClose={onClose} onDestroyed={onDestroyed} />
  );
}
