/* eslint-disable */
// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '../../test/testUtils';
import PostCard from './PostCard';
import type { SocialPost, SocialComment } from '../../hooks/useSocialPosts';

/**
 * FC-9 SocialNetwork_Multiverso FaseB — PostCard (reacciones + hilos)
 *
 * AT-SOC9-B-WEB-1: renderiza contenido y fecha del post
 * AT-SOC9-B-WEB-2: renderiza reaction-bar con 4 botones
 * AT-SOC9-B-WEB-3: muestra botón de borrar solo cuando isOwner=true
 * AT-SOC9-B-WEB-4: toggle de comments muestra CommentThread
 */

const MOCK_POST: SocialPost = {
  id: 42,
  authorId: 7,
  ownerId: 3,
  contentText: 'Trabajo de calidad clase mundial.',
  imageUrls: [],
  createdAt: '2026-06-20T08:00:00Z',
  updatedAt: '2026-06-20T08:00:00Z',
};

const MOCK_COMMENTS: SocialComment[] = [
  {
    id: 1,
    postId: 42,
    authorId: 5,
    parentCommentId: null,
    contentText: 'Excelente resultado.',
    createdAt: '2026-06-20T09:00:00Z',
  },
];

const mockOnDelete = vi.fn();
const mockOnReact = vi.fn();
const mockFetchComments = vi.fn();
const mockAddComment = vi.fn();

const defaultProps = {
  post: MOCK_POST,
  isOwner: false,
  onDelete: mockOnDelete,
  onReact: mockOnReact,
  fetchComments: mockFetchComments,
  addComment: mockAddComment,
};

describe('PostCard — FC-9 SocialNetwork FaseB', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchComments.mockResolvedValue(MOCK_COMMENTS);
    mockAddComment.mockResolvedValue(undefined);
  });

  it('AT-SOC9-B-WEB-1: renderiza contenido y fecha del post', () => {
    render(<PostCard {...defaultProps} />);
    expect(screen.getByTestId('post-card-42')).toBeInTheDocument();
    expect(screen.getByText('Trabajo de calidad clase mundial.')).toBeInTheDocument();
  });

  it('AT-SOC9-B-WEB-2: renderiza reaction-bar con los 4 botones', () => {
    render(<PostCard {...defaultProps} />);
    expect(screen.getByTestId('reaction-bar')).toBeInTheDocument();
    expect(screen.getByTestId('reaction-btn-impecable')).toBeInTheDocument();
    expect(screen.getByTestId('reaction-btn-veloz')).toBeInTheDocument();
    expect(screen.getByTestId('reaction-btn-transparente')).toBeInTheDocument();
    expect(screen.getByTestId('reaction-btn-util')).toBeInTheDocument();
  });

  it('AT-SOC9-B-WEB-3: botón eliminar visible solo cuando isOwner=true', () => {
    const { rerender } = render(<PostCard {...defaultProps} isOwner={false} />);
    expect(screen.queryByTestId('post-delete-42')).not.toBeInTheDocument();

    rerender(<PostCard {...defaultProps} isOwner={true} />);
    expect(screen.getByTestId('post-delete-42')).toBeInTheDocument();
  });

  it('AT-SOC9-B-WEB-4: toggle comments carga y muestra CommentThread', async () => {
    render(<PostCard {...defaultProps} />);
    expect(screen.queryByTestId('comment-thread')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('post-comments-toggle-42'));
    await waitFor(() => {
      expect(screen.getByTestId('comment-thread')).toBeInTheDocument();
    });
    expect(screen.getByText('Excelente resultado.')).toBeInTheDocument();
  });
});
