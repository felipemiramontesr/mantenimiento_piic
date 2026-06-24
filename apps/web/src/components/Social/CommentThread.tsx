import React, { useEffect, useState } from 'react';
import { MessageSquare, AlertCircle } from 'lucide-react';
import type { SocialComment } from '../../hooks/useSocialPosts';

interface CommentThreadProps {
  postId: number;
  fetchComments: (postId: number) => Promise<SocialComment[]>;
  addComment: (postId: number, text: string, parentId?: number) => Promise<void>;
}

const CommentThread: React.FC<CommentThreadProps> = ({ postId, fetchComments, addComment }) => {
  const [comments, setComments] = useState<SocialComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newText, setNewText] = useState('');
  const [postError, setPostError] = useState<string | null>(null);

  useEffect(() => {
    fetchComments(postId)
      .then(setComments)
      .catch(() => undefined)
      .finally(() => setIsLoading(false));
  }, [postId, fetchComments]);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setPostError(null);
    if (!newText.trim()) return;
    try {
      await addComment(postId, newText.trim());
      setNewText('');
      const updated = await fetchComments(postId);
      setComments(updated);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error ?? 'Error'
          : 'Error';
      setPostError(
        msg === 'PII_DETECTED_IN_COMMENT' ? 'Comentario contiene datos sensibles.' : msg
      );
    }
  };

  const rootComments = comments.filter((c) => c.parentCommentId === null);

  return (
    <div
      data-testid="comment-thread"
      className="flex flex-col gap-3 pt-3 border-t border-[#0f2a44]/10"
    >
      {isLoading && (
        <div className="w-4 h-4 border-2 border-slate-300 border-t-transparent rounded-full animate-spin mx-auto" />
      )}

      {!isLoading && rootComments.length === 0 && (
        <p
          data-testid="comments-empty"
          className="text-archon-xs text-slate-400 uppercase tracking-widest text-center"
        >
          Sin comentarios aún
        </p>
      )}

      {rootComments.map((comment) => {
        const replies = comments.filter((c) => c.parentCommentId === comment.id);
        return (
          <div
            key={comment.id}
            data-testid={`comment-${comment.id}`}
            className="flex flex-col gap-1"
          >
            <p className="text-archon-sm text-[#0f2a44]/80">{comment.contentText}</p>
            <span className="text-archon-xs text-slate-400 uppercase tracking-widest">
              {new Date(comment.createdAt).toLocaleDateString('es-MX', {
                month: 'short',
                day: 'numeric',
              })}
            </span>
            {replies.map((reply) => (
              <div
                key={reply.id}
                data-testid={`comment-reply-${reply.id}`}
                className="ml-4 pl-3 border-l-2 border-[#0f2a44]/10 flex flex-col gap-0.5"
              >
                <p className="text-archon-xs text-[#0f2a44]/70">{reply.contentText}</p>
              </div>
            ))}
          </div>
        );
      })}

      <form
        data-testid="comment-form"
        onSubmit={(e): void => {
          handleSubmit(e).catch(() => undefined);
        }}
        className="flex gap-2 mt-1"
      >
        <input
          data-testid="comment-input"
          value={newText}
          onChange={(e): void => setNewText(e.target.value)}
          placeholder="Añade un comentario…"
          className="flex-1 px-2 py-1 text-archon-xs text-[#0f2a44] bg-white border border-[#0f2a44]/10 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0f2a44]/20 placeholder:text-slate-300"
        />
        <button
          type="submit"
          data-testid="comment-submit"
          disabled={!newText.trim()}
          className="flex items-center gap-1 px-2 py-1 bg-[#0f2a44]/10 hover:bg-[#0f2a44]/20 text-[#0f2a44] text-archon-xs font-black uppercase tracking-widest rounded-lg disabled:opacity-40 transition-all"
        >
          <MessageSquare className="w-3 h-3" />
          OK
        </button>
      </form>

      {postError && (
        <div className="flex items-center gap-1.5 text-red-400 text-archon-xs">
          <AlertCircle className="w-3 h-3" />
          {postError}
        </div>
      )}
    </div>
  );
};

export default CommentThread;
