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
 *
 * FC179 — Pending_Users_Limit_And_Fixed_RFC_Disambiguation. The candidate pool has no natural
 * ceiling (unlike `states`), so `GET /pending-users` now caps at 200 (FIFO by registration date)
 * and returns `total`. Two consequences here: (1) the dynamic "which field matched" badge FC178
 * built is replaced by a FIXED `RFC: ...` line, always visible — GrayMan needs a verifiable,
 * SAT-unique identifier to tell homonyms apart at a glance, not just when he searches by RFC;
 * (2) when `total` exceeds the returned rows, an overflow notice tells GrayMan he isn't seeing the
 * whole queue.
 */

interface PendingUser {
  id: number;
  username: string;
  fullName: string;
  email: string;
  rfc: string;
  razonSocial: string;
}

const getPendingUserLabel = (u: PendingUser): string => `${u.fullName} — ${u.razonSocial}`;
const getPendingUserValue = (u: PendingUser): number => u.id;
/** Fixed, always-visible RFC (FC179 D2, 317_AN) — not a dynamic "why did this match" badge:
 *  the SAT-unique identifier GrayMan can verify against a real fiscal document, unlike an
 *  internal DB id or a UUID. */
const getPendingUserSecondary = (u: PendingUser): string => `RFC: ${u.rfc}`;

/** Multi-field match (nombre/razón social/email/RFC/username) — the search still spans every
 *  field, only the *display* no longer needs to report which one matched (FC179 replaces that
 *  with the fixed RFC line above). */
function pendingUserMatchesQuery(u: PendingUser, query: string): boolean {
  return (
    u.fullName.toLowerCase().includes(query) ||
    u.razonSocial.toLowerCase().includes(query) ||
    u.email.toLowerCase().includes(query) ||
    u.rfc.toLowerCase().includes(query) ||
    u.username.toLowerCase().includes(query)
  );
}

/** Candidate pool for `linkedUserId` — single fetch-on-mount (only once the toggle mounts the
 *  picker), same shape as `useUniverses` (`CosmologyModule.tsx`). FC179 adds `total`: the FIFO-
 *  limited `users` array may be a truncated view of a larger backlog. */
function usePendingUsers(): {
  users: PendingUser[];
  total: number;
  loading: boolean;
  error: boolean;
} {
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .get<{ success: boolean; data: PendingUser[]; total: number }>('/cosmology/pending-users')
      .then((res) => {
        if (!cancelled) {
          setUsers(res.data.data ?? []);
          setTotal(res.data.total ?? 0);
        }
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

  return { users, total, loading, error };
}

interface LinkedUserPickerProps {
  readonly userId: number | undefined;
  readonly onUserId: (id: number) => void;
}

/** Overflow notice (FC179 Scenario 3, Cond.R-179 R2) — only when the FIFO-limited `users` array
 *  is a truncated view of a larger `total`. Derives the shown count from `users.length` rather
 *  than hardcoding 200, so it stays accurate even if the backend's LIMIT ever changes. */
function PendingUsersOverflowNotice({
  shown,
  total,
}: {
  readonly shown: number;
  readonly total: number;
}): React.JSX.Element | null {
  if (total <= shown) return null;
  return (
    <p className="text-xs text-[#0f2a44]/40 mt-1.5" data-testid="pending-users-overflow-notice">
      Mostrando los primeros {shown} de {total} pendientes.
    </p>
  );
}

/** The candidate selector — `Combobox<PendingUser>`'s `onSearch` filters `users` in memory
 *  (precedent: `searchStates`), no network call per keystroke. Extracted to keep
 *  `LinkedUserSection` under budget. */
function LinkedUserPicker({ userId, onUserId }: LinkedUserPickerProps): React.JSX.Element {
  const { users, total, loading, error } = usePendingUsers();

  const onSearch = useCallback(
    async (query: string): Promise<PendingUser[]> => {
      const term = query.toLowerCase().trim();
      if (!term) return users;
      return users.filter((u) => pendingUserMatchesQuery(u, term));
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
    <>
      <ArchonField label="Usuario Pendiente" icon={UserCheck} required>
        <Combobox<PendingUser>
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
      <PendingUsersOverflowNotice shown={users.length} total={total} />
    </>
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
