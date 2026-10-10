import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  blockUser,
  fetchBlocks,
  fetchContacts,
  fetchOwnProfile,
  sendInvitation,
  updateOwnHandle,
} from './arcsialApi';
import ProfileContactsTab from './ProfileContactsTab';

/**
 * FC209 F3 — pestaña Contactos: handle propio editable con validación local, contactos con «Bloquear
 * Usuario» y confirmación, bloqueados, «Agregar contacto» y «Invitar a mi Universo» solo para el MU.
 */

vi.mock('./arcsialApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./arcsialApi')>()),
  fetchOwnProfile: vi.fn(),
  fetchContacts: vi.fn(),
  fetchBlocks: vi.fn(),
  updateOwnHandle: vi.fn(),
  blockUser: vi.fn(),
  lookupHandle: vi.fn(),
  sendInvitation: vi.fn(),
}));

const ARC = { id: 9, handle: 'ana', displayName: 'Ana', avatarUrl: null, muUniverse: null };
const MU = { ...ARC, id: 3, handle: 'mu_norte', muUniverse: { id: 41, label: 'Flota Norte' } };
const LUIS = { id: 10, handle: 'luis', displayName: 'Luis', avatarUrl: null, createdAt: 'x' };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(fetchOwnProfile).mockResolvedValue(ARC);
  vi.mocked(fetchContacts).mockResolvedValue([LUIS]);
  vi.mocked(fetchBlocks).mockResolvedValue([]);
  vi.mocked(updateOwnHandle).mockResolvedValue(undefined);
  vi.mocked(blockUser).mockResolvedValue(undefined);
  vi.mocked(sendInvitation).mockResolvedValue(undefined);
});

