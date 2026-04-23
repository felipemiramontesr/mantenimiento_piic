import React from 'react';

/**
 * 🔱 Archon Silk Hydration: ArchonSkeleton
 * Implementation: Shimmer Loading Animation
 * v.1.0.0 - Global Standards
 */

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  borderRadius?: string;
}

export const ArchonSkeleton: React.FC<SkeletonProps> = ({
  className = '',
  width = '100%',
  height = '20px',
  borderRadius = '4px',
}) => (
  <div
    className={`animate-pulse bg-slate-200 ${className}`}
    style={{
      width,
      height,
      borderRadius,
    }}
  />
);

export const ArchonCardSkeleton: React.FC = () => (
  <div className="glass-card-pro bg-white p-10 space-y-6 opacity-60">
    <div className="flex items-center space-x-4">
      <ArchonSkeleton width={48} height={48} borderRadius="50%" />
      <div className="space-y-2 flex-grow">
        <ArchonSkeleton width="60%" height={24} />
        <ArchonSkeleton width="40%" height={16} />
      </div>
    </div>
    <div className="space-y-3 pt-4">
      <ArchonSkeleton width="100%" height={14} />
      <ArchonSkeleton width="90%" height={14} />
      <ArchonSkeleton width="95%" height={14} />
    </div>
    <div className="pt-6 flex justify-between">
      <ArchonSkeleton width={100} height={32} />
      <ArchonSkeleton width={100} height={32} />
    </div>
  </div>
);

export const ArchonTableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <div className="w-full space-y-4">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex space-x-4 p-4 border-b border-slate-100 items-center">
        <ArchonSkeleton width={40} height={40} borderRadius="4px" />
        <ArchonSkeleton width="20%" height={20} />
        <ArchonSkeleton width="30%" height={20} />
        <ArchonSkeleton width="15%" height={20} />
        <ArchonSkeleton width="10%" height={20} />
      </div>
    ))}
  </div>
);

export default ArchonSkeleton;
