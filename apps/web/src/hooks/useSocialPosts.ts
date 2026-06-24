import { useState, useCallback } from 'react';
import api from '../api/client';

export interface SocialPost {
  id: number;
  authorId: number;
  ownerId: number;
  contentText: string;
  imageUrls: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SocialComment {
  id: number;
  postId: number;
  authorId: number;
  parentCommentId: number | null;
  contentText: string;
  createdAt: string;
}

export type ReactionType = 'IMPECABLE' | 'VELOZ' | 'TRANSPARENTE' | 'UTIL';

interface UseSocialPostsReturn {
  posts: SocialPost[];
  isLoading: boolean;
  error: string | null;
  refresh: (authorId?: number) => Promise<void>;
  createPost: (contentText: string, imageUrls?: string[]) => Promise<void>;
  deletePost: (id: number) => Promise<void>;
  addReaction: (postId: number, type: ReactionType) => Promise<void>;
  removeReaction: (postId: number, type: ReactionType) => Promise<void>;
  fetchComments: (postId: number) => Promise<SocialComment[]>;
  addComment: (postId: number, contentText: string, parentCommentId?: number) => Promise<void>;
}

export function useSocialPosts(): UseSocialPostsReturn {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (authorId?: number): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const url = authorId ? `/social/posts?authorId=${authorId}` : '/social/posts';
      const res = await api.get<{ posts: SocialPost[] }>(url);
      setPosts(res.data.posts);
    } catch {
      setError('Error al cargar publicaciones');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createPost = useCallback(
    async (contentText: string, imageUrls?: string[]): Promise<void> => {
      await api.post('/social/posts', { contentText, imageUrls });
      await refresh();
    },
    [refresh]
  );

  const deletePost = useCallback(async (id: number): Promise<void> => {
    await api.delete(`/social/posts/${id}`);
    setPosts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const addReaction = useCallback(async (postId: number, type: ReactionType): Promise<void> => {
    await api.post(`/social/posts/${postId}/reactions`, { type });
  }, []);

  const removeReaction = useCallback(async (postId: number, type: ReactionType): Promise<void> => {
    await api.delete(`/social/posts/${postId}/reactions/${type}`);
  }, []);

  const fetchComments = useCallback(async (postId: number): Promise<SocialComment[]> => {
    const res = await api.get<{ comments: SocialComment[] }>(`/social/posts/${postId}/comments`);
    return res.data.comments;
  }, []);

  const addComment = useCallback(
    async (postId: number, contentText: string, parentCommentId?: number): Promise<void> => {
      await api.post(`/social/posts/${postId}/comments`, { contentText, parentCommentId });
    },
    []
  );

  return {
    posts,
    isLoading,
    error,
    refresh,
    createPost,
    deletePost,
    addReaction,
    removeReaction,
    fetchComments,
    addComment,
  };
}
