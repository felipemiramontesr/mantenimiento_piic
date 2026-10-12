import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { createPost, fetchFeed } from './arcsialCoreApi';
import FeedTab from './FeedTab';

/** FC210 F3 — pestaña Feed: caja de publicación y feed; publicar recarga la primera página. */

vi.mock('./arcsialCoreApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./arcsialCoreApi')>()),
  fetchFeed: vi.fn(),
  createPost: vi.fn(),
}));

const onOpenActor = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(fetchFeed).mockResolvedValue({ posts: [], nextBeforeId: null });
  vi.mocked(createPost).mockResolvedValue(undefined);
});

describe('FeedTab', () => {
  it('feed vacío: invita a seguir a alguien; el MU ve el selector de autoría', async () => {
    render(<FeedTab muUniverse={{ id: 41, label: 'Flota Norte' }} onOpenActor={onOpenActor} />);
    expect(await screen.findByTestId('arcsial-posts-empty')).toHaveTextContent('Sigue a personas');
    expect(screen.getByTestId('composer-authorship')).toBeInTheDocument();
    expect(fetchFeed).toHaveBeenCalledWith(null);
  });

  it('publicar recarga el feed y abrir al autor de una publicación avisa al contenedor', async () => {
    const post = {
      id: 9,
      contentText: 'Hola',
      imageUrls: [],
      visibility: 'PUBLIC' as const,
      createdAt: new Date().toISOString(),
      author: { handle: 'ana', displayName: 'Ana', avatarUrl: null, actorType: 'USER' as const },
      canDelete: false,
    };
    vi.mocked(fetchFeed).mockResolvedValue({ posts: [post], nextBeforeId: null });
    render(<FeedTab muUniverse={null} onOpenActor={onOpenActor} />);
    fireEvent.click(await screen.findByTestId('post-author-9'));
    expect(onOpenActor).toHaveBeenCalledWith('ana');
    fireEvent.change(screen.getByTestId('composer-text'), { target: { value: 'Nuevo' } });
    fireEvent.click(screen.getByTestId('composer-submit'));
    await waitFor(() => expect(fetchFeed).toHaveBeenCalledTimes(2));
    expect(createPost).toHaveBeenCalledTimes(1);
  });
});
