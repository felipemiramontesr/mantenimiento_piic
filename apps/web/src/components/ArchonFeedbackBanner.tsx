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

const ArchonFeedbackBanner: React.FC<ArchonFeedbackBannerProps> = ({
  message,
  type = 'error',
  onClear,
}: ArchonFeedbackBannerProps): React.JSX.Element | null => {
  if (!message) return null;

  const styles = {
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

  const currentStyle = styles[type];

  return (
    <div
      className={`
        flex items-center justify-between p-5 mb-8 rounded-lg border-l-4 shadow-md 
        animate-in slide-in-from-top-4 duration-300
        ${currentStyle.bg} ${currentStyle.border}
      `}
    >
      <div className="flex items-center space-x-4">
        <div className="flex-shrink-0">{currentStyle.icon}</div>
        <div className="flex flex-col">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50 mb-1">
            Notificación del Sistema
          </span>
          <p className={`${currentStyle.text} text-sm font-bold tracking-tight leading-snug`}>
            {message}
          </p>
        </div>
      </div>

      <button
        onClick={onClear}
        className="p-2 hover:bg-black/5 rounded-full transition-colors group"
        aria-label="Cerrar notificación"
      >
        <X size={18} className="opacity-40 group-hover:opacity-100 transition-opacity" />
      </button>
    </div>
  );
};

export default ArchonFeedbackBanner;
