import React from 'react';
import { ArrowRight, LucideIcon } from 'lucide-react';

/**
 * 🔱 Archon UI Component: ArchonManagementCard
 * Implementation: Sovereign Management Strategy Card (V.78.100.104)
 * Objective: Chromatic differentiation via dynamic CSS variables.
 * Refactor: Fixed CSS variable inheritance and arbitrary value mapping.
 */

export type ArchonCardVariant = 'navy' | 'emerald' | 'red' | 'yellow' | 'sky' | 'violet' | 'blue';

export interface ArchonManagementCardProps {
  variant: ArchonCardVariant;
  headerTitle: string;
  HeaderIcon: LucideIcon;
  actionTitle: string;
  description: string;
  PayloadIcon: LucideIcon;
  buttonText: string;
  isActive: boolean;
  onClick: (e: React.MouseEvent) => void;
  testId?: string;
  layout?: 'vertical' | 'horizontal';
}

const getVariantClasses = (variant: ArchonCardVariant): string => {
  const mapping: Record<ArchonCardVariant, string> = {
    navy: '[--card-accent:#0f2a44] [--card-accent-soft:#0f2a4415] [--card-accent-border:#0f2a4430]',
    emerald:
      '[--card-accent:#10b981] [--card-accent-soft:#10b98115] [--card-accent-border:#10b98130]',
    red: '[--card-accent:#ef4444] [--card-accent-soft:#ef444415] [--card-accent-border:#ef444430]',
    yellow:
      '[--card-accent:#f2b705] [--card-accent-soft:#f2b70515] [--card-accent-border:#f2b70530]',
    sky: '[--card-accent:#0ea5e9] [--card-accent-soft:#0ea5e915] [--card-accent-border:#0ea5e930]',
    violet:
      '[--card-accent:#8b5cf6] [--card-accent-soft:#8b5cf615] [--card-accent-border:#8b5cf630]',
    blue: '[--card-accent:#3b82f6] [--card-accent-soft:#3b82f615] [--card-accent-border:#3b82f630]',
  };
  return mapping[variant] || mapping.navy;
};

const ArchonManagementCard: React.FC<ArchonManagementCardProps> = ({
  variant,
  headerTitle,
  HeaderIcon,
  actionTitle,
  description,
  PayloadIcon,
  buttonText,
  isActive,
  onClick,
  testId,
  layout = 'vertical',
}) => {
  const variantStyles = getVariantClasses(variant);
  const isYellow = variant === 'yellow';
  const isHorizontal = layout === 'horizontal';

  return (
    <div
      onClick={onClick}
      className={`
        card-archon-sovereign cursor-pointer animate-in fade-in duration-500 group flex-1
        ${isActive ? 'border-x-slate-300 border-b-slate-300' : ''}
        ${variantStyles}
        ${isHorizontal ? '!flex-row !items-center !p-4 !h-auto gap-6' : 'flex-col p-6 h-full'}
      `}
    >
      {isHorizontal ? (
        <>
          {/* 🔱 LEFT: PAYLOAD ICON (AXIAL FOCUS) */}
          <div className="w-20 h-20 flex-shrink-0 rounded-[4px] flex items-center justify-center border-2 transition-all duration-300 bg-[var(--card-accent-soft)] border-[var(--card-accent-border)]">
            <PayloadIcon size={32} className="text-[var(--card-accent)]" />
          </div>

          {/* 🔱 RIGHT: MULTI-LEVEL CONTENT */}
          <div className="flex-1 flex flex-col justify-between space-y-2 py-1">
            <div className="flex items-center gap-2">
              <HeaderIcon size={14} className="text-[var(--card-accent)]" />
              <span className="card-sovereign-title !mb-0">{headerTitle}</span>
            </div>

            <div className="flex flex-col">
              <h3 className="text-pinnacle-navy font-black uppercase tracking-[0.12em] text-[11px] leading-tight">
                {actionTitle}
              </h3>
              <p className="text-[8px] font-bold opacity-40 uppercase tracking-[0.2em] text-pinnacle-navy">
                {description}
              </p>
            </div>

            <button
              data-testid={testId}
              className={`
                btn-archon-card-action !h-8 !text-[8px]
                ${isActive ? 'brightness-110 ring-1 ring-white/20' : ''}
                ${isYellow ? 'text-pinnacle-navy' : 'text-white'}
              `}
            >
              <span className="mr-2">{buttonText}</span>
              <ArrowRight size={10} className="transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </>
      ) : (
        <>
          {/* 🔱 HEADER */}
          <div className="card-sovereign-header">
            <HeaderIcon size={18} className="transition-colors text-[var(--card-accent)]" />
            <span className="card-sovereign-title">{headerTitle}</span>
          </div>

          {/* 📦 PAYLOAD */}
          <div className="flex-1 flex flex-col items-center justify-center space-y-6 pb-8">
            <div className="w-20 h-20 rounded-[4px] flex items-center justify-center border-2 transition-all duration-300 bg-[var(--card-accent-soft)] border-[var(--card-accent-border)]">
              <PayloadIcon size={32} className="text-[var(--card-accent)]" />
            </div>

            <div className="flex flex-col items-center space-y-1 text-center">
              <h3 className="text-pinnacle-navy font-black uppercase tracking-[0.15em] text-[13px]">
                {actionTitle}
              </h3>
              <p className="text-[9px] font-bold opacity-40 uppercase tracking-[0.25em] text-pinnacle-navy">
                {description}
              </p>
            </div>
          </div>

          {/* 🔘 ACTION */}
          <button
            data-testid={testId}
            className={`
              btn-archon-card-action
              ${isActive ? 'brightness-110 ring-1 ring-white/20' : ''}
              ${isYellow ? 'text-pinnacle-navy' : 'text-white'}
            `}
          >
            <span className="mr-2">{buttonText}</span>
            <ArrowRight size={12} className="transition-transform group-hover:translate-x-1" />
          </button>
        </>
      )}
    </div>
  );
};

export default ArchonManagementCard;
