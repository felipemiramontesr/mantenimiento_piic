import React from 'react';
import { Building2, MessageSquare, Trash2, UserCircle } from 'lucide-react';
import { ActorCard, ArcsialPost, describeElapsed, PostVisibility } from './arcsialCoreApi';
import type { PostPagesState } from './usePostPages';

/**
 * FC210 F3 — tarjeta de publicación de Arcsial V2 (autor, tipo de actor, tiempo relativo, texto,
 * imágenes y borrado si corresponde) y la lista paginada que la usa en el feed y en los muros.
 */

const VISIBILITY_LABEL: Record<PostVisibility, string> = {
  PUBLIC: 'Pública',
  FOLLOWERS: 'Seguidores',
  CONTACTS: 'Contactos',
};

/** Avatar del actor, o un ícono según sea persona o Universo. */
export function ActorAvatar({
  actor,
  large = false,
}: {
  readonly actor: Pick<ActorCard, 'avatarUrl' | 'actorType'>;
  readonly large?: boolean;
}): React.JSX.Element {
  if (actor.avatarUrl) {
    return (
      <img
        src={actor.avatarUrl}
        alt=""
        referrerPolicy="no-referrer"
        className={`rounded-full object-cover ${large ? 'h-16 w-16' : 'h-10 w-10'}`}
      />
    );
  }
  const Icon = actor.actorType === 'UNIVERSE' ? Building2 : UserCircle;
  return <Icon size={large ? 64 : 40} className="text-[#0f2a44]/30" />;
}

/** Insignia «Persona» o «Universo». */
export function ActorBadge({
  actorType,
}: {
  readonly actorType: ActorCard['actorType'];
}): React.JSX.Element {
  const isUniverse = actorType === 'UNIVERSE';
  return (
    <span
      data-testid="actor-badge"
      className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-widest ${
        isUniverse ? 'bg-emerald-50 text-emerald-700' : 'bg-sky-50 text-sky-700'
      }`}
    >
      {isUniverse ? 'Universo' : 'Persona'}
    </span>
  );
}

interface PostCardProps {
  readonly post: ArcsialPost;
  readonly onDelete: (id: number) => void;
  readonly onOpenActor: (handle: string) => void;
}

/** Autor de la publicación: abre su perfil al pulsarlo. */
function PostAuthor({ post, onOpenActor }: Omit<PostCardProps, 'onDelete'>): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={(): void => onOpenActor(post.author.handle)}
      data-testid={`post-author-${post.id}`}
      className="flex items-center gap-3 text-left"
    >
      <ActorAvatar actor={post.author} />
      <span>
        <span className="flex items-center gap-2 font-bold text-[#0f2a44]">
          {post.author.displayName}
          <ActorBadge actorType={post.author.actorType} />
        </span>
        <span className="text-xs text-[#0f2a44]/50">
          @{post.author.handle} · {describeElapsed(post.createdAt)} ·{' '}
          {VISIBILITY_LABEL[post.visibility]}
        </span>
      </span>
    </button>
  );
}

/** Imágenes adjuntas (hasta 4), en cuadrícula. */
function PostImages({ post }: { readonly post: ArcsialPost }): React.JSX.Element | null {
  if (post.imageUrls.length === 0) return null;
  return (
    <div className="grid grid-cols-2 gap-2" data-testid={`post-images-${post.id}`}>
      {post.imageUrls.map((url) => (
        <img
          key={url}
          src={url}
          alt="Imagen adjunta a la publicación"
          loading="lazy"
          referrerPolicy="no-referrer"
          className="h-40 w-full rounded-lg object-cover"
        />
      ))}
    </div>
  );
}

/** Una publicación. */
export function ArcsialPostCard({ post, onDelete, onOpenActor }: PostCardProps): React.JSX.Element {
  return (
    <article
      data-testid={`arcsial-post-${post.id}`}
      className="card-archon-sovereign space-y-3 bg-white p-6 [--card-accent:#0f2a44]"
    >
      <div className="flex items-start justify-between gap-3">
        <PostAuthor post={post} onOpenActor={onOpenActor} />
        {post.canDelete && (
          <button
            type="button"
            onClick={(): void => onDelete(post.id)}
            aria-label="Eliminar publicación"
            data-testid={`post-delete-${post.id}`}
            className="text-red-500 hover:text-red-700"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
      <p className="whitespace-pre-wrap break-words text-sm text-[#0f2a44]">{post.contentText}</p>
      <PostImages post={post} />
    </article>
  );
}

interface PostListProps {
  readonly pages: PostPagesState;
  readonly emptyText: string;
  readonly onOpenActor: (handle: string) => void;
}

/** Estado vacío de la lista. */
function EmptyPosts({ text }: { readonly text: string }): React.JSX.Element {
  return (
    <div
      data-testid="arcsial-posts-empty"
      className="flex flex-col items-center gap-2 py-10 text-[#0f2a44]/40"
    >
      <MessageSquare className="h-6 w-6 opacity-30" />
      <span className="text-sm">{text}</span>
    </div>
  );
}

/** Estado vacío o las tarjetas, con «Cargar más» mientras el servidor devuelva cursor. */
function PostListBody({ pages, emptyText, onOpenActor }: PostListProps): React.JSX.Element {
  if (pages.posts.length === 0) return <EmptyPosts text={emptyText} />;
  return (
    <>
      {pages.posts.map((post) => (
        <ArcsialPostCard
          key={post.id}
          post={post}
          onDelete={pages.remove}
          onOpenActor={onOpenActor}
        />
      ))}
      {pages.hasMore && (
        <button
          type="button"
          onClick={pages.loadMore}
          data-testid="arcsial-posts-more"
          className="btn-sentinel-sky-static mx-auto text-xs"
        >
          Cargar más
        </button>
      )}
    </>
  );
}

/** Lista paginada de publicaciones, con carga y error. */
export default function ArcsialPostList(props: PostListProps): React.JSX.Element {
  const { pages } = props;
  if (pages.loading) {
    return (
      <div data-testid="arcsial-posts-loading" className="flex justify-center py-12">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-pinnacle-navy border-t-transparent" />
      </div>
    );
  }
  return (
    <div data-testid="arcsial-posts" className="flex flex-col gap-4">
      {pages.error && (
        <p
          role="alert"
          data-testid="arcsial-posts-error"
          className="text-sm font-medium text-red-500"
        >
          {pages.error}
        </p>
      )}
      <PostListBody {...props} />
    </div>
  );
}
