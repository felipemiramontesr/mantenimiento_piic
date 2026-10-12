import React, { useState } from 'react';
import { Ban, Globe, UserPlus } from 'lucide-react';
import ArchonModal from '../../components/UI/ArchonModal';
import { blockUser, Contact, describeArcsialError } from './arcsialApi';
import useArcsialProfile, { ArcsialProfileState } from './useArcsialProfile';
import AddContactModal from './AddContactModal';
import InviteToUniverseModal from './InviteToUniverseModal';
import ProfileSettingsForm from './ProfileSettingsForm';

/**
 * FC209 F3 / FC210 F3 — perfil social: el formulario del perfil propio (nombre, biografía, avatar,
 * visibilidad en búsquedas y @handle), los contactos vigentes con «Bloquear Usuario» (confirmación
 * explícita: se retira el contacto y se cancelan las invitaciones) y los bloqueados. Desde aquí se
 * agrega un contacto y, si la sesión es MU, se invita a su Universo.
 */

/** Confirmación explícita del bloqueo. */
function BlockConfirm({
  target,
  onClose,
  onBlocked,
}: {
  readonly target: Contact | null;
  readonly onClose: () => void;
  readonly onBlocked: () => void;
}): React.JSX.Element | null {
  const [error, setError] = useState<string | null>(null);
  if (!target) return null;
  const confirm = (): void => {
    blockUser(target.id)
      .then(onBlocked)
      .catch((err) => setError(describeArcsialError(err)));
  };
  return (
    <ArchonModal isOpen onClose={onClose} maxWidth="max-w-md" ariaLabel="Bloquear usuario">
      <div className="space-y-4 p-8" data-testid="block-confirm">
        <h3 className="text-lg font-bold text-[#0f2a44]">¿Bloquear a @{target.handle}?</h3>
        <p className="text-sm text-[#0f2a44]/70">
          Dejarán de ser contactos, se cancelarán las invitaciones pendientes entre ustedes y no
          podrá encontrarte ni invitarte.
        </p>
        {error && (
          <p role="alert" className="text-sm font-medium text-red-500">
            {error}
          </p>
        )}
        <div className="grid grid-cols-2 gap-4">
          <button type="button" onClick={onClose} className="text-sm font-bold text-[#0f2a44]/60">
            Cancelar
          </button>
          <button
            type="button"
            onClick={confirm}
            data-testid="block-confirm-submit"
            className="btn-sentinel-red text-sm"
          >
            Bloquear Usuario
          </button>
        </div>
      </div>
    </ArchonModal>
  );
}

/** Lista de contactos con su acción de bloqueo. */
function ContactsList({
  contacts,
  onBlock,
}: {
  readonly contacts: Contact[];
  readonly onBlock: (contact: Contact) => void;
}): React.JSX.Element {
  if (contacts.length === 0) {
    return (
      <p className="text-sm text-[#0f2a44]/40" data-testid="contacts-empty">
        Aún no tienes contactos.
      </p>
    );
  }
  return (
    <ul className="divide-y divide-slate-100" data-testid="contacts-list">
      {contacts.map((contact) => (
        <li key={contact.id} className="flex items-center justify-between py-2 text-sm">
          <span>
            <span className="font-bold text-[#0f2a44]">{contact.displayName}</span>{' '}
            <span className="text-xs text-[#0f2a44]/50">@{contact.handle}</span>
          </span>
          <button
            type="button"
            onClick={(): void => onBlock(contact)}
            data-testid={`contact-block-${contact.id}`}
            className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-red-500 hover:text-red-700"
          >
            <Ban size={12} /> Bloquear Usuario
          </button>
        </li>
      ))}
    </ul>
  );
}

