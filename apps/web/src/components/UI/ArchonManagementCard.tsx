import React from 'react';
import { ArrowRight, LucideIcon } from 'lucide-react';

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

const getActiveButtonClass = (variant: ArchonCardVariant): string => {
  switch (variant) {
    case 'navy':
      return '!bg-[#0f2a44] !text-white';
    case 'emerald':
      return '!bg-emerald-600 !text-white';
    case 'red':
      return '!bg-red-600 !text-white';
    case 'yellow':
      return '!bg-[#d9a404] !text-[#0f2a44]';
    case 'sky':
      return '!bg-sky-600 !text-white';
    case 'violet':
      return '!bg-violet-600 !text-white';
    case 'blue':
      return '!bg-blue-600 !text-white';
    default:
      return '!bg-[#0f2a44] !text-white';
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
      className="glass-card-pro archon-instrument-tile cursor-pointer transition-all duration-500"
      style={{ borderTop: `4px solid ${hexColor}` }}
    >
      <div className="flex items-center justify-center gap-3 mb-4 w-full">
        <HeaderIcon size={20} style={{ color: hexColor }} />
        <span className="text-instrument-header text-[#0f2a44] opacity-80 uppercase tracking-widest">
          {headerTitle}
        </span>
      </div>

      <div className="archon-tile-payload space-y-8 pb-16">
        <div
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '4px',
            backgroundColor: `${hexColor}1a`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: `2px solid ${hexColor}66`,
          }}
        >
          <PayloadIcon size={40} style={{ color: hexColor }} />
        </div>
        <div className="flex flex-col items-center space-y-1 mb-12">
          <h3 className="text-[#0f2a44] font-black uppercase tracking-[0.15em] text-[14px]">
            {actionTitle}
          </h3>
          <p className="text-[10px] font-bold opacity-60 uppercase tracking-[0.2em] text-[#0f2a44]">
            {description}
          </p>
        </div>
      </div>

      <div className="archon-tile-action">
        <button
          data-testid={testId}
          className={`btn-sentinel-${variant} w-full ${
            isActive ? getActiveButtonClass(variant) : ''
          }`}
        >
          {buttonText}{' '}
          <ArrowRight size={10} className={`${isYellow ? 'text-[#0f2a44]' : 'text-white'} ml-2`} />
        </button>
      </div>
    </div>
  );
};

export default ArchonManagementCard;
