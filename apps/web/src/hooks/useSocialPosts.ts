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

interface UseSocialPostsReturn {
  posts: SocialPost[];
  isLoading: boolean;
  error: string | null;
  refresh: (authorId?: number) => Promise<void>;
  createPost: (contentText: string, imageUrls?: string[]) => Promise<void>;
  deletePost: (id: number) => Promise<void>;
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

  return { posts, isLoading, error, refresh, createPost, deletePost };
}
