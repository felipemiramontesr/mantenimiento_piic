/* eslint-disable */
// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../test/testUtils';
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
});
