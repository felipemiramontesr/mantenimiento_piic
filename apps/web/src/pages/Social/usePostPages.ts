import { useCallback, useEffect, useState } from 'react';
import { describeArcsialError } from './arcsialApi';
import { ArcsialPost, deletePost, PostPage } from './arcsialCoreApi';

/**
 * FC210 F3 — publicaciones paginadas por cursor (muro de un actor o feed): primera página al montar,
 * «cargar más» con el cursor que devolvió el servidor y borrado que retira la tarjeta al confirmarse.
 */
export interface PostPagesState {
  readonly posts: ArcsialPost[];
  readonly loading: boolean;
  readonly error: string | null;
  readonly hasMore: boolean;
  readonly reload: () => void;
  readonly loadMore: () => void;
  readonly remove: (id: number) => void;
}

/** Trae una página: `null` pide la primera. */
export type PageFetcher = (beforeId: number | null) => Promise<PostPage>;

type PostsUpdate = (current: ArcsialPost[]) => ArcsialPost[];

/** La primera página sustituye la lista; las siguientes se agregan al final. */
function mergePage(beforeId: number | null, page: PostPage): PostsUpdate {
  return (current) => (beforeId === null ? page.posts : [...current, ...page.posts]);
}

/** La lista sin la publicación borrada. */
function withoutPost(id: number): PostsUpdate {
  return (current) => current.filter((post) => post.id !== id);
}

/** `fetchPage` debe ser estable (useCallback): al cambiar, la lista se vuelve a cargar. */
export default function usePostPages(fetchPage: PageFetcher): PostPagesState {
  const [posts, setPosts] = useState<ArcsialPost[]>([]);
  const [next, setNext] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fail = (err: unknown): void => setError(describeArcsialError(err));
  const load = useCallback(
    (beforeId: number | null): void => {
      setError(null);
      fetchPage(beforeId)
        .then((page) => {
          setPosts(mergePage(beforeId, page));
          setNext(page.nextBeforeId);
        })
        .catch(fail)
        .finally(() => setLoading(false));
    },
    [fetchPage]
  );
  const reload = useCallback((): void => load(null), [load]);
  useEffect(reload, [reload]);
  const loadMore = (): void => load(next);
  const remove = (id: number): void => {
    deletePost(id)
      .then(() => setPosts(withoutPost(id)))
      .catch(fail);
  };
  return { posts, loading, error, hasMore: next !== null, reload, loadMore, remove };
}
