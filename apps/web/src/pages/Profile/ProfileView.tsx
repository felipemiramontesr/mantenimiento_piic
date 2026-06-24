import React, { useEffect, useState } from 'react';
import {
  MessageSquare,
  PlusCircle,
  Trash2,
  RefreshCw,
  AlertCircle,
  Users,
  Edit,
} from 'lucide-react';
import { useSocialPosts } from '../../hooks/useSocialPosts';
import ProfileEditSlideOver from './ProfileEditSlideOver';
import { useAuth } from '../../context/AuthContext';
import { useSovereignLayout } from '../../context/SovereignLayoutContext';
import AT from '../../styles/archonTypography';

const ProfileView: React.FC = () => {
  const { posts, isLoading, error, refresh, createPost, deletePost } = useSocialPosts();
  const { currentUser } = useAuth();
  const { setSectionData } = useSovereignLayout();
  const [editOpen, setEditOpen] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [postError, setPostError] = useState<string | null>(null);

  useEffect(() => {
    setSectionData('Red Social', 'Muro de la comunidad Archon');
    refresh().catch(() => undefined);
  }, [setSectionData, refresh]);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setPostError(null);
    if (!newContent.trim()) return;
    try {
      await createPost(newContent.trim());
      setNewContent('');
    } catch (err: unknown) {
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
    }
  };

  return (
    <div data-testid="profile-view" className="flex flex-col gap-6 max-w-2xl mx-auto py-6">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-archon-blue" />
          <span className={AT.sectionTitle}>Muro Social</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            data-testid="profile-refresh-btn"
            onClick={(): void => {
              refresh().catch(() => undefined);
            }}
            className="flex items-center gap-1.5 text-archon-sm font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Actualizar
          </button>
          <button
            data-testid="profile-edit-btn"
            onClick={(): void => setEditOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0f2a44]/10 hover:bg-[#0f2a44]/20 text-[#0f2a44] text-archon-sm font-black uppercase tracking-widest rounded-lg border border-[#0f2a44]/20 transition-colors"
          >
            <Edit className="w-3 h-3" />
            Editar perfil
          </button>
        </div>
      </div>

      {/* New post form */}
      <form
        data-testid="post-create-form"
        onSubmit={(e): void => {
          handleSubmit(e).catch(() => undefined);
        }}
        className="flex flex-col gap-3 p-4 bg-[#0a1929]/5 border border-[#0f2a44]/10 rounded-xl"
      >
        <div className="flex items-center gap-2 mb-1">
          <MessageSquare className="w-4 h-4 text-slate-400" />
          <span className="text-archon-sm font-black uppercase tracking-widest text-slate-400">
            {currentUser?.username ?? 'Usuario'}
          </span>
        </div>
        <textarea
          data-testid="post-content-input"
          value={newContent}
          onChange={(e): void => setNewContent(e.target.value)}
          placeholder="Comparte una actualización del taller…"
          rows={3}
          className="w-full px-3 py-2 text-archon-md text-[#0f2a44] bg-white border border-[#0f2a44]/10 rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-[#0f2a44]/30 placeholder:text-slate-300"
        />
        {postError && (
          <div
            data-testid="post-create-error"
            className="flex items-center gap-2 text-red-500 text-archon-sm font-black"
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
            className="flex items-center gap-1.5 px-4 py-1.5 bg-archon-blue text-white text-archon-sm font-black uppercase tracking-widest rounded-lg hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Publicar
          </button>
        </div>
      </form>

      {/* States */}
      {isLoading && (
        <div data-testid="profile-loading" className="flex items-center justify-center py-12">
          <div className="w-5 h-5 border-2 border-archon-blue border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <div
          data-testid="profile-error"
          className="flex items-center gap-2 text-red-400 text-archon-sm font-black"
        >
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Posts wall */}
      {!isLoading && !error && (
        <div data-testid="profile-wall" className="flex flex-col gap-4">
          {posts.length === 0 && (
            <div
              data-testid="profile-posts-empty"
              className="flex flex-col items-center gap-2 py-10 text-slate-400"
            >
              <MessageSquare className="w-6 h-6 opacity-30" />
              <span className={AT.sectionDescription}>Sin publicaciones aún</span>
            </div>
          )}
          {posts.map((post) => (
            <div
              key={post.id}
              data-testid={`post-card-${post.id}`}
              className="flex flex-col gap-2 p-4 bg-white border border-[#0f2a44]/10 rounded-xl hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-archon-md text-[#0f2a44] leading-relaxed flex-1">
                  {post.contentText}
                </p>
                {Number(currentUser?.id) === post.authorId && (
                  <button
                    data-testid={`post-delete-${post.id}`}
                    onClick={(): void => {
                      deletePost(post.id).catch(() => undefined);
                    }}
                    className="text-slate-300 hover:text-red-400 transition-colors shrink-0"
                    title="Eliminar publicación"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <span className="text-archon-xs text-slate-400 font-bold uppercase tracking-widest">
                {new Date(post.createdAt).toLocaleDateString('es-MX', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Edit profile slide-over */}
      <ProfileEditSlideOver isOpen={editOpen} onClose={(): void => setEditOpen(false)} />
    </div>
  );
};

export default ProfileView;
