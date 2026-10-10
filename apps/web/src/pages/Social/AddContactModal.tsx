import React from 'react';
import { UserPlus } from 'lucide-react';
import ArchonModal from '../../components/UI/ArchonModal';
import {
  HandleSearchField,
  InviteModalActions,
  ModalError,
  ProfilePreview,
  useHandleLookup,
  useInvitationSender,
} from './HandleLookup';

/**
 * FC209 F3 — solicitud de contacto: búsqueda por @handle exacto, tarjeta pública de la coincidencia y
 * «Enviar Solicitud de Contacto» (invitación CONTACT). El servidor repite todas las puertas de T1.
 */

interface ContentProps {
  readonly onClose: () => void;
  readonly onSent: () => void;
}

/** Cuerpo del modal — montado solo cuando está abierto. */
function AddContactContent({ onClose, onSent }: ContentProps): React.JSX.Element {
  const lookup = useHandleLookup();
  const sender = useInvitationSender('CONTACT', onSent);
  return (
    <ArchonModal isOpen onClose={onClose} maxWidth="max-w-lg" ariaLabel="Agregar contacto">
      <div className="space-y-4 p-8" data-testid="add-contact-modal">
        <h3 className="flex items-center gap-2 text-xl font-bold text-[#0f2a44]">
          <UserPlus size={18} /> Agregar contacto
        </h3>
        <HandleSearchField lookup={lookup} testId="add-contact" />
        {lookup.found && <ProfilePreview profile={lookup.found} />}
        <ModalError message={sender.error ?? lookup.error} testId="add-contact" />
        <InviteModalActions
          canSend={!!lookup.found && !sender.sending}
          onClose={onClose}
          onSend={(): void => sender.send(lookup.found)}
          sendLabel="Enviar Solicitud de Contacto"
          testId="add-contact"
        />
      </div>
    </ArchonModal>
  );
}

/** Modal de contacto — `isOpen: false` ⇒ no monta nada. */
export default function AddContactModal({
  isOpen,
  onClose,
  onSent,
}: ContentProps & { readonly isOpen: boolean }): React.JSX.Element | null {
  return isOpen ? <AddContactContent onClose={onClose} onSent={onSent} /> : null;
}