/** Bloqueados por la sesión (solo lectura). */
function BlockedList({ state }: { readonly state: ArcsialProfileState }): React.JSX.Element | null {
  if (state.blocks.length === 0) return null;
  return (
    <div className="space-y-1" data-testid="blocked-list">
      <h4 className="text-xs font-bold uppercase tracking-widest text-[#0f2a44]/40">Bloqueados</h4>
      {state.blocks.map((b) => (
        <p key={b.blockedId} className="text-sm text-[#0f2a44]/60">
          {b.displayName ?? '—'} <span className="text-xs">@{b.handle ?? '—'}</span>
        </p>
      ))}
    </div>
  );
}

type OpenModal = 'contact' | 'universe' | null;

/** Agregar contacto e (MU) invitar a su Universo. */
function SocialActions({
  state,
  onOpen,
}: {
  readonly state: ArcsialProfileState;
  readonly onOpen: (modal: Exclude<OpenModal, null>) => void;
}): React.JSX.Element {
  return (
    <div className="flex flex-wrap gap-3">
      <button
        type="button"
        onClick={(): void => onOpen('contact')}
        data-testid="open-add-contact"
        className="btn-sentinel-sky-static text-xs"
      >
        <UserPlus size={12} /> Agregar contacto
      </button>
      {state.profile?.muUniverse && (
        <button
          type="button"
          onClick={(): void => onOpen('universe')}
          data-testid="open-invite-universe"
          className="btn-sentinel-emerald text-xs"
        >
          <Globe size={12} /> Invitar a mi Universo
        </button>
      )}
    </div>
  );
}

/** Modales de invitación: agregar contacto y, para el MU, invitar a su Universo. */
function InviteModals({
  state,
  open,
  onClose,
  onSent,
}: {
  readonly state: ArcsialProfileState;
  readonly open: OpenModal;
  readonly onClose: () => void;
  readonly onSent: () => void;
}): React.JSX.Element {
  return (
    <>
      <AddContactModal isOpen={open === 'contact'} onClose={onClose} onSent={onSent} />
      {state.profile?.muUniverse && (
        <InviteToUniverseModal
          isOpen={open === 'universe'}
          universeLabel={state.profile.muUniverse.label}
          contacts={state.contacts}
          onClose={onClose}
          onSent={onSent}
        />
      )}
    </>
  );
}

/**
 * Formulario del perfil propio (cuando ya cargó) y el motivo de un fallo de las lecturas. Al guardar
 * recarga las lecturas y avisa al contenedor.
 */
function OwnProfileSection({
  state,
  onProfileSaved,
}: {
  readonly state: ArcsialProfileState;
  readonly onProfileSaved: () => void;
}): React.JSX.Element {
  const onSaved = (): void => {
    state.reload();
    onProfileSaved();
  };
  return (
    <>
      {state.profile && <ProfileSettingsForm ownHandle={state.profile.handle} onSaved={onSaved} />}
      {state.error && (
        <p role="alert" className="text-sm font-medium text-red-500" data-testid="contacts-error">
          {state.error}
        </p>
      )}
    </>
  );
}

/** Pestaña «Contactos» de Arcsial; `onProfileSaved` avisa al contenedor de un cambio del perfil propio. */
export default function ProfileContactsTab({
  onProfileSaved,
}: {
  readonly onProfileSaved: () => void;
}): React.JSX.Element {
  const state = useArcsialProfile();
  const [open, setOpen] = useState<OpenModal>(null);
  const [blockTarget, setBlockTarget] = useState<Contact | null>(null);
  const done = (): void => {
    setOpen(null);
    setBlockTarget(null);
    state.reload();
  };
  return (
    <section className="space-y-6" data-testid="profile-contacts-tab">
      <OwnProfileSection state={state} onProfileSaved={onProfileSaved} />
      <SocialActions state={state} onOpen={setOpen} />
      <ContactsList contacts={state.contacts} onBlock={setBlockTarget} />
      <BlockedList state={state} />
      <InviteModals state={state} open={open} onClose={(): void => setOpen(null)} onSent={done} />
      <BlockConfirm
        key={blockTarget?.id ?? 'none'}
        target={blockTarget}
        onClose={(): void => setBlockTarget(null)}
        onBlocked={done}
      />
    </section>
  );
}
