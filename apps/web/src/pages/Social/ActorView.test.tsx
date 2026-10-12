import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { sendInvitation } from './arcsialApi';
import {
  ActorView as Actor,
  createPost,
  fetchActor,
  fetchWall,
  followActor,
  unfollowActor,
} from './arcsialCoreApi';
import ActorView from './ActorView';

/**
 * FC210 F3 — perfil de actor: cabecera con contadores, «Seguir» / «Siguiendo», «Solicitar Contacto»
 * solo para personas que aún no son contacto, muro propio con caja de publicación.
 */

vi.mock('./arcsialApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./arcsialApi')>()),
  sendInvitation: vi.fn(),
}));
vi.mock('./arcsialCoreApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./arcsialCoreApi')>()),
  fetchActor: vi.fn(),
  fetchWall: vi.fn(),
  followActor: vi.fn(),
  unfollowActor: vi.fn(),
  createPost: vi.fn(),
}));

const ANA: Actor = {
  id: 7,
  actorType: 'USER',
  handle: 'ana',
  displayName: 'Ana Pérez',
  avatarUrl: null,
  bio: 'Flotillas en Monterrey',
  followersCount: 12,
  followingCount: 4,
  isFollowedByMe: false,
  isContact: false,
};
const UNIVERSE: Actor = {
  ...ANA,
  id: 8,
  actorType: 'UNIVERSE',
  handle: 'fms_41',
  displayName: 'Flota Norte',
  bio: null,
  followingCount: 0,
};
const onOpenActor = vi.fn();

/** Monta la vista de un actor visto por la sesión `luis`. */
function renderActor(handle: string, ownHandle: string | null = 'luis'): void {
  render(
    <ActorView handle={handle} ownHandle={ownHandle} muUniverse={null} onOpenActor={onOpenActor} />
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(fetchActor).mockResolvedValue(ANA);
  vi.mocked(fetchWall).mockResolvedValue({ posts: [], nextBeforeId: null });
  vi.mocked(followActor).mockResolvedValue(undefined);
  vi.mocked(unfollowActor).mockResolvedValue(undefined);
  vi.mocked(sendInvitation).mockResolvedValue(undefined);
  vi.mocked(createPost).mockResolvedValue(undefined);
});

describe('ActorView', () => {
  it('cabecera de una persona: nombre, handle, bio, contadores y su muro', async () => {
    renderActor('ana');
    const header = await screen.findByTestId('actor-header');
    expect(header).toHaveTextContent('Ana Pérez');
    expect(header).toHaveTextContent('@ana');
    expect(header).toHaveTextContent('Persona');
    expect(header).toHaveTextContent('Flotillas en Monterrey');
    expect(screen.getByTestId('actor-counters')).toHaveTextContent('12 seguidores');
    expect(screen.getByTestId('actor-counters')).toHaveTextContent('4 seguidos');
    expect(await screen.findByTestId('arcsial-posts-empty')).toBeInTheDocument();
    expect(fetchWall).toHaveBeenCalledWith('ana', null);
    expect(screen.queryByTestId('post-composer')).toBeNull();
  });

  it('«Seguir» sigue y recarga; ya seguido muestra «Siguiendo» y deja de seguir', async () => {
    renderActor('ana');
    const follow = await screen.findByTestId('actor-follow');
    expect(follow).toHaveTextContent('Seguir');
    expect(follow).toHaveAttribute('aria-pressed', 'false');
    vi.mocked(fetchActor).mockResolvedValue({ ...ANA, isFollowedByMe: true, followersCount: 13 });
    fireEvent.click(follow);
    await waitFor(() => expect(screen.getByTestId('actor-follow')).toHaveTextContent('Siguiendo'));
    expect(followActor).toHaveBeenCalledWith('ana');
    expect(screen.getByTestId('actor-counters')).toHaveTextContent('13 seguidores');
    vi.mocked(fetchActor).mockResolvedValue(ANA);
    fireEvent.click(screen.getByTestId('actor-follow'));
    await waitFor(() => expect(unfollowActor).toHaveBeenCalledWith('ana'));
    await waitFor(() => expect(screen.getByTestId('actor-follow')).toHaveTextContent('Seguir'));
  });

  it('«Solicitar Contacto» envía una invitación CONTACT y confirma', async () => {
    renderActor('ana');
    fireEvent.click(await screen.findByTestId('actor-request-contact'));
    expect(await screen.findByTestId('actor-notice')).toHaveTextContent('Solicitud de contacto');
    expect(sendInvitation).toHaveBeenCalledWith('ana', 'CONTACT');
  });

  it('un rechazo de la acción deja su motivo', async () => {
    vi.mocked(sendInvitation).mockRejectedValue({
      response: { data: { code: 'MAX_PENDING_INVITATIONS_EXCEEDED' } },
    });
    renderActor('ana');
    fireEvent.click(await screen.findByTestId('actor-request-contact'));
    expect(await screen.findByTestId('actor-error')).toHaveTextContent('invitaciones pendientes');
    expect(screen.queryByTestId('actor-notice')).toBeNull();
  });

  it('quien ya es contacto no ve «Solicitar Contacto»', async () => {
    vi.mocked(fetchActor).mockResolvedValue({ ...ANA, isContact: true });
    renderActor('ana');
    await screen.findByTestId('actor-follow');
    expect(screen.queryByTestId('actor-request-contact')).toBeNull();
  });

  it('un Universo se puede seguir pero no pedirle contacto; sin bio no hay párrafo', async () => {
    vi.mocked(fetchActor).mockResolvedValue({
      ...UNIVERSE,
      avatarUrl: 'https://cdn.example/logo.png',
    });
    renderActor('fms_41');
    const header = await screen.findByTestId('actor-header');
    expect(header).toHaveTextContent('Universo');
    expect(header.querySelector('img')).toHaveClass('h-16');
    expect(header).not.toHaveTextContent('Flotillas en Monterrey');
    expect(screen.getByTestId('actor-follow')).toBeInTheDocument();
    expect(screen.queryByTestId('actor-request-contact')).toBeNull();
  });

  it('perfil propio: sin botones de relación y con caja de publicación que recarga el muro', async () => {
    renderActor('ana', 'ana');
    await screen.findByTestId('actor-header');
    expect(screen.queryByTestId('actor-follow')).toBeNull();
    fireEvent.change(screen.getByTestId('composer-text'), { target: { value: 'Hola' } });
    fireEvent.click(screen.getByTestId('composer-submit'));
    await waitFor(() => expect(fetchWall).toHaveBeenCalledTimes(2));
    expect(createPost).toHaveBeenCalledTimes(1);
  });

  it('perfil inexistente o bloqueado: solo el motivo, sin cabecera ni muro', async () => {
    vi.mocked(fetchActor).mockRejectedValue({ response: { data: { code: 'ACTOR_NOT_FOUND' } } });
    renderActor('nadie');
    expect(await screen.findByTestId('actor-error')).toHaveTextContent('No encontramos ese perfil');
    expect(screen.queryByTestId('actor-header')).toBeNull();
    expect(screen.queryByTestId('arcsial-posts')).toBeNull();
  });
});
