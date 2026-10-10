import React, { useCallback, useEffect, useState } from 'react';
import { Globe, UserPlus } from 'lucide-react';
import {
  describeArcsialError,
  describeExpiry,
  fetchInvitations,
  Invitation,
  InviteAction,
  InviteStatus,
  respondInvitation,
} from './arcsialApi';

/**
 * FC209 F3 — bandeja de invitaciones: «Recibidas» (Aceptar / Rechazar) y «Enviadas» (Cancelar). Contacto
 * con `UserPlus`; Universo con `Globe` y el nombre del Universo. Las PENDING muestran cuánto falta para
 * que venzan (TTL 7 días); el servidor ya marcó EXPIRED las vencidas al listar.
 */

type Direction = Invitation['direction'];

const STATUS_LABEL: Record<InviteStatus, string> = {
  PENDING: 'Pendiente',
  ACCEPTED: 'Aceptada',
  REJECTED: 'Rechazada',
  CANCELED: 'Cancelada',
  EXPIRED: 'Vencida',
};

interface Inbox {
  readonly invitations: Invitation[];
  readonly loading: boolean;
  readonly error: string | null;
  readonly respond: (id: number, action: InviteAction) => void;
}

/** Carga la bandeja y responde; tras cada respuesta la recarga y avisa a quien escuche. */
function useInbox(onChanged: () => void): Inbox {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback((): void => {
    fetchInvitations()
      .then(setInvitations)
      .catch((err) => setError(describeArcsialError(err)))
      .finally(() => setLoading(false));
  }, []);
  useEffect(reload, [reload]);
  const respond = (id: number, action: InviteAction): void => {
    setError(null);
    respondInvitation(id, action)
      .then(() => {
        onChanged();
        reload();
      })
      .catch((err) => setError(describeArcsialError(err)));
  };
  return { invitations, loading, error, respond };
}

/** Botones según la dirección; solo las PENDING se responden. */
function InvitationActions({
  invitation,
  respond,
}: {
  readonly invitation: Invitation;
  readonly respond: Inbox['respond'];
}): React.JSX.Element | null {
  if (invitation.status !== 'PENDING') return null;
  const button = (action: InviteAction, label: string, tone: string): React.JSX.Element => (
    <button
      type="button"
      onClick={(): void => respond(invitation.id, action)}
      data-testid={`invitation-${action}-${invitation.id}`}
      className={`text-xs font-bold uppercase tracking-widest ${tone}`}
    >
      {label}
    </button>
  );
  return invitation.direction === 'RECEIVED' ? (
    <span className="flex gap-3">
      {button('accept', 'Aceptar', 'text-emerald-700 hover:text-emerald-900')}
      {button('reject', 'Rechazar', 'text-red-500 hover:text-red-700')}
    </span>
  ) : (
    button('cancel', 'Cancelar', 'text-[#0f2a44]/60 hover:text-[#0f2a44]')
  );
}

/** Una invitación: tipo, contraparte, Universo, estado o vencimiento, y acciones. */
function InvitationRow({
  invitation,
  respond,
}: {
  readonly invitation: Invitation;
  readonly respond: Inbox['respond'];
}): React.JSX.Element {
  const universe = invitation.inviteType === 'UNIVERSE';
  return (
    <li
      className="flex items-center justify-between gap-3 py-3 text-sm"
      data-testid={`invitation-${invitation.id}`}
    >
      <span className="flex items-center gap-3">
        {universe ? (
          <Globe size={16} className="text-sky-700" />
        ) : (
          <UserPlus size={16} className="text-emerald-700" />
        )}
        <span>
          <span className="font-bold text-[#0f2a44]">
            {invitation.counterpartDisplayName ?? '—'}
          </span>{' '}
          <span className="text-xs text-[#0f2a44]/50">@{invitation.counterpartHandle ?? '—'}</span>
          {universe && (
            <span className="block text-xs text-sky-700">Universo: {invitation.tenantName}</span>
          )}
        </span>
      </span>
      <span className="flex items-center gap-3 text-xs text-[#0f2a44]/60">
        {invitation.status === 'PENDING'
          ? describeExpiry(invitation.expiresAt)
          : STATUS_LABEL[invitation.status]}
        <InvitationActions invitation={invitation} respond={respond} />
      </span>
    </li>
  );
}

/** Pestaña de dirección. */
function DirectionTab({
  label,
  active,
  onClick,
}: {
  readonly label: string;
  readonly active: boolean;
  readonly onClick: () => void;
}): React.JSX.Element {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`border-b-2 pb-1 text-xs font-bold uppercase tracking-widest ${
        active ? 'border-[#0f2a44] text-[#0f2a44]' : 'border-transparent text-[#0f2a44]/40'
      }`}
    >
      {label}
    </button>
  );
}

/** Bandeja de invitaciones de Arcsial. `onChanged` permite refrescar contactos tras aceptar. */
export default function InvitationsInbox({
  onChanged = (): void => undefined,
}: {
  readonly onChanged?: () => void;
}): React.JSX.Element {
  const inbox = useInbox(onChanged);
  const [direction, setDirection] = useState<Direction>('RECEIVED');
  const shown = inbox.invitations.filter((i) => i.direction === direction);
  return (
    <section className="space-y-4" data-testid="invitations-inbox">
      <div role="tablist" className="flex gap-6">
        <DirectionTab
          label="Recibidas"
          active={direction === 'RECEIVED'}
          onClick={(): void => setDirection('RECEIVED')}
        />
        <DirectionTab
          label="Enviadas"
          active={direction === 'SENT'}
          onClick={(): void => setDirection('SENT')}
        />
      </div>
      {inbox.error && (
        <p
          role="alert"
          data-testid="invitations-error"
          className="text-sm font-medium text-red-500"
        >
          {inbox.error}
        </p>
      )}
      {!inbox.loading && shown.length === 0 && (
        <p className="text-sm text-[#0f2a44]/40" data-testid="invitations-empty">
          No hay invitaciones {direction === 'RECEIVED' ? 'recibidas' : 'enviadas'}.
        </p>
      )}
      <ul className="divide-y divide-slate-100">
        {shown.map((invitation) => (
          <InvitationRow key={invitation.id} invitation={invitation} respond={inbox.respond} />
        ))}
      </ul>
    </section>
  );
}
