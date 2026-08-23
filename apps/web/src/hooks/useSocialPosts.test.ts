import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import api from '../api/client';
import { useSocialPosts } from './useSocialPosts';

vi.mock('../api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('useSocialPosts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('removeReaction calls DELETE on the reaction endpoint', async () => {
    (api.delete as Mock).mockResolvedValue({ data: {} });

    const { result } = renderHook(() => useSocialPosts());

    await act(async () => {
      await result.current.removeReaction(1, 'IMPECABLE');
    });

    expect(api.delete).toHaveBeenCalledWith('/social/posts/1/reactions/IMPECABLE');
  });

  it('fetchComments returns the comments unwrapped from the response', async () => {
    const comments = [
      {
        id: 1,
        postId: 1,
        authorId: 2,
        parentCommentId: null,
        contentText: 'Excelente servicio',
        createdAt: '2026-08-01T00:00:00.000Z',
      },
    ];
    (api.get as Mock).mockResolvedValue({ data: { comments } });

    const { result } = renderHook(() => useSocialPosts());

    let returned;
    await act(async () => {
      returned = await result.current.fetchComments(1);
    });

    expect(api.get).toHaveBeenCalledWith('/social/posts/1/comments');
    expect(returned).toEqual(comments);
  });

  it('addComment posts contentText and parentCommentId to the comments endpoint', async () => {
    (api.post as Mock).mockResolvedValue({ data: {} });

    const { result } = renderHook(() => useSocialPosts());

    await act(async () => {
      await result.current.addComment(1, 'Muy buen trabajo', 5);
    });

    expect(api.post).toHaveBeenCalledWith('/social/posts/1/comments', {
      contentText: 'Muy buen trabajo',
      parentCommentId: 5,
    });
  });
});
