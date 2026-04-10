import React from 'react';

const PiicLogo: React.FC<{ className?: string }> = ({ className }) => (
  <div className={`logo flex items-center gap-3 ${className || ''}`}>
    <svg 
      width="40" 
      height="40" 
      viewBox="0 0 40 40" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className="logo-icon"
    >
      {/* 🌕 Círculo Solar Dividido */}
      {/* Mitad Izquierda: Contorno */}
      <path 
        d="M20 2C10.0589 2 2 10.0589 2 20C2 29.9411 10.0589 38 20 38" 
        stroke="#F2B705" 
        strokeWidth="4" 
        strokeLinecap="round"
      />
      {/* Mitad Derecha: Sólido */}
      <path 
        d="M20 2C29.9411 2 38 10.0589 38 20C38 29.9411 29.9411 38 20 38V2Z" 
        fill="#F2B705"
      />
    </svg>
    <span className="text-white text-2xl font-black tracking-tighter">
      PIIC
    </span>
  </div>
);

export default PiicLogo;
