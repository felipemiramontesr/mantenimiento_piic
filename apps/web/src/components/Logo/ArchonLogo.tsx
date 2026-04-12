import React from 'react';

interface ArchonLogoProps {
  isCollapsed: boolean;
  size?: number;
}

const ArchonLogo: React.FC<ArchonLogoProps> = ({ isCollapsed, size = 44 }) => (
  <div 
    style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: isCollapsed ? '0' : '5.3px', // Reduced by 1/3 (from 8px)
      justifyContent: isCollapsed ? 'center' : 'flex-start',
      transition: 'all 0.3s ease'
    }}
  >
    {/* Outline Hexagon Icon (Transparent Fill) */}
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0 }}
    >
      {/* Hollow Hexagon (Outline Only) */}
      <path 
        d="M50 8L86.5 29V71L50 92L13.5 71V29L50 8Z" 
        stroke="#f2b705" 
        strokeWidth="12"
        fill="none" 
      />
    </svg>

    {/* Brand Text ArchonCore⬢ */}
    {!isCollapsed && (
      <div style={{ display: 'flex', alignItems: 'baseline' }}>
        <h1 style={{ 
          fontSize: '26px', // Increased size for more presence
          fontWeight: 900, 
          margin: 0, 
          letterSpacing: '-0.03em',
          fontFamily: 'Inter, system-ui, sans-serif',
          display: 'flex',
          alignItems: 'baseline'
        }}>
          <span style={{ color: '#f2b705' }}>Archon</span>
          <span style={{ color: '#ffffff' }}>Core</span>
        </h1>
        {/* Hexagonal Terminal Point (Technological Period) */}
        <svg 
          width="15" // Increased by 50% (from 10)
          height="15" // Increased by 50% (from 10)
          viewBox="0 0 100 100" 
          style={{ marginLeft: '4px', alignSelf: 'baseline' }} 
        >
          <path 
            d="M50 5L89.5 27.5V72.5L50 95L10.5 72.5V27.5L50 5Z" 
            fill="#f2b705" // Yellow as requested
          />
        </svg>
      </div>
    )}
  </div>
);

export default ArchonLogo;
