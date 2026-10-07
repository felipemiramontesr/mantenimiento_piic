import React from 'react';
import { KeyRound, Link2, Trash2 } from 'lucide-react';
import ArchonDataTable, { ArchonTableHeader } from '../../../../components/UI/ArchonDataTable';
import type { PlatformUser } from './platformUsersApi';
import type { SovereignAction } from './SovereignUserActionModal';

/** Acciones de una fila: las dos soberanas sobre un miembro, o (FC206 F1) vincular a un itinerante. */
export type PlatformUserAction = SovereignAction | 'link';

/** FC204 F4 — tabla de la consola: cada usuario con el nombre de su Universo y sus acciones. */

const HEADERS: ArchonTableHeader[] = [
  { key: 'user', label: 'Usuario', align: 'left' },
  { key: 'email', label: 'Correo', align: 'left' },
  { key: 'universe', label: 'Universo', align: 'left' },
  { key: 'type', label: 'Rol', align: 'center' },
  { key: 'status', label: 'Estado', align: 'center' },
  { key: 'actions', label: 'Acciones', align: 'right' },
];

/** Clave de fila: un usuario puede aparecer una vez por Universo. */
export function platformUserKey(user: PlatformUser): string {
  return `${user.id}-${user.tenantId ?? 'itinerant'}`;
}

interface RowProps {
  readonly user: PlatformUser;
  readonly onAction: (user: PlatformUser, action: PlatformUserAction) => void;
}

/** Botones soberanos: deshabilitados para un itinerante (sin Universo no hay nombre que confirmar). */
function RowActions({ user, onAction }: RowProps): React.JSX.Element {
  const itinerant = user.tenantName === null;
  const hint = itinerant ? 'Sin Universo: la acción no aplica' : undefined;
  return (
    <div className="inline-flex items-center gap-4">
      {itinerant && (
        <button
          type="button"
          onClick={(): void => onAction(user, 'link')}
          data-testid={`platform-user-link-${platformUserKey(user)}`}
          className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-900 text-xs font-bold uppercase tracking-widest"
        >
          <Link2 size={12} /> Vincular a Universo
        </button>
      )}
      <button
        type="button"
        disabled={itinerant}
        title={hint}
        onClick={(): void => onAction(user, 'reset-mfa')}
        data-testid={`platform-user-reset-mfa-${platformUserKey(user)}`}
        className="inline-flex items-center gap-1 text-pinnacle-navy/70 hover:text-pinnacle-navy text-xs font-bold uppercase tracking-widest disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <KeyRound size={12} /> Restablecer 2FA
      </button>
      <button
        type="button"
        disabled={itinerant}
        title={hint}
        onClick={(): void => onAction(user, 'delete')}
        data-testid={`platform-user-delete-${platformUserKey(user)}`}
        className="inline-flex items-center gap-1 text-red-500 hover:text-red-700 text-xs font-bold uppercase tracking-widest disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <Trash2 size={12} /> Eliminar
      </button>
    </div>
  );
}

/** Una fila de la consola. */
function PlatformUserRow({ user, onAction }: RowProps): React.JSX.Element {
  return (
    <tr
      className="border-b border-slate-100 hover:bg-slate-50 transition-colors text-xs"
      data-testid={`platform-user-row-${platformUserKey(user)}`}
    >
      <td className="py-3 px-3">
        <div className="font-medium text-pinnacle-navy">{user.fullName || user.username}</div>
        <div className="text-pinnacle-navy/40 uppercase tracking-widest">{user.username}</div>
      </td>
      <td className="py-3 px-3 text-pinnacle-navy/70">{user.email}</td>
      <td className="py-3 px-3 text-pinnacle-navy">
        {user.tenantName ?? <span className="text-pinnacle-navy/40 italic">Itinerante</span>}
      </td>
      <td className="py-3 px-3 text-center text-pinnacle-navy/60">{user.cosmonautType ?? '—'}</td>
      <td className="py-3 px-3 text-center text-pinnacle-navy/60">
        {user.isActive ? 'Activo' : 'Inactivo'}
      </td>
      <td className="py-3 px-3 text-right">
        <RowActions user={user} onAction={onAction} />
      </td>
    </tr>
  );
}

/** Tabla de usuarios de plataforma. */
export default function PlatformUsersTable({
  users,
  loading,
  onAction,
}: {
  readonly users: PlatformUser[];
  readonly loading: boolean;
  readonly onAction: (user: PlatformUser, action: PlatformUserAction) => void;
}): React.JSX.Element {
  return (
    <ArchonDataTable<PlatformUser>
      data={users}
      headers={HEADERS}
      loading={loading}
      testId="platform-users-table"
      variant="embedded"
      emptyMessage="No hay usuarios con este filtro."
      renderRow={(user): React.ReactNode => (
        <PlatformUserRow key={platformUserKey(user)} user={user} onAction={onAction} />
      )}
    />
  );
}
