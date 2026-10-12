import React, { useCallback } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ArcsialPost, deletePost, PostPage } from './arcsialCoreApi';
import ArcsialPostList from './ArcsialPostList';
import usePostPages from './usePostPages';

/**
 * FC210 F3 — lista paginada de publicaciones: carga, vacío, tarjeta (autor, tipo, visibilidad,
 * imágenes), «Cargar más» con el cursor del servidor, borrado y errores.
 */

vi.mock('./arcsialCoreApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./arcsialCoreApi')>()),
  deletePost: vi.fn(),
}));

const fetchPage = vi.fn<(beforeId: number | null) => Promise<PostPage>>();
const onOpenActor = vi.fn();

/** Publicación de prueba. */
function post(id: number, overrides: Partial<ArcsialPost> = {}): ArcsialPost {
  return {
    id,
    contentText: `Texto ${id}`,
    imageUrls: [],
    visibility: 'PUBLIC',
    createdAt: new Date().toISOString(),
    author: { handle: 'ana', displayName: 'Ana', avatarUrl: null, actorType: 'USER' },
    canDelete: false,
    ...overrides,
  };
}

/** Monta la lista con el hook real sobre el `fetchPage` simulado. */
function Harness(): React.JSX.Element {
  const stable = useCallback((beforeId: number | null) => fetchPage(beforeId), []);
  const pages = usePostPages(stable);
  return (
    <>
      <button type="button" onClick={pages.reload} data-testid="harness-reload">
        recargar
      </button>
      <ArcsialPostList pages={pages} emptyText="Nada por aquí" onOpenActor={onOpenActor} />
    </>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(deletePost).mockResolvedValue(undefined);
});

describe('ArcsialPostList', () => {
  it('muestra la carga y luego el estado vacío', async () => {
    fetchPage.mockResolvedValue({ posts: [], nextBeforeId: null });
    render(<Harness />);
    expect(screen.getByTestId('arcsial-posts-loading')).toBeInTheDocument();
    expect(await screen.findByTestId('arcsial-posts-empty')).toHaveTextContent('Nada por aquí');
    expect(screen.queryByTestId('arcsial-posts-more')).toBeNull();
    expect(fetchPage).toHaveBeenCalledWith(null);
  });

  it('tarjeta: autor, insignia de tipo, visibilidad, imágenes y sin borrar si no corresponde', async () => {
    const universe = post(2, {
      visibility: 'FOLLOWERS',
      imageUrls: ['https://cdn.example/a.png', 'https://cdn.example/b.png'],
      author: {
        handle: 'fms_41',
        displayName: 'Flota Norte',
        avatarUrl: 'https://cdn.example/logo.png',
        actorType: 'UNIVERSE',
      },
    });
    fetchPage.mockResolvedValue({
      posts: [universe, post(1, { visibility: 'CONTACTS' })],
      nextBeforeId: null,
    });
    render(<Harness />);
    const card = await screen.findByTestId('arcsial-post-2');
    expect(card).toHaveTextContent('Flota Norte');
    expect(card).toHaveTextContent('@fms_41');
    expect(card).toHaveTextContent('Universo');
    expect(card).toHaveTextContent('Seguidores');
    expect(card.querySelector('img[src="https://cdn.example/logo.png"]')).not.toBeNull();
    expect(screen.getByTestId('post-images-2').querySelectorAll('img')).toHaveLength(2);
    const person = screen.getByTestId('arcsial-post-1');
    expect(person).toHaveTextContent('Persona');
    expect(person).toHaveTextContent('Contactos');
    expect(screen.queryByTestId('post-images-1')).toBeNull();
    expect(screen.queryByTestId('post-delete-1')).toBeNull();
  });

  it('pulsar el autor abre su perfil', async () => {
    fetchPage.mockResolvedValue({ posts: [post(1)], nextBeforeId: null });
    render(<Harness />);
    fireEvent.click(await screen.findByTestId('post-author-1'));
    expect(onOpenActor).toHaveBeenCalledWith('ana');
  });

  it('«Cargar más» pide con el cursor y agrega al final; recargar vuelve a la primera página', async () => {
    fetchPage
      .mockResolvedValueOnce({ posts: [post(9), post(8)], nextBeforeId: 8 })
      .mockResolvedValueOnce({ posts: [post(7)], nextBeforeId: null })
      .mockResolvedValueOnce({ posts: [post(10)], nextBeforeId: null });
    render(<Harness />);
    fireEvent.click(await screen.findByTestId('arcsial-posts-more'));
    expect(await screen.findByTestId('arcsial-post-7')).toBeInTheDocument();
    expect(fetchPage).toHaveBeenLastCalledWith(8);
    expect(screen.getByTestId('arcsial-post-9')).toBeInTheDocument();
    expect(screen.queryByTestId('arcsial-posts-more')).toBeNull();
    fireEvent.click(screen.getByTestId('harness-reload'));
    expect(await screen.findByTestId('arcsial-post-10')).toBeInTheDocument();
    expect(screen.queryByTestId('arcsial-post-9')).toBeNull();
  });

  it('borrar retira la tarjeta al confirmarse; si falla deja el motivo y la tarjeta', async () => {
    fetchPage.mockResolvedValue({
      posts: [post(2, { canDelete: true }), post(1, { canDelete: true })],
      nextBeforeId: null,
    });
    render(<Harness />);
    fireEvent.click(await screen.findByTestId('post-delete-2'));
    await waitFor(() => expect(screen.queryByTestId('arcsial-post-2')).toBeNull());
    expect(deletePost).toHaveBeenCalledWith(2);
    vi.mocked(deletePost).mockRejectedValueOnce({
      response: { data: { code: 'FORBIDDEN_POST_DELETE' } },
    });
    fireEvent.click(screen.getByTestId('post-delete-1'));
    expect(await screen.findByTestId('arcsial-posts-error')).toHaveTextContent('Solo quien');
    expect(screen.getByTestId('arcsial-post-1')).toBeInTheDocument();
  });

  it('si la carga falla muestra el motivo', async () => {
    fetchPage.mockRejectedValue({ response: { data: { code: 'ACTOR_NOT_FOUND' } } });
    render(<Harness />);
    expect(await screen.findByTestId('arcsial-posts-error')).toHaveTextContent(
      'No encontramos ese perfil'
    );
    expect(screen.getByTestId('arcsial-posts-empty')).toBeInTheDocument();
  });
});
