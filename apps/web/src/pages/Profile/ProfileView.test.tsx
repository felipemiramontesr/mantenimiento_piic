import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, renderWithRoute, screen, fireEvent, waitFor } from '../../test/testUtils';
import { fetchOwnProfile } from '../Social/arcsialApi';
import ProfileView from './ProfileView';

/**
 * FC210 F3 — Arcsial sobre una sola ruta (`/dashboard/social`, la única del Arc itinerante): pestañas
 * Feed, Muro Propio, Contactos e Invitaciones; buscador arriba; perfil de un actor con `?handle=`.
 * El muro legado ya no se muestra (D10). Cada pieza tiene su propia prueba.
 */

vi.mock('../Social/arcsialApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../Social/arcsialApi')>()),
  fetchOwnProfile: vi.fn(),
}));

type OpenActor = { onOpenActor: (handle: string) => void };

vi.mock('../Social/ActorSearch', () => ({
  default: ({ onOpenActor }: OpenActor): React.JSX.Element => (
    <button type="button" data-testid="stub-search" onClick={(): void => onOpenActor('ana')}>
      buscar
    </button>
  ),
}));
vi.mock('../Social/FeedTab', () => ({
  default: ({
    muUniverse,
    onOpenActor,
  }: OpenActor & { muUniverse: { label: string } | null }): React.JSX.Element => (
    <button type="button" data-testid="stub-feed" onClick={(): void => onOpenActor('fms_41')}>
      feed:{muUniverse?.label ?? 'sin-universo'}
    </button>
  ),
}));
vi.mock('../Social/ActorView', () => ({
  default: (props: OpenActor & { handle: string; ownHandle: string | null }): React.JSX.Element => (
    <button type="button" data-testid="stub-actor" onClick={(): void => props.onOpenActor('luis')}>
      actor:{props.handle}:propio:{props.ownHandle ?? 'cargando'}
    </button>
  ),
}));
vi.mock('../Social/ProfileContactsTab', () => ({
  default: ({ onProfileSaved }: { onProfileSaved: () => void }): React.JSX.Element => (
    <button type="button" data-testid="stub-contacts" onClick={onProfileSaved}>
      contactos
    </button>
  ),
}));
vi.mock('../Social/InvitationsInbox', () => ({
  default: (): React.JSX.Element => <div data-testid="stub-invitations" />,
}));
vi.mock('./ProfileEditSlideOver', () => ({
  default: (props: { isOpen: boolean; onClose: () => void }): React.JSX.Element | null =>
    props.isOpen ? (
      <button type="button" data-testid="stub-edit" onClick={props.onClose}>
        cerrar
      </button>
    ) : null,
}));

const MU = {
  id: 3,
  handle: 'mu_norte',
  displayName: 'Mu',
  avatarUrl: null,
  muUniverse: { id: 41, label: 'Flota Norte' },
};

/** Una carga que nunca termina. */
function pending(): Promise<never> {
  return new Promise(() => {
    /* sin resolver */
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(fetchOwnProfile).mockResolvedValue(MU);
});

describe('ProfileView — Arcsial', () => {
  it('abre en el Feed, con el Universo del MU, y recorre las cuatro pestañas', async () => {
    render(<ProfileView />);
    expect(screen.getByTestId('layout-title')).toHaveTextContent('Arcsial');
    expect(screen.getByTestId('arcsial-tab-feed')).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByText('feed:Flota Norte')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('arcsial-tab-wall'));
    expect(screen.getByTestId('stub-actor')).toHaveTextContent('actor:mu_norte:propio:mu_norte');
    fireEvent.click(screen.getByTestId('arcsial-tab-contacts'));
    expect(screen.getByTestId('stub-contacts')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('arcsial-tab-invitations'));
    expect(screen.getByTestId('stub-invitations')).toBeInTheDocument();
    expect(screen.queryByTestId('stub-contacts')).toBeNull();
    expect(screen.queryByText('Muro Social')).toBeNull();
  });

  it('mientras carga el perfil propio: Feed sin Universo y Muro Propio en espera', async () => {
    vi.mocked(fetchOwnProfile).mockReturnValue(pending());
    render(<ProfileView />);
    expect(screen.getByTestId('stub-feed')).toHaveTextContent('feed:sin-universo');
    fireEvent.click(screen.getByTestId('arcsial-tab-wall'));
    expect(screen.getByTestId('own-wall-loading')).toBeInTheDocument();
  });

  it('si el perfil propio no carga, la pantalla sigue en pie', async () => {
    vi.mocked(fetchOwnProfile).mockRejectedValue(new Error('red'));
    render(<ProfileView />);
    await waitFor(() => expect(fetchOwnProfile).toHaveBeenCalled());
    expect(screen.getByTestId('stub-feed')).toHaveTextContent('feed:sin-universo');
  });

  it('abrir un actor desde el buscador o el feed lo muestra en la misma ruta; «Volver» regresa', async () => {
    render(<ProfileView />);
    await screen.findByText('feed:Flota Norte');
    fireEvent.click(screen.getByTestId('stub-search'));
    expect(screen.getByTestId('stub-actor')).toHaveTextContent('actor:ana:propio:mu_norte');
    expect(screen.queryByRole('tablist')).toBeNull();
    fireEvent.click(screen.getByTestId('stub-actor'));
    expect(screen.getByTestId('stub-actor')).toHaveTextContent('actor:luis:');
    fireEvent.click(screen.getByTestId('actor-back'));
    expect(screen.getByRole('tablist')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('stub-feed'));
    expect(screen.getByTestId('stub-actor')).toHaveTextContent('actor:fms_41:');
  });

  it('`?handle=` abre el perfil directo; antes de cargar el propio va sin handle propio', () => {
    vi.mocked(fetchOwnProfile).mockReturnValue(pending());
    renderWithRoute(<ProfileView />, '/dashboard/social?handle=ana');
    expect(screen.getByTestId('stub-actor')).toHaveTextContent('actor:ana:propio:cargando');
  });

  it('un `?handle=` fuera del patrón se ignora y quedan las pestañas', () => {
    renderWithRoute(<ProfileView />, '/dashboard/social?handle=ana%40piic.mx');
    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(screen.queryByTestId('stub-actor')).toBeNull();
  });

  it('guardar el perfil en Contactos recarga el perfil propio', async () => {
    render(<ProfileView />);
    await screen.findByText('feed:Flota Norte');
    fireEvent.click(screen.getByTestId('arcsial-tab-contacts'));
    fireEvent.click(screen.getByTestId('stub-contacts'));
    await waitFor(() => expect(fetchOwnProfile).toHaveBeenCalledTimes(2));
  });

  it('«Editar perfil» abre y cierra el panel de la cuenta', () => {
    render(<ProfileView />);
    expect(screen.queryByTestId('stub-edit')).toBeNull();
    fireEvent.click(screen.getByTestId('profile-edit-btn'));
    fireEvent.click(screen.getByTestId('stub-edit'));
    expect(screen.queryByTestId('stub-edit')).toBeNull();
  });
});
