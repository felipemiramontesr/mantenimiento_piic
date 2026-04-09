import React from 'react';
import { motion } from 'framer-motion';

export const PiicLogo: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <defs>
          <clipPath id="logoMask">
            <circle cx="50" cy="50" r="45" />
          </clipPath>
        </defs>
        
        {/* Base Layer */}
        <rect x="0" y="0" width="100" height="100" fill="#F2B705" clipPath="url(#logoMask)" />
        
        {/* Sun/Moon Animation Cycle */}
        {/* Phase 1: Sun Growth (Yellow grows left) -> Logic: The blue layer recedes */}
        {/* Phase 2: Moon Entry (Blue covers all) */}
        {/* Phase 3: Sun Restoration (Yellow returns half) */}
        
        <motion.rect
          x="50"
          y="0"
          width="50"
          height="100"
          fill="#0F2A44"
          clipPath="url(#logoMask)"
          animate={{
            x: [50, 0, 50],
            width: ["50%", "100%", "50%"],
          }}
          transition={{
            duration: 30,
            repeat: Infinity,
            ease: "linear",
            times: [0, 0.25, 1], // Simplified cycle for MVP
          }}
        />

        {/* Static Border */}
        <circle cx="50" cy="50" r="45" fill="none" stroke="#F2B705" strokeWidth="10" />
      </svg>
    </div>
  );
};
