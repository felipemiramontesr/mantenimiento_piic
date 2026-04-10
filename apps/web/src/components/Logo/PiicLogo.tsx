import React from 'react';

const PiicLogo: React.FC<{ className?: string }> = ({ className }) => (
  <div className={`logo ${className || ''}`}>
    <svg className="logo-icon animated-logo" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <defs>
        <clipPath id="logoMask">
          <circle cx="50" cy="50" r="45" />
        </clipPath>
      </defs>
      
      {/* Capa 1: Base Amarilla */}
      <rect x="0" y="0" width="100" height="100" fill="#F2B705" clipPath="url(#logoMask)" />
      
      {/* Capa 1.1: Base Azul (Lado Izquierdo) */}
      <rect x="0" y="0" width="50" height="100" fill="#0F2A44" clipPath="url(#logoMask)" />

      {/* Capa 2: Animación Sol Crece */}
      <rect className="sun-grow-left-v5" x="50" y="0" width="0" height="100" fill="#F2B705" clipPath="url(#logoMask)" />

      {/* Capa 3: Animación Luna Llena */}
      <rect className="luna-full-rl-v5" x="100" y="0" width="100" height="100" fill="#0F2A44" clipPath="url(#logoMask)" />

      {/* Capa 4: Animación Sol Restauración */}
      <rect className="sol-half-rl-v5" x="100" y="0" width="50" height="100" fill="#F2B705" clipPath="url(#logoMask)" />

      {/* Borde Estático */}
      <circle cx="50" cy="50" r="45" fill="none" stroke="#F2B705" strokeWidth="10" />
    </svg>
    <span className="logo-text">PIIC</span>
  </div>
);

export default PiicLogo;
