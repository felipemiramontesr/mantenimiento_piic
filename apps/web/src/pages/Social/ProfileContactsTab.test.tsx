import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  blockUser,
  fetchBlocks,
  fetchContacts,
  fetchOwnProfile,
  sendInvitation,
} from './arcsialApi';
import ProfileContactsTab from './ProfileContactsTab';

vi.mock('./ProfileSettingsForm', () => ({
  default: ({
    ownHandle,
    onSaved,
  }: {
    ownHandle: string;
    onSaved: () => void;
  }): React.JSX.Element => (
    <button type="button" data-testid="stub-settings-form" onClick={onSaved}>
      {ownHandle}
    </button>
  ),
}));

/**
 * FC209 F3 / FC210 F3 — pestaña Contactos: formulario del perfil propio (con su prueba aparte),
 * contactos con «Bloquear Usuario» y confirmación, bloqueados, «Agregar contacto» y «Invitar a mi
 * Universo» solo para el MU.
 */

const onProfileSaved = vi.fn();

vi.mock('./arcsialApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./arcsialApi')>()),
  fetchOwnProfile: vi.fn(),
  fetchContacts: vi.fn(),
  fetchBlocks: vi.fn(),
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
  vi.mocked(blockUser).mockResolvedValue(undefined);
  vi.mocked(sendInvitation).mockResolvedValue(undefined);
});

describe('ProfileContactsTab', () => {
  it('formulario del perfil con el handle propio, contactos y sin botón de Universo para un Arc', async () => {
    render(<ProfileContactsTab onProfileSaved={onProfileSaved} />);
    expect(await screen.findByTestId('stub-settings-form')).toHaveTextContent('ana');
    expect(await screen.findByTestId('contacts-list')).toHaveTextContent('Luis');
    expect(screen.queryByTestId('open-invite-universe')).toBeNull();
    expect(screen.queryByTestId('blocked-list')).toBeNull();
  });

  it('bloquear pide confirmación, bloquea y recarga; un error se muestra', async () => {
    render(<ProfileContactsTab onProfileSaved={onProfileSaved} />);
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
    render(<ProfileContactsTab onProfileSaved={onProfileSaved} />);
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
    render(<ProfileContactsTab onProfileSaved={onProfileSaved} />);
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

  it('guardar el perfil recarga las lecturas y avisa al contenedor', async () => {
    render(<ProfileContactsTab onProfileSaved={onProfileSaved} />);
    fireEvent.click(await screen.findByTestId('stub-settings-form'));
    await waitFor(() => expect(fetchOwnProfile).toHaveBeenCalledTimes(2));
    expect(onProfileSaved).toHaveBeenCalledTimes(1);
  });

  it('si las lecturas fallan, explica el motivo y no monta el formulario del perfil', async () => {
    vi.mocked(fetchOwnProfile).mockRejectedValue(new Error('red'));
    render(<ProfileContactsTab onProfileSaved={onProfileSaved} />);
    expect(await screen.findByTestId('contacts-error')).toHaveTextContent('No se pudo completar');
    expect(screen.queryByTestId('stub-settings-form')).toBeNull();
  });
});
