import React, { useEffect, useState } from 'react';
import { UserCheck } from 'lucide-react';
import api from '../../../api/client';
import ArchonField from '../../../components/ArchonField';
import ArchonSelect, { type SelectOption } from '../../../components/ArchonSelect';

/**
 * FC177 F4 — Cosmology_UI_User_Linking_Refactor. Replaces `InitialAdminSection.tsx` (FC176 F3,
 * inline capture of a brand-new admin's name/email/password) — Cosmología no longer captures
 * anyone's data by hand (Cond.R-177 R3, Bravo). GrayMan instead picks an existing, self-registered,
 * quarantined user (`GET /v1/cosmology/pending-users`, FC177 F3) to link as the new Universo's MU.
 */

interface PendingUser {
  id: number;
  username: string;
  fullName: string;
  email: string;
  rfc: string;
  razonSocial: string;
}

/** Candidate pool for `linkedUserId` — same fetch-on-mount shape as `useUniverses`
 *  (`CosmologyModule.tsx`); only mounted once the toggle reveals the picker. */
function usePendingUsers(): { options: SelectOption[]; loading: boolean; error: boolean } {
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

  const options: SelectOption[] = users.map((u) => ({
    value: String(u.id),
    label: `${u.fullName} — ${u.razonSocial}`,
    secondaryLabel: u.rfc,
    searchTerms: `${u.username} ${u.email} ${u.razonSocial} ${u.rfc}`,
  }));

  return { options, loading, error };
}

interface LinkedUserPickerProps {
  readonly userId: string;
  readonly onUserId: (v: string) => void;
}

/** The candidate selector — extracted to keep `LinkedUserSection` under budget. */
function LinkedUserPicker({ userId, onUserId }: LinkedUserPickerProps): React.JSX.Element {
  const { options, loading, error } = usePendingUsers();
  if (error) {
    return (
      <p className="text-red-500 text-sm" data-testid="linked-user-error">
        No se pudo cargar la lista de usuarios pendientes.
      </p>
    );
  }
  return (
    <ArchonField label="Usuario Pendiente" icon={UserCheck} required>
      <ArchonSelect
        options={options}
        value={userId}
        onChange={onUserId}
        placeholder={loading ? 'Cargando…' : 'Seleccionar usuario…'}
        disabled={loading}
      />
    </ArchonField>
  );
}

interface LinkedUserToggleProps {
  readonly checked: boolean;
  readonly onChange: (v: boolean) => void;
}

/** Reveals `LinkedUserPicker`; unchecked by default so the payload omits `linkedUserId` unless
 *  GrayMan opts in (same optionality FC176 F3's `initialAdmin` toggle had — truth table row 2 of
 *  FC177: Ω sin `linkedUserId` → 201, solo tenant). */
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
  readonly userId: string;
  readonly onUserId: (v: string) => void;
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
  const [userId, setUserId] = useState('');

  const reset = (): void => {
    setIncludeLink(false);
    setUserId('');
  };

  const linkedUserId = includeLink && userId !== '' ? Number(userId) : null;

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
