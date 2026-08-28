import React from 'react';
import { AlertCircle, X, CheckCircle, Info } from 'lucide-react';

/**
 * 🔱 Archon Component: ArchonFeedbackBanner
 * Implementation: Silicon Valley Standard (v.18.0.0)
 * Purpose: High-visibility in-panel feedback for operational errors or success.
 */

export type FeedbackType = 'error' | 'success' | 'info';

interface ArchonFeedbackBannerProps {
  message: string;
  type?: FeedbackType;
  onClear: () => void;
}

const FEEDBACK_STYLES: Record<
  FeedbackType,
  { bg: string; border: string; icon: React.JSX.Element; text: string }
> = {
  error: {
    bg: 'bg-red-50',
    border: 'border-red-500',
    icon: <AlertCircle className="text-red-500" size={20} />,
    text: 'text-red-900',
  },
  success: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-500',
    icon: <CheckCircle className="text-emerald-500" size={20} />,
    text: 'text-emerald-900',
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-500',
    icon: <Info className="text-blue-500" size={20} />,
    text: 'text-blue-900',
  },
};

/** Botón de cierre del banner de notificación (FC163 F2B4 Sub-Batch 4B-1). */
function BannerCloseButton({ onClear }: { onClear: () => void }): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClear}
      className="p-2 hover:bg-black/5 rounded-[4px] transition-colors group"
      aria-label="Cerrar notificación"
    >
      <X size={18} className="opacity-40 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}

const ArchonFeedbackBanner: React.FC<ArchonFeedbackBannerProps> = ({
  message,
  type = 'error',
  onClear,
}: ArchonFeedbackBannerProps): React.JSX.Element | null => {
  if (!message) return null;

  const currentStyle = FEEDBACK_STYLES[type];

  return (
    <div
      className={`
        flex items-center justify-between p-5 mb-8 rounded-[4px] border-l-4 shadow-md
        animate-in slide-in-from-top-4 duration-300
        ${currentStyle.bg} ${currentStyle.border}
      `}
    >
      <div className="flex items-center space-x-4">
        <div className="flex-shrink-0">{currentStyle.icon}</div>
        <div className="flex flex-col">
          <span className="text-archon-base font-black uppercase tracking-[0.2em] opacity-50 mb-1">
            Notificación del Sistema
          </span>
          <p className={`${currentStyle.text} text-sm font-bold tracking-tight leading-snug`}>
            {message}
          </p>
        </div>
      </div>

      <BannerCloseButton onClear={onClear} />
    </div>
  );
};

export default ArchonFeedbackBanner;
