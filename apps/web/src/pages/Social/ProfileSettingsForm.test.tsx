import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  ActorView as Actor,
  fetchActor,
  updateActorHandle,
  updateActorProfile,
} from './arcsialCoreApi';
import ProfileSettingsForm from './ProfileSettingsForm';

/**
 * FC210 F3 — formulario unificado del perfil: nombre, biografía, avatar https, visibilidad en búsquedas
 * y handle. La presentación siempre se guarda; el handle solo si cambió.
 */

vi.mock('./arcsialCoreApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./arcsialCoreApi')>()),
  fetchActor: vi.fn(),
  updateActorProfile: vi.fn(),
  updateActorHandle: vi.fn(),
}));

const OWN: Actor = {
  id: 7,
  actorType: 'USER',
  handle: 'ana',
  displayName: 'Ana',
  avatarUrl: null,
  bio: null,
  followersCount: 0,
  followingCount: 0,
  isFollowedByMe: false,
  isContact: false,
  isSearchable: true,
};
const onSaved = vi.fn();

/** Cambia el valor de un campo del formulario. */
function fill(testId: string, value: string): void {
  fireEvent.change(screen.getByTestId(testId), { target: { value } });
}

/** Monta el formulario y espera a que cargue el actor propio. */
async function renderLoaded(): Promise<void> {
  render(<ProfileSettingsForm ownHandle="ana" onSaved={onSaved} />);
  await screen.findByTestId('settings-handle');
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(fetchActor).mockResolvedValue(OWN);
  vi.mocked(updateActorProfile).mockResolvedValue(undefined);
  vi.mocked(updateActorHandle).mockResolvedValue(undefined);
});

describe('ProfileSettingsForm', () => {
  it('carga el actor propio en el formulario; antes de cargar no se puede guardar', async () => {
    render(<ProfileSettingsForm ownHandle="ana" onSaved={onSaved} />);
    expect(screen.getByTestId('settings-save')).toBeDisabled();
    fireEvent.submit(screen.getByTestId('profile-settings'));
    expect(updateActorProfile).not.toHaveBeenCalled();
    expect(await screen.findByTestId('settings-handle')).toHaveValue('ana');
    expect(screen.getByTestId('settings-display-name')).toHaveValue('Ana');
    expect(screen.getByTestId('settings-bio')).toHaveValue('');
    expect(screen.getByTestId('settings-avatar')).toHaveValue('');
    expect(screen.getByTestId('settings-searchable')).toBeChecked();
    expect(fetchActor).toHaveBeenCalledWith('ana');
  });

  it('guarda la presentación sin tocar el handle si no cambió; vacíos van como null', async () => {
    await renderLoaded();
    fill('settings-display-name', '  Ana Pérez  ');
    fireEvent.click(screen.getByTestId('settings-searchable'));
    fireEvent.click(screen.getByTestId('settings-save'));
    expect(await screen.findByTestId('settings-saved')).toHaveTextContent('Perfil guardado');
    expect(updateActorProfile).toHaveBeenCalledWith({
      displayName: 'Ana Pérez',
      bio: null,
      avatarUrl: null,
      isSearchable: false,
    });
    expect(updateActorHandle).not.toHaveBeenCalled();
    expect(onSaved).toHaveBeenCalledTimes(1);
    fill('settings-bio', 'Otra');
    expect(screen.queryByTestId('settings-saved')).toBeNull();
  });

  it('con bio, avatar y handle nuevos: guarda la presentación y después el handle normalizado', async () => {
    vi.mocked(fetchActor).mockResolvedValue({
      ...OWN,
      bio: 'Hola',
      avatarUrl: 'https://cdn.example/a.png',
      isSearchable: undefined,
    });
    await renderLoaded();
    expect(screen.getByTestId('settings-bio')).toHaveValue('Hola');
    expect(screen.getByTestId('settings-searchable')).toBeChecked();
    fill('settings-bio', ' Flotillas ');
    fill('settings-avatar', ' https://cdn.example/b.png ');
    fill('settings-handle', ' @Ana_Mty ');
    fireEvent.click(screen.getByTestId('settings-save'));
    await waitFor(() => expect(updateActorHandle).toHaveBeenCalledWith('ana_mty'));
    expect(updateActorProfile).toHaveBeenCalledWith({
      displayName: 'Ana',
      bio: 'Flotillas',
      avatarUrl: 'https://cdn.example/b.png',
      isSearchable: true,
    });
    expect(vi.mocked(updateActorProfile).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(updateActorHandle).mock.invocationCallOrder[0]
    );
  });

  it.each([
    ['handle inválido', 'settings-handle', 'ana@piic.mx', 'minúsculas'],
    ['nombre vacío', 'settings-display-name', '   ', 'no puede quedar vacío'],
    ['avatar que no es https', 'settings-avatar', 'http://cdn.example/a.png', 'https'],
  ])('%s: se rechaza aquí, sin llamar al servidor', async (_case, testId, value, message) => {
    await renderLoaded();
    fill(testId, value);
    fireEvent.click(screen.getByTestId('settings-save'));
    expect(screen.getByTestId('settings-error')).toHaveTextContent(message);
    expect(updateActorProfile).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('handle reservado o tomado: muestra el motivo del servidor y no confirma', async () => {
    vi.mocked(updateActorHandle).mockRejectedValue({
      response: { data: { code: 'HANDLE_RESERVED' } },
    });
    await renderLoaded();
    fill('settings-handle', 'admin');
    fireEvent.click(screen.getByTestId('settings-save'));
    expect(await screen.findByTestId('settings-error')).toHaveTextContent('reservado');
    expect(screen.queryByTestId('settings-saved')).toBeNull();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('si el actor propio no carga deja el motivo y el formulario sin campos', async () => {
    vi.mocked(fetchActor).mockRejectedValue({ response: { data: { code: 'ACTOR_NOT_FOUND' } } });
    render(<ProfileSettingsForm ownHandle="ana" onSaved={onSaved} />);
    expect(await screen.findByTestId('settings-error')).toHaveTextContent(
      'No encontramos ese perfil'
    );
    expect(screen.queryByTestId('settings-handle')).toBeNull();
  });
});
