import React from 'react';

interface ArchonLogoProps {
  isCollapsed: boolean;
  size?: number;
}

const ArchonLogo: React.FC<ArchonLogoProps> = ({ isCollapsed, size = 32 }) => (
  <div 
    style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: isCollapsed ? '0' : '12px',
      justifyContent: isCollapsed ? 'center' : 'flex-start',
      transition: 'all 0.3s ease'
    }}
  >
    {/* Fractal Hexagon Core Icon */}
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0 }}
    >
      {/* Outer Hexagon (Tech Yellow) */}
      <path 
        d="M50 5L89.5 27.5V72.5L50 95L10.5 72.5V27.5L50 5Z" 
        fill="#f2b705" 
      />
      {/* Inner Core Hexagon (Surgical White) */}
      <path 
        d="M50 35L63.5 42.5V57.5L50 65L36.5 57.5V42.5L50 35Z" 
        fill="#ffffff" 
      />
    </svg>

    {/* Brand Text ArchonCore⬢ */}
    {!isCollapsed && (
      <div style={{ display: 'flex', alignItems: 'baseline' }}>
        <h1 style={{ 
          fontSize: '20px', 
          fontWeight: 800, 
          color: '#f2b705', 
          margin: 0, 
          letterSpacing: '-0.02em',
          fontFamily: 'Inter, system-ui, sans-serif'
        }}>
          ArchonCore
        </h1>
        {/* Hexagonal Terminal Point */}
        <svg 
          width="8" 
          height="8" 
          viewBox="0 0 100 100" 
          style={{ marginLeft: '4px', alignSelf: 'center' }}
        >
          <path 
            d="M50 5L89.5 27.5V72.5L50 95L10.5 72.5V27.5L50 5Z" 
            fill="#ffffff" 
          />
        </svg>
      </div>
    )}
  </div>
);

export default ArchonLogo;
