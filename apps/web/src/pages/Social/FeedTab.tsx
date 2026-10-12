import React from 'react';
import { fetchFeed } from './arcsialCoreApi';
import ArcsialPostList from './ArcsialPostList';
import PostComposer from './PostComposer';
import usePostPages from './usePostPages';

/**
 * FC210 F3 — pestaña «Feed»: la caja de publicación y, por fecha descendente, lo que publican los
 * actores que la sesión sigue más lo propio.
 */
export default function FeedTab({
  muUniverse,
  onOpenActor,
}: {
  readonly muUniverse: { id: number; label: string } | null;
  readonly onOpenActor: (handle: string) => void;
}): React.JSX.Element {
  const pages = usePostPages(fetchFeed);
  return (
    <section className="flex flex-col gap-6" data-testid="feed-tab">
      <PostComposer muUniverse={muUniverse} onPosted={pages.reload} />
      <ArcsialPostList
        pages={pages}
        emptyText="Sigue a personas o universos para ver aquí sus publicaciones"
        onOpenActor={onOpenActor}
      />
    </section>
  );
}
