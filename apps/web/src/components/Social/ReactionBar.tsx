import React from 'react';
import { Star, Zap, Eye, ThumbsUp } from 'lucide-react';
import type { ReactionType } from '../../hooks/useSocialPosts';

interface ReactionBarProps {
  postId: number;
  onReact: (postId: number, type: ReactionType) => void;
}

const REACTIONS: { type: ReactionType; Icon: React.ElementType; label: string; color: string }[] = [
  {
    type: 'IMPECABLE',
    Icon: Star,
    label: 'Impecable',
    color: 'text-amber-400 hover:text-amber-300',
  },
  { type: 'VELOZ', Icon: Zap, label: 'Veloz', color: 'text-sky-400 hover:text-sky-300' },
  {
    type: 'TRANSPARENTE',
    Icon: Eye,
    label: 'Transparente',
    color: 'text-violet-400 hover:text-violet-300',
  },
  { type: 'UTIL', Icon: ThumbsUp, label: 'Útil', color: 'text-emerald-400 hover:text-emerald-300' },
];

const ReactionBar: React.FC<ReactionBarProps> = ({ postId, onReact }) => (
  <div data-testid="reaction-bar" className="flex items-center gap-3">
    {REACTIONS.map(({ type, Icon, label, color }) => (
      <button
        key={type}
        data-testid={`reaction-btn-${type.toLowerCase()}`}
        onClick={(): void => onReact(postId, type)}
        title={label}
        className={`flex items-center gap-1 text-archon-xs font-black uppercase tracking-widest transition-all duration-150 active:scale-110 ${color}`}
      >
        <Icon className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">{label}</span>
      </button>
    ))}
  </div>
);

export default ReactionBar;
