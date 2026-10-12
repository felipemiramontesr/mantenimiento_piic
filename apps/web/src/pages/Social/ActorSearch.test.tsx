import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ActorCard, followActor, searchActors } from './arcsialCoreApi';
import ActorSearch from './ActorSearch';

/**
 * FC210 F3 — buscador por nombre: activación explícita (Enter o botón, nunca al teclear), rechazo local
 * de `@` y de textos cortos sin gastar cuota, homónimos distinguidos por @handle y «Seguir» rápido.
 */

vi.mock('./arcsialCoreApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./arcsialCoreApi')>()),
  searchActors: vi.fn(),
  followActor: vi.fn(),
}));

const HOMONYMS: ActorCard[] = [
  { handle: 'ana_mty', displayName: 'Ana Pérez', avatarUrl: null, actorType: 'USER' },
  { handle: 'ana_gdl', displayName: 'Ana Pérez', avatarUrl: null, actorType: 'USER' },
  { handle: 'fms_41', displayName: 'Ana Pérez Flotillas', avatarUrl: null, actorType: 'UNIVERSE' },
];
const onOpenActor = vi.fn();

/** Escribe en el campo de búsqueda. */
function type(text: string): HTMLElement {
  const input = screen.getByTestId('actor-search-input');
  fireEvent.change(input, { target: { value: text } });
  return input;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(searchActors).mockResolvedValue(HOMONYMS);
  vi.mocked(followActor).mockResolvedValue(undefined);
});

describe('ActorSearch', () => {
  it('teclear NO busca; Enter y el botón sí', async () => {
    render(<ActorSearch onOpenActor={onOpenActor} />);
    const input = type('Ana Pérez');
    fireEvent.keyDown(input, { key: 'a' });
    expect(searchActors).not.toHaveBeenCalled();
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(await screen.findByTestId('actor-search-results')).toHaveTextContent('3 resultado(s)');
    expect(searchActors).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTestId('actor-search-submit'));
    await waitFor(() => expect(searchActors).toHaveBeenCalledTimes(2));
    expect(searchActors).toHaveBeenLastCalledWith('Ana Pérez');
  });

  it('con arroba o con menos de 3 caracteres se rechaza aquí, sin consultar', () => {
    render(<ActorSearch onOpenActor={onOpenActor} />);
    type('ana@piic.mx');
    fireEvent.click(screen.getByTestId('actor-search-submit'));
    expect(screen.getByTestId('actor-search-error')).toHaveTextContent('no por correo');
    type('  an  ');
    fireEvent.click(screen.getByTestId('actor-search-submit'));
    expect(screen.getByTestId('actor-search-error')).toHaveTextContent('al menos 3');
    expect(searchActors).not.toHaveBeenCalled();
  });

  it('homónimos: cada uno con su @handle único y su tipo; abrir uno cierra la tarjeta', async () => {
    render(<ActorSearch onOpenActor={onOpenActor} />);
    type('Ana Pérez');
    fireEvent.click(screen.getByTestId('actor-search-submit'));
    const results = await screen.findByTestId('actor-search-results');
    expect(results).toHaveTextContent('@ana_mty');
    expect(results).toHaveTextContent('@ana_gdl');
    expect(results).toHaveTextContent('Universo');
    fireEvent.click(screen.getByTestId('search-open-ana_gdl'));
    expect(onOpenActor).toHaveBeenCalledWith('ana_gdl');
    expect(screen.queryByTestId('actor-search-results')).toBeNull();
  });

  it('«Seguir» rápido marca solo a ese resultado; un rechazo deja su motivo', async () => {
    render(<ActorSearch onOpenActor={onOpenActor} />);
    type('Ana Pérez');
    fireEvent.click(screen.getByTestId('actor-search-submit'));
    fireEvent.click(await screen.findByTestId('search-follow-ana_mty'));
    await waitFor(() => expect(screen.getByTestId('search-follow-ana_mty')).toBeDisabled());
    expect(screen.getByTestId('search-follow-ana_mty')).toHaveTextContent('Siguiendo');
    expect(screen.getByTestId('search-follow-ana_gdl')).toHaveTextContent('Seguir');
    expect(followActor).toHaveBeenCalledWith('ana_mty');
    vi.mocked(followActor).mockRejectedValueOnce({
      response: { data: { code: 'ALREADY_FOLLOWING' } },
    });
    fireEvent.click(screen.getByTestId('search-follow-ana_gdl'));
    expect(await screen.findByTestId('actor-search-error')).toHaveTextContent('Ya sigues');
  });

  it('sin resultados lo dice y se puede cerrar', async () => {
    vi.mocked(searchActors).mockResolvedValue([]);
    render(<ActorSearch onOpenActor={onOpenActor} />);
    type('Nadie');
    fireEvent.click(screen.getByTestId('actor-search-submit'));
    expect(await screen.findByTestId('actor-search-results')).toHaveTextContent('Sin resultados');
    fireEvent.click(screen.getByTestId('actor-search-close'));
    expect(screen.queryByTestId('actor-search-results')).toBeNull();
  });

  it('cuota agotada: muestra el aviso del servidor', async () => {
    vi.mocked(searchActors).mockRejectedValue({
      response: { data: { code: 'RATE_LIMIT_EXCEEDED' } },
    });
    render(<ActorSearch onOpenActor={onOpenActor} />);
    type('Ana Pérez');
    fireEvent.click(screen.getByTestId('actor-search-submit'));
    expect(await screen.findByTestId('actor-search-error')).toHaveTextContent(
      'límite de búsquedas'
    );
  });
});
