/* eslint-disable */
// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '../../test/testUtils';
import ProfileView from './ProfileView';
import api from '../../api/client';

/**
 * FC-9 SocialNetwork_Multiverso FaseA — ProfileView (muro social)
 *
 * AT-SOC9-A-WEB-1: renders profile-view container y post-create-form
 * AT-SOC9-A-WEB-2: muestra post-card-{id} cuando la API retorna posts
 * AT-SOC9-A-WEB-3: muestra profile-posts-empty cuando la lista está vacía
 * AT-SOC9-A-WEB-4: muestra profile-error cuando la API falla
 */

vi.mock('../../api/client');
const mockGet = vi.mocked(api.get);

const MOCK_POSTS = [
  {
    id: 1,
    authorId: 2,
    ownerId: 5,
    contentText: 'Inspección completada sin novedades.',
    imageUrls: [],
    createdAt: '2026-06-01T10:00:00Z',
    updatedAt: '2026-06-01T10:00:00Z',
  },
];

describe('ProfileView — FC-9 SocialNetwork FaseA', () => {
  beforeEach(() => vi.clearAllMocks());

  it('AT-SOC9-A-WEB-1: renders container y post-create-form', async () => {
    mockGet.mockResolvedValueOnce({ data: { posts: [] } });
    render(<ProfileView />);
    expect(screen.getByTestId('profile-view')).toBeInTheDocument();
    expect(screen.getByTestId('post-create-form')).toBeInTheDocument();
  });

  it('AT-SOC9-A-WEB-2: muestra post-card cuando la API retorna posts', async () => {
    mockGet.mockResolvedValueOnce({ data: { posts: MOCK_POSTS } });
    render(<ProfileView />);
    await waitFor(() => {
      expect(screen.getByTestId('post-card-1')).toBeInTheDocument();
    });
    expect(screen.getByText('Inspección completada sin novedades.')).toBeInTheDocument();
  });

  it('AT-SOC9-A-WEB-3: muestra profile-posts-empty cuando lista vacía', async () => {
    mockGet.mockResolvedValueOnce({ data: { posts: [] } });
    render(<ProfileView />);
    await waitFor(() => {
      expect(screen.getByTestId('profile-posts-empty')).toBeInTheDocument();
    });
  });

  it('AT-SOC9-A-WEB-4: muestra profile-error cuando la API falla', async () => {
    mockGet.mockRejectedValueOnce(new Error('Network Error'));
    render(<ProfileView />);
    await waitFor(() => {
      expect(screen.getByTestId('profile-error')).toBeInTheDocument();
    });
  });

  // ── R4-C Fc162 — Sonar unc lines 34-39,42-43,46-47,66,75,88,101,163,166,176 ──
  it('AT-SOC9-A-WEB-5: escribe y publica un post exitosamente (handleSubmit + createPost)', async () => {
    mockGet.mockResolvedValue({ data: { posts: [] } });
    const mockPost = vi.mocked(api.post);
    mockPost.mockResolvedValueOnce({ data: {} });
    render(<ProfileView />);
    await waitFor(() => expect(screen.getByTestId('profile-posts-empty')).toBeInTheDocument());

    const textarea = screen.getByTestId('post-content-input');
    fireEvent.change(textarea, { target: { value: 'Nueva actualización del taller' } });
    fireEvent.submit(screen.getByTestId('post-create-form'));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/social/posts', {
        contentText: 'Nueva actualización del taller',
        imageUrls: undefined,
      });
    });
    expect(textarea.value).toBe('');
  });

  it('AT-SOC9-A-WEB-6: muestra post-create-error cuando createPost falla con un error de API', async () => {
    mockGet.mockResolvedValue({ data: { posts: [] } });
    const mockPost = vi.mocked(api.post);
    mockPost.mockImplementation((url) => {
      if (url === '/social/posts') {
        return Promise.reject({ response: { data: { error: 'Fallo en el servidor' } } });
      }
      return Promise.resolve({ data: { success: false } });
    });
    render(<ProfileView />);
    await waitFor(() => expect(screen.getByTestId('profile-posts-empty')).toBeInTheDocument());

    fireEvent.change(screen.getByTestId('post-content-input'), {
      target: { value: 'Un intento que fallará' },
    });
    fireEvent.submit(screen.getByTestId('post-create-form'));

    await waitFor(() => {
      expect(screen.getByTestId('post-create-error')).toHaveTextContent('Fallo en el servidor');
    });
  });

  it('AT-SOC9-A-WEB-7: el botón Actualizar vuelve a invocar refresh()', async () => {
    mockGet.mockResolvedValue({ data: { posts: [] } });
    render(<ProfileView />);
    await waitFor(() => expect(screen.getByTestId('profile-posts-empty')).toBeInTheDocument());

    expect(mockGet).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTestId('profile-refresh-btn'));
    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(2));
  });

  it('AT-SOC9-A-WEB-8: el botón Editar perfil abre el slide-over y su botón cerrar lo cierra', async () => {
    mockGet.mockResolvedValue({ data: { posts: [] } });
    render(<ProfileView />);
    await waitFor(() => expect(screen.getByTestId('profile-posts-empty')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('profile-edit-btn'));
    expect(await screen.findByTestId('profile-edit-slideover')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('profile-edit-close'));
    await waitFor(() => {
      expect(screen.queryByTestId('profile-edit-slideover')).not.toBeInTheDocument();
    });
  });

  it('AT-SOC9-A-WEB-9: reaccionar a un post invoca addReaction vía el ReactionBar', async () => {
    mockGet.mockResolvedValueOnce({ data: { posts: MOCK_POSTS } });
    const mockPost = vi.mocked(api.post);
    mockPost.mockResolvedValue({ data: {} });
    render(<ProfileView />);
    await waitFor(() => expect(screen.getByTestId('post-card-1')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('reaction-btn-impecable'));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/social/posts/1/reactions', { type: 'IMPECABLE' });
    });
  });

  it('AT-SOC9-A-WEB-10: el dueño de un post ve el botón eliminar y al hacer clic invoca deletePost', async () => {
    mockGet.mockResolvedValueOnce({ data: { posts: MOCK_POSTS } });
    const mockPost = vi.mocked(api.post);
    mockPost.mockResolvedValueOnce({
      data: { success: true, token: 'tok', user: { id: 2, username: 'juan' } },
    });
    const mockDelete = vi.mocked(api.delete);
    mockDelete.mockResolvedValueOnce({ data: {} });

    render(<ProfileView />);
    await waitFor(() => expect(screen.getByTestId('post-delete-1')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('post-delete-1'));

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith('/social/posts/1');
    });
  });
});
