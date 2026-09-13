import React, { useEffect, useState } from 'react';
import { MessageSquare, PlusCircle, RefreshCw, AlertCircle, Users, Edit } from 'lucide-react';
import { useSocialPosts, type SocialPost, type ReactionType } from '../../hooks/useSocialPosts';
import ProfileEditSlideOver from './ProfileEditSlideOver';
import PostCard from '../../components/Social/PostCard';
import { useAuth } from '../../context/AuthContext';
import { useSovereignLayout } from '../../context/SovereignLayoutContext';
import AT from '../../styles/archonTypography';

interface ProfileHeaderActionsProps {
  readonly onRefresh: () => void;
  readonly onEditClick: () => void;
}

/** Botones de refrescar/editar perfil en el header del muro social (FC163 F2B4 Sub-Batch 4B-1). */
function ProfileHeaderActions({
  onRefresh,
  onEditClick,
}: ProfileHeaderActionsProps): React.JSX.Element {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        data-testid="profile-refresh-btn"
        onClick={onRefresh}
        className="inline-flex items-center gap-1.5 h-11 text-archon-sm font-black uppercase tracking-widest text-[#0f2a44]/40 hover:text-[#0f2a44] transition-colors"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        Actualizar
      </button>
      <button
        type="button"
        data-testid="profile-edit-btn"
        onClick={onEditClick}
        className="btn-sentinel-sky-static text-[10px]"
      >
        <Edit className="w-3 h-3" />
        Editar perfil
      </button>
    </div>
  );
}

interface NewPostFormProps {
  readonly username: string;
  readonly newContent: string;
  readonly onContentChange: (v: string) => void;
  readonly onSubmit: (e: React.FormEvent) => void;
  readonly postError: string | null;
}

/** Formulario de creación de publicación en el muro social (FC163 F2B4 Sub-Batch 4B-1). */
function NewPostForm({
  username,
  newContent,
  onContentChange,
  onSubmit,
  postError,
}: NewPostFormProps): React.JSX.Element {
  return (
    <form
      data-testid="post-create-form"
      onSubmit={onSubmit}
      className="card-archon-sovereign bg-white p-6 space-y-3 [--card-accent:#0f2a44]"
    >
      <div className="card-sovereign-header !mb-0">
        <MessageSquare size={22} className="text-[var(--card-accent)]" />
        <h3 className="card-sovereign-title text-archon-xl opacity-100">{username}</h3>
      </div>
      <textarea
        data-testid="post-content-input"
        value={newContent}
        onChange={(e): void => onContentChange(e.target.value)}
        placeholder="Comparte una actualización del taller…"
        rows={3}
        className="w-full archon-input resize-none"
      />
      {postError && (
        <div
          data-testid="post-create-error"
          className="flex items-center gap-2 text-red-600 text-archon-sm font-black"
        >
          <AlertCircle className="w-3.5 h-3.5" />
          {postError}
        </div>
      )}
      <div className="flex justify-end">
        <button
          type="submit"
          data-testid="post-submit-btn"
          disabled={!newContent.trim()}
          className="btn-sentinel-sky text-xs"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          Publicar
        </button>
      </div>
    </form>
  );
}

interface PostsWallProps {
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly posts: SocialPost[];
  readonly currentUserId: number | undefined;
  readonly onDeletePost: (id: number) => void;
  readonly onReact: (postId: number, type: ReactionType) => void;
  readonly fetchComments: ReturnType<typeof useSocialPosts>['fetchComments'];
  readonly addComment: ReturnType<typeof useSocialPosts>['addComment'];
}

type PostsListProps = Omit<PostsWallProps, 'isLoading' | 'error'>;

/** Lista de publicaciones o estado vacío (FC163 F2B4 Sub-Batch 4B-1). */
function PostsList({
  posts,
  currentUserId,
  onDeletePost,
  onReact,
  fetchComments,
  addComment,
}: PostsListProps): React.JSX.Element {
  if (posts.length === 0) {
    return (
      <div
        data-testid="profile-posts-empty"
        className="flex flex-col items-center gap-2 py-10 text-[#0f2a44]/40"
      >
        <MessageSquare className="w-6 h-6 opacity-30" />
        <span className={AT.sectionDescription}>Sin publicaciones aún</span>
      </div>
    );
  }
  return (
    <>
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          isOwner={currentUserId === post.authorId}
          onDelete={onDeletePost}
          onReact={onReact}
          fetchComments={fetchComments}
          addComment={addComment}
        />
      ))}
    </>
  );
}

