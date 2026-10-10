import React from 'react';
import { Globe } from 'lucide-react';
import ArchonModal from '../../components/UI/ArchonModal';
import ArchonSelect from '../../components/ArchonSelect';
import type { Contact } from './arcsialApi';
import {
  HandleSearchField,
  InviteModalActions,
  ModalError,
  ProfilePreview,
  useHandleLookup,
  useInvitationSender,
} from './HandleLookup';

/**
 * FC209 F3 — invitación a Universo, solo para el MU (`muUniverse` no nulo; el servidor lo vuelve a
 * exigir: 403 SENDER_NOT_MASTER_OF_UNIVERSE). El destinatario se elige de los contactos o por @handle.
 */

export const UNIVERSE_INVITE_WARNING =
  'Al aceptar, el cosmonauta se incorporará a tu Universo como ARC y se establecerá automáticamente un contacto bilateral en Arcsial';

interface ContentProps {
  readonly universeLabel: string;
  readonly contacts: Contact[];
  readonly onClose: () => void;
  readonly onSent: () => void;
}

/** Elegir de la lista de contactos llena la misma tarjeta que la búsqueda. */
function ContactPicker({
  contacts,
  onPick,
}: {
  readonly contacts: Contact[];
  readonly onPick: (contact: Contact) => void;
}): React.JSX.Element | null {
  if (contacts.length === 0) return null;
  return (
    <ArchonSelect
      options={contacts.map((c, index) => ({
        value: String(index),
        label: `${c.displayName} (@${c.handle})`,
      }))}
      value=""
      onChange={(index): void => onPick(contacts[Number(index)])}
      placeholder="Elegir de mis contactos"
    />
  );
}

/** Cuerpo del modal — montado solo cuando está abierto. */
function InviteToUniverseContent(props: ContentProps): React.JSX.Element {
  const lookup = useHandleLookup();
  const sender = useInvitationSender('UNIVERSE', props.onSent);
  return (
    <ArchonModal
      isOpen
      onClose={props.onClose}
      maxWidth="max-w-lg"
      ariaLabel="Invitar a mi Universo"
    >
      <div className="space-y-4 p-8" data-testid="invite-universe-modal">
        <h3 className="flex items-center gap-2 text-xl font-bold text-[#0f2a44]">
          <Globe size={18} /> Invitar a {props.universeLabel}
        </h3>
        <ContactPicker contacts={props.contacts} onPick={lookup.setFound} />
        <HandleSearchField lookup={lookup} testId="invite-universe" />
        {lookup.found && <ProfilePreview profile={lookup.found} />}
        <p className="text-xs text-amber-700" data-testid="invite-universe-warning">
          {UNIVERSE_INVITE_WARNING}
        </p>
        <ModalError message={sender.error ?? lookup.error} testId="invite-universe" />
        <InviteModalActions
          canSend={!!lookup.found && !sender.sending}
          onClose={props.onClose}
          onSend={(): void => sender.send(lookup.found)}
          sendLabel="Enviar invitación"
          testId="invite-universe"
        />
      </div>
    </ArchonModal>
  );
}

/** Modal de Universo — `isOpen: false` ⇒ no monta nada. */
export default function InviteToUniverseModal({
  isOpen,
  ...props
}: ContentProps & { readonly isOpen: boolean }): React.JSX.Element | null {
  return isOpen ? <InviteToUniverseContent {...props} /> : null;
}
