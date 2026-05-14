import React from 'react';
import { ArrowRight, LucideIcon } from 'lucide-react';

/**
 * 🔱 Archon UI Component: ArchonManagementCard
 * Implementation: Sovereign Management Strategy Card (V.78.100.91)
 * Objective: High-performance navigational orchestration within modules.
 * Migration: 100% Sovereign Card Architecture (Pure Tailwind).
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
}

const getVariantColor = (variant: ArchonCardVariant): string => {
  switch (variant) {
    case 'navy':
      return '#0f2a44';
    case 'emerald':
      return '#10b981';
    case 'red':
      return '#ef4444';
    case 'yellow':
      return '#f2b705';
    case 'sky':
      return '#0ea5e9';
    case 'violet':
      return '#8b5cf6';
    case 'blue':
      return '#3b82f6';
    default:
      return '#0f2a44';
  }
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
}) => {
  const hexColor = getVariantColor(variant);
  const isYellow = variant === 'yellow';

  return (
    <div
      onClick={onClick}
      className={`
        card-archon-sovereign cursor-pointer animate-in fade-in duration-500 group
        ${isActive ? 'border-slate-300' : ''}
      `}
      style={
        {
          '--card-accent': hexColor,
          '--card-accent-soft': `${hexColor}15`,
          '--card-accent-border': `${hexColor}30`,
        } as React.CSSProperties
      }
    >
      {/* 🔱 HEADER */}
      <div className="card-sovereign-header">
        <HeaderIcon
          size={18}
          className="transition-colors"
          style={{ color: 'var(--card-accent)' }}
        />
        <span className="card-sovereign-title">{headerTitle}</span>
      </div>

      {/* 📦 PAYLOAD */}
      <div className="flex-1 flex flex-col items-center justify-center space-y-6 pb-8">
        <div
          className="w-20 h-20 rounded-[4px] flex items-center justify-center border-2 transition-all duration-300"
          style={{
            backgroundColor: 'var(--card-accent-soft)',
            borderColor: 'var(--card-accent-border)',
          }}
        >
          <PayloadIcon size={32} style={{ color: 'var(--card-accent)' }} />
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
    </div>
  );
};

export default ArchonManagementCard;