/** Estados de carga/error y lista de publicaciones del muro social (FC163 F2B4 Sub-Batch 4B-1). */
function PostsWall(props: PostsWallProps): React.JSX.Element {
  const { isLoading, error } = props;
  if (isLoading) {
    return (
      <div data-testid="profile-loading" className="flex items-center justify-center py-12">
        <div className="w-5 h-5 border-2 border-pinnacle-navy border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (error) {
    return (
      <div
        data-testid="profile-error"
        className="flex items-center gap-2 text-red-600 text-archon-sm font-black"
      >
        <AlertCircle className="w-4 h-4" />
        {error}
      </div>
    );
  }
  return (
    <div data-testid="profile-wall" className="flex flex-col gap-4">
      <PostsList {...props} />
    </div>
  );
}

interface CreatePostFormState {
  newContent: string;
  setNewContent: (v: string) => void;
  postError: string | null;
  onSubmit: (e: React.FormEvent) => void;
}

/** Estado y submit del formulario de nueva publicación (FC163 F2B4 Sub-Batch 4B-1). */
function useCreatePostForm(createPost: (text: string) => Promise<void>): CreatePostFormState {
  const [newContent, setNewContent] = useState('');
  const [postError, setPostError] = useState<string | null>(null);

  const onSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    setPostError(null);
    if (!newContent.trim()) return;
    createPost(newContent.trim())
      .then(() => setNewContent(''))
      .catch((err: unknown) => {
        const msg =
          err && typeof err === 'object' && 'response' in err
            ? (err as { response?: { data?: { error?: string } } }).response?.data?.error ??
              'Error al publicar'
            : 'Error al publicar';
        setPostError(
          msg === 'PII_DETECTED_IN_POST'
            ? 'La publicación contiene datos sensibles (placa o VIN).'
            : msg
        );
      });
  };

  return { newContent, setNewContent, postError, onSubmit };
}

interface ProfileWallActions {
  handleRefresh: () => void;
  handleDeletePost: (id: number) => void;
  handleReact: (postId: number, type: ReactionType) => void;
}

/** Handlers fire-and-forget del muro social (refrescar/eliminar/reaccionar) (FC163 F2B4 Sub-Batch 4B-1). */
function useProfileWallActions(
  refresh: () => Promise<void>,
  deletePost: (id: number) => Promise<void>,
  addReaction: (postId: number, type: ReactionType) => Promise<void>
): ProfileWallActions {
  const handleRefresh = (): void => {
    refresh().catch(() => undefined);
  };
  const handleDeletePost = (id: number): void => {
    deletePost(id).catch(() => undefined);
  };
  const handleReact = (postId: number, type: ReactionType): void => {
    addReaction(postId, type).catch(() => undefined);
  };
  return { handleRefresh, handleDeletePost, handleReact };
}

interface ProfileWallHeaderProps {
  readonly onRefresh: () => void;
  readonly onEditClick: () => void;
}

/** Título del muro social + acciones de refrescar/editar (FC163 F2B4 Sub-Batch 4B-1). */
function ProfileWallHeader({ onRefresh, onEditClick }: ProfileWallHeaderProps): React.JSX.Element {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Users className="w-4 h-4 text-pinnacle-navy" />
        <span className={AT.sectionTitle}>Muro Social</span>
      </div>
      <ProfileHeaderActions onRefresh={onRefresh} onEditClick={onEditClick} />
    </div>
  );
}

const ProfileView: React.FC = () => {
  const {
    posts,
    isLoading,
    error,
    refresh,
    createPost,
    deletePost,
    addReaction,
    fetchComments,
    addComment,
  } = useSocialPosts();
  const { currentUser } = useAuth();
  const { setSectionData } = useSovereignLayout();
  const [editOpen, setEditOpen] = useState(false);
  const { newContent, setNewContent, postError, onSubmit } = useCreatePostForm(createPost);
  const { handleRefresh, handleDeletePost, handleReact } = useProfileWallActions(
    refresh,
    deletePost,
    addReaction
  );

  useEffect(() => {
    setSectionData('Arcsial', 'Muro de la comunidad Archon');
    refresh().catch(() => undefined);
  }, [setSectionData, refresh]);

  return (
    <div data-testid="profile-view" className="flex flex-col gap-6 max-w-2xl mx-auto py-6">
      <ProfileWallHeader onRefresh={handleRefresh} onEditClick={(): void => setEditOpen(true)} />

      <NewPostForm
        username={currentUser?.username ?? 'Usuario'}
        newContent={newContent}
        onContentChange={setNewContent}
        onSubmit={onSubmit}
        postError={postError}
      />

      <PostsWall
        isLoading={isLoading}
        error={error}
        posts={posts}
        currentUserId={currentUser ? Number(currentUser.id) : undefined}
        onDeletePost={handleDeletePost}
        onReact={handleReact}
        fetchComments={fetchComments}
        addComment={addComment}
      />

      <ProfileEditSlideOver isOpen={editOpen} onClose={(): void => setEditOpen(false)} />
    </div>
  );
};

export default ProfileView;
