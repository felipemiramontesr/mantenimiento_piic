import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, renderHook, act, screen, fireEvent, waitFor } from '@testing-library/react';
import { lookupHandle, sendInvitation } from './arcsialApi';
import { useInvitationSender } from './HandleLookup';
import AddContactModal from './AddContactModal';
import InviteToUniverseModal, { UNIVERSE_INVITE_WARNING } from './InviteToUniverseModal';

/**
 * FC209 F3 — los dos modales de invitación: búsqueda por @handle exacto (validada antes de consultar),
 * tarjeta pública, envío del tipo correcto y mensajes del servidor. El de Universo además permite elegir
 * de los contactos y muestra la advertencia del FC.
 */

vi.mock('./arcsialApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./arcsialApi')>()),
  lookupHandle: vi.fn(),
  sendInvitation: vi.fn(),
}));

const ANA = { id: 9, handle: 'ana', displayName: 'Ana Pérez', avatarUrl: null };
const LUIS = {
  id: 10,
  handle: 'luis',
  displayName: 'Luis',
  avatarUrl: 'https://cdn/luis.png',
  createdAt: 'x',
};
const onClose = vi.fn();
const onSent = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(lookupHandle).mockResolvedValue(ANA);
  vi.mocked(sendInvitation).mockResolvedValue(undefined);
});

/** Escribe y busca un handle en el modal con ese prefijo de testid. */
async function search(prefix: string, value: string): Promise<void> {
  fireEvent.change(screen.getByTestId(`${prefix}-input`), { target: { value } });
  fireEvent.click(screen.getByTestId(`${prefix}-search`));
}

describe('AddContactModal', () => {
  it('cerrado no monta nada', () => {
    const { container } = render(
      <AddContactModal isOpen={false} onClose={onClose} onSent={onSent} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('busca @handle normalizado, muestra la tarjeta y envía CONTACT', async () => {
    render(<AddContactModal isOpen onClose={onClose} onSent={onSent} />);
    const send = screen.getByTestId('add-contact-send');
    expect(send).toBeDisabled();
    await search('add-contact', ' @Ana ');
    expect(await screen.findByTestId('arcsial-profile-preview')).toHaveTextContent('Ana Pérez');
    expect(lookupHandle).toHaveBeenCalledWith('ana');
    fireEvent.click(send);
    await waitFor(() => expect(onSent).toHaveBeenCalled());
    expect(sendInvitation).toHaveBeenCalledWith('ana', 'CONTACT');
  });

  it('un correo no se consulta: aviso local', async () => {
    render(<AddContactModal isOpen onClose={onClose} onSent={onSent} />);
    await search('add-contact', 'ana@piic.mx');
    expect(screen.getByTestId('add-contact-error')).toHaveTextContent('solo admite minúsculas');
    expect(lookupHandle).not.toHaveBeenCalled();
  });

  it('Enter busca; un 404 se explica y al editar se limpia', async () => {
    vi.mocked(lookupHandle).mockRejectedValue({ response: { data: { code: 'USER_NOT_FOUND' } } });
    render(<AddContactModal isOpen onClose={onClose} onSent={onSent} />);
    const input = screen.getByTestId('add-contact-input');
    fireEvent.change(input, { target: { value: 'nadie' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(await screen.findByTestId('add-contact-error')).toHaveTextContent('No encontramos');
    fireEvent.keyDown(input, { key: 'a' });
    fireEvent.change(input, { target: { value: 'nadie2' } });
    expect(screen.queryByTestId('add-contact-error')).toBeNull();
  });

  it('error del envío se muestra y no cierra; Cancelar cierra', async () => {
    vi.mocked(sendInvitation).mockRejectedValue({
      response: { data: { code: 'ALREADY_CONTACTS' } },
    });
    render(<AddContactModal isOpen onClose={onClose} onSent={onSent} />);
    await search('add-contact', 'ana');
    await screen.findByTestId('arcsial-profile-preview');
    fireEvent.click(screen.getByTestId('add-contact-send'));
    expect(await screen.findByTestId('add-contact-error')).toHaveTextContent('Ya son contactos');
    expect(onSent).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('Cancelar'));
    expect(onClose).toHaveBeenCalled();
  });
});

describe('useInvitationSender', () => {
  it('sin destinatario no envía nada', () => {
    const { result } = renderHook(() => useInvitationSender('CONTACT', onSent));
    act(() => result.current.send(null));
    expect(sendInvitation).not.toHaveBeenCalled();
    expect(result.current.sending).toBe(false);
  });
});

describe('InviteToUniverseModal', () => {
  /** Abre el modal del MU con sus contactos. */
  function open(contacts = [LUIS]): void {
    render(
      <InviteToUniverseModal
        isOpen
        universeLabel="Flota Norte"
        contacts={contacts}
        onClose={onClose}
        onSent={onSent}
      />
    );
  }

  it('cerrado no monta nada', () => {
    const { container } = render(
      <InviteToUniverseModal
        isOpen={false}
        universeLabel="x"
        contacts={[]}
        onClose={onClose}
        onSent={onSent}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('muestra el Universo y la advertencia del FC; elegir un contacto y enviar UNIVERSE', async () => {
    open();
    expect(screen.getByText('Invitar a Flota Norte')).toBeInTheDocument();
    expect(screen.getByTestId('invite-universe-warning')).toHaveTextContent(
      UNIVERSE_INVITE_WARNING
    );
    fireEvent.click(screen.getByText('Elegir de mis contactos'));
    fireEvent.click(screen.getByText('Luis (@luis)'));
    expect(screen.getByTestId('arcsial-profile-preview')).toHaveTextContent('@luis');
    // Avatar decorativo (alt vacío): el nombre ya está al lado.
    expect(screen.getByTestId('arcsial-profile-preview').querySelector('img')).toHaveAttribute(
      'src',
      'https://cdn/luis.png'
    );
    fireEvent.click(screen.getByTestId('invite-universe-send'));
    await waitFor(() => expect(onSent).toHaveBeenCalled());
    expect(sendInvitation).toHaveBeenCalledWith('luis', 'UNIVERSE');
  });

  it('sin contactos no hay selector; por @handle y error de puerta del servidor', async () => {
    vi.mocked(sendInvitation).mockRejectedValue({
      response: { data: { code: 'LINKED_USER_ALREADY_MEMBER' } },
    });
    open([]);
    expect(screen.queryByText('Elegir de mis contactos')).toBeNull();
    await search('invite-universe', 'ana');
    await screen.findByTestId('arcsial-profile-preview');
    fireEvent.click(screen.getByTestId('invite-universe-send'));
    expect(await screen.findByTestId('invite-universe-error')).toHaveTextContent(
      'ya pertenece a un Universo'
    );
  });
});