describe('ProfileContactsTab', () => {
  it('handle propio, contactos y sin botón de Universo para un Arc', async () => {
    render(<ProfileContactsTab />);
    expect(await screen.findByTestId('own-handle')).toHaveTextContent('ana');
    expect(await screen.findByTestId('contacts-list')).toHaveTextContent('Luis');
    expect(screen.queryByTestId('open-invite-universe')).toBeNull();
    expect(screen.queryByTestId('blocked-list')).toBeNull();
  });

  it('editar handle: valida local, guarda normalizado y recarga; Cancelar descarta', async () => {
    render(<ProfileContactsTab />);
    fireEvent.click(await screen.findByTestId('own-handle-edit'));
    const input = screen.getByTestId('own-handle-input');
    expect(input).toHaveValue('ana');
    fireEvent.change(input, { target: { value: 'ana@piic.mx' } });
    fireEvent.click(screen.getByTestId('own-handle-save'));
    expect(screen.getByTestId('own-handle-error')).toHaveTextContent('solo admite minúsculas');
    expect(updateOwnHandle).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: ' @Ana_2 ' } });
    fireEvent.click(screen.getByTestId('own-handle-save'));
    await waitFor(() => expect(updateOwnHandle).toHaveBeenCalledWith('ana_2'));
    await waitFor(() => expect(fetchOwnProfile).toHaveBeenCalledTimes(2));
    expect(screen.queryByTestId('own-handle-input')).toBeNull();
    fireEvent.click(screen.getByTestId('own-handle-edit'));
    fireEvent.click(screen.getByText('Cancelar'));
    expect(screen.queryByTestId('own-handle-input')).toBeNull();
  });

  it('handle ocupado ⇒ el motivo del servidor', async () => {
    vi.mocked(updateOwnHandle).mockRejectedValue({
      response: { data: { code: 'HANDLE_ALREADY_TAKEN' } },
    });
    render(<ProfileContactsTab />);
    fireEvent.click(await screen.findByTestId('own-handle-edit'));
    fireEvent.change(screen.getByTestId('own-handle-input'), { target: { value: 'luis' } });
    fireEvent.click(screen.getByTestId('own-handle-save'));
    expect(await screen.findByTestId('own-handle-error')).toHaveTextContent('ya está en uso');
  });

  it('bloquear pide confirmación, bloquea y recarga; un error se muestra', async () => {
    render(<ProfileContactsTab />);
    fireEvent.click(await screen.findByTestId('contact-block-10'));
    expect(screen.getByTestId('block-confirm')).toHaveTextContent('¿Bloquear a @luis?');
    fireEvent.click(screen.getByText('Cancelar'));
    expect(screen.queryByTestId('block-confirm')).toBeNull();
    vi.mocked(blockUser).mockRejectedValueOnce({
      response: { data: { code: 'CANNOT_BLOCK_SELF' } },
    });
    fireEvent.click(screen.getByTestId('contact-block-10'));
    fireEvent.click(screen.getByTestId('block-confirm-submit'));
    expect(await screen.findByRole('alert')).toHaveTextContent('No puedes bloquearte');
    fireEvent.click(screen.getByTestId('block-confirm-submit'));
    await waitFor(() => expect(screen.queryByTestId('block-confirm')).toBeNull());
    expect(blockUser).toHaveBeenCalledWith(10);
    expect(fetchContacts).toHaveBeenCalledTimes(2);
  });

  it('MU: invita a su Universo; sin contactos y con bloqueados', async () => {
    vi.mocked(fetchOwnProfile).mockResolvedValue(MU);
    vi.mocked(fetchContacts).mockResolvedValue([]);
    vi.mocked(fetchBlocks).mockResolvedValue([
      { blockedId: 9, handle: 'ana', displayName: 'Ana', createdAt: 'x' },
      { blockedId: 11, handle: null, displayName: null, createdAt: 'x' },
    ]);
    render(<ProfileContactsTab />);
    fireEvent.click(await screen.findByTestId('open-invite-universe'));
    expect(screen.getByText('Invitar a Flota Norte')).toBeInTheDocument();
    expect(screen.getByTestId('contacts-empty')).toBeInTheDocument();
    expect(screen.getByTestId('blocked-list')).toHaveTextContent('Ana');
    fireEvent.click(screen.getByText('Cancelar'));
    expect(screen.queryByTestId('invite-universe-modal')).toBeNull();
  });

  it('Agregar contacto abre el modal; al enviar se cierra y recarga', async () => {
    const { lookupHandle } = await import('./arcsialApi');
    vi.mocked(lookupHandle).mockResolvedValue({
      id: 12,
      handle: 'eva',
      displayName: 'Eva',
      avatarUrl: null,
    });
    render(<ProfileContactsTab />);
    fireEvent.click(await screen.findByTestId('open-add-contact'));
    fireEvent.click(screen.getByText('Cancelar'));
    expect(screen.queryByTestId('add-contact-modal')).toBeNull();
    fireEvent.click(screen.getByTestId('open-add-contact'));
    fireEvent.change(screen.getByTestId('add-contact-input'), { target: { value: 'eva' } });
    fireEvent.click(screen.getByTestId('add-contact-search'));
    await screen.findByTestId('arcsial-profile-preview');
    fireEvent.click(screen.getByTestId('add-contact-send'));
    await waitFor(() => expect(screen.queryByTestId('add-contact-modal')).toBeNull());
    expect(fetchOwnProfile).toHaveBeenCalledTimes(2);
  });

  it('si las lecturas fallan, explica el motivo y muestra una raya en el handle', async () => {
    vi.mocked(fetchOwnProfile).mockRejectedValue(new Error('red'));
    render(<ProfileContactsTab />);
    expect(await screen.findByTestId('contacts-error')).toHaveTextContent('No se pudo completar');
    expect(screen.getByTestId('own-handle')).toHaveTextContent('—');
    fireEvent.click(screen.getByTestId('own-handle-edit'));
    expect(screen.getByTestId('own-handle-input')).toHaveValue('');
  });
});
