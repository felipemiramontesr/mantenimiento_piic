import React, { useCallback, useEffect, useState } from 'react';
import { UserCheck } from 'lucide-react';
import api from '../../../api/client';
import ArchonField from '../../../components/ArchonField';
import { Combobox } from '../../../components/Routes/RouteAssignment/ArchonGeoSelector/Combobox';

/**
 * FC178 — LinkedUserSection_Predictive_Combobox_UX. Swaps the `ArchonSelect` client-side-filter
 * combobox FC177 F4 shipped for the canonical `Combobox<T>` (`ArchonGeoSelector`, already used by
 * the Estado/Municipio/Colonia pickers in Rutas) — same async `onSearch` contract, 300ms debounce,
 * but wired to filter in-memory over the already-fetched `GET /pending-users` pool, same precedent
 * as `useGeoActions.ts`'s `searchStates` (small, bounded catalog — 0 new backend surface).
 */

interface PendingUser {
  id: number;
  username: string;
  fullName: string;
  email: string;
  rfc: string;
  razonSocial: string;
}

interface PendingUserCandidate extends PendingUser {
  matchLabel?: string;
  matchValue?: string;
}

/** Same priority-order multi-field match as `matchFieldInUser` (`UsersGridView.tsx`) — first field
 *  that contains `query` wins, so the Combobox can show *why* a candidate matched. */
function matchFieldInPendingUser(
  u: PendingUser,
  query: string
): { label: string; value: string } | null {
  if (u.rfc.toLowerCase().includes(query)) return { label: 'RFC', value: u.rfc };
  if (u.razonSocial.toLowerCase().includes(query))
    return { label: 'Razón Social', value: u.razonSocial };
  if (u.email.toLowerCase().includes(query)) return { label: 'Email', value: u.email };
  if (u.fullName.toLowerCase().includes(query)) return { label: 'Nombre', value: u.fullName };
  if (u.username.toLowerCase().includes(query)) return { label: 'Usuario', value: u.username };
  return null;
}

const getPendingUserLabel = (c: PendingUserCandidate): string => `${c.fullName} — ${c.razonSocial}`;
const getPendingUserValue = (c: PendingUserCandidate): number => c.id;
const getPendingUserSecondary = (c: PendingUserCandidate): string | undefined =>
  c.matchLabel ? `${c.matchLabel}: ${c.matchValue}` : undefined;

/** Candidate pool for `linkedUserId` — single fetch-on-mount (only once the toggle mounts the
 *  picker), same shape as `useUniverses` (`CosmologyModule.tsx`). */
function usePendingUsers(): { users: PendingUser[]; loading: boolean; error: boolean } {
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .get<{ success: boolean; data: PendingUser[] }>('/cosmology/pending-users')
      .then((res) => {
        if (!cancelled) setUsers(res.data.data ?? []);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return (): void => {
      cancelled = true;
    };
  }, []);

  return { users, loading, error };
}

interface LinkedUserPickerProps {
  readonly userId: number | undefined;
  readonly onUserId: (id: number) => void;
}

/** The candidate selector — `Combobox<PendingUserCandidate>`'s `onSearch` filters `users` in
 *  memory (precedent: `searchStates`), no network call per keystroke. Extracted to keep
 *  `LinkedUserSection` under budget. */
function LinkedUserPicker({ userId, onUserId }: LinkedUserPickerProps): React.JSX.Element {
  const { users, loading, error } = usePendingUsers();

  const onSearch = useCallback(
    async (query: string): Promise<PendingUserCandidate[]> => {
      const term = query.toLowerCase().trim();
      if (!term) return users;
      return users
        .map((u): PendingUserCandidate | null => {
          const match = matchFieldInPendingUser(u, term);
          return match ? { ...u, matchLabel: match.label, matchValue: match.value } : null;
        })
        .filter((c): c is PendingUserCandidate => c !== null);
    },
    [users]
  );

  if (error) {
    return (
      <p className="text-red-500 text-sm" data-testid="linked-user-error">
        No se pudo cargar la lista de usuarios pendientes.
      </p>
    );
  }
  return (
    <ArchonField label="Usuario Pendiente" icon={UserCheck} required>
      <Combobox<PendingUserCandidate>
        value={userId}
        onChange={(id): void => onUserId(id)}
        onSearch={onSearch}
        initialOptions={users}
        disabled={loading}
        placeholder={loading ? 'Cargando…' : 'Buscar por nombre, RFC, razón social o email…'}
        getOptionLabel={getPendingUserLabel}
        getOptionValue={getPendingUserValue}
        getOptionSecondary={getPendingUserSecondary}
      />
    </ArchonField>
  );
}

interface LinkedUserToggleProps {
  readonly checked: boolean;
  readonly onChange: (v: boolean) => void;
}

/** Reveals `LinkedUserPicker`; unchecked by default so the payload omits `linkedUserId` unless
 *  GrayMan opts in (truth table row 2 of FC177: Ω sin `linkedUserId` → 201, solo tenant). */
function LinkedUserToggle({ checked, onChange }: LinkedUserToggleProps): React.JSX.Element {
  return (
    <label className="flex items-center gap-2 text-sm font-medium text-[#0f2a44]/70 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e): void => onChange(e.target.checked)}
        data-testid="create-universe-with-link-toggle"
        className="w-4 h-4 accent-[#f2b705]"
      />
      <UserCheck size={16} />
      Vincular Usuario Registrado
    </label>
  );
}

export interface LinkedUserSectionProps {
  readonly includeLink: boolean;
  readonly onToggle: (v: boolean) => void;
  readonly userId: number | undefined;
  readonly onUserId: (id: number) => void;
}

/** Toggle + conditional picker, grouped so `CreateUniverseForm`'s JSX stays under budget. */
export function LinkedUserSection({
  includeLink,
  onToggle,
  userId,
  onUserId,
}: LinkedUserSectionProps): React.JSX.Element {
  return (
    <div className="space-y-4 border-t border-[#0f2a44]/10 pt-4">
      <LinkedUserToggle checked={includeLink} onChange={onToggle} />
      {includeLink && (
        <div
          className="animate-in fade-in slide-in-from-top-2 duration-300"
          data-testid="linked-user-fields"
        >
          <LinkedUserPicker userId={userId} onUserId={onUserId} />
        </div>
      )}
    </div>
  );
}

/** Local state + submit-readiness for the optional `linkedUserId` — extracted so
 *  `CreateUniverseForm` stays under the Gate 2 per-function budget. */
export function useLinkedUserState(): {
  props: LinkedUserSectionProps;
  linkedUserId: number | null;
  reset: () => void;
} {
  const [includeLink, setIncludeLink] = useState(false);
  const [userId, setUserId] = useState<number | undefined>(undefined);

  const reset = (): void => {
    setIncludeLink(false);
    setUserId(undefined);
  };

  const linkedUserId = includeLink && userId !== undefined ? userId : null;

  return {
    props: {
      includeLink,
      onToggle: setIncludeLink,
      userId,
      onUserId: setUserId,
    },
    linkedUserId,
    reset,
  };
}
