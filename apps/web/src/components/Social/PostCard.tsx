import React, { useState } from 'react';
import { Trash2, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';
import type { SocialPost, SocialComment, ReactionType } from '../../hooks/useSocialPosts';
import ReactionBar from './ReactionBar';
import CommentThread from './CommentThread';

interface PostCardProps {
  post: SocialPost;
  isOwner: boolean;
  onDelete: (id: number) => void;
  onReact: (postId: number, type: ReactionType) => void;
  fetchComments: (postId: number) => Promise<SocialComment[]>;
  addComment: (postId: number, text: string, parentId?: number) => Promise<void>;
}

const PostCard: React.FC<PostCardProps> = ({
  post,
  isOwner,
  onDelete,
  onReact,
  fetchComments,
  addComment,
}) => {
  const [showComments, setShowComments] = useState(false);

  return (
    <div
      data-testid={`post-card-${post.id}`}
      className="flex flex-col gap-3 p-4 bg-white border border-[#0f2a44]/10 rounded-xl hover:shadow-sm transition-shadow"
    >
      {/* Content row */}
      <div className="flex items-start justify-between gap-3">
        <p className="text-archon-md text-[#0f2a44] leading-relaxed flex-1">{post.contentText}</p>
        {isOwner && (
          <button
            data-testid={`post-delete-${post.id}`}
            onClick={(): void => onDelete(post.id)}
            className="text-slate-300 hover:text-red-400 transition-colors shrink-0"
            title="Eliminar publicación"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Date */}
      <span className="text-archon-xs text-slate-400 font-bold uppercase tracking-widest">
        {new Date(post.createdAt).toLocaleDateString('es-MX', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })}
      </span>

      {/* Reaction bar */}
      <ReactionBar postId={post.id} onReact={onReact} />

      {/* Toggle comments */}
      <button
        data-testid={`post-comments-toggle-${post.id}`}
        onClick={(): void => setShowComments((v) => !v)}
        className="flex items-center gap-1.5 text-archon-xs font-black uppercase tracking-widest text-slate-400 hover:text-[#0f2a44] transition-colors self-start"
      >
        <MessageSquare className="w-3.5 h-3.5" />
        Comentarios
        {showComments ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {showComments && (
        <CommentThread postId={post.id} fetchComments={fetchComments} addComment={addComment} />
      )}
    </div>
  );
};

export default PostCard;
