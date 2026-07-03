import React from 'react';

interface PremiumIconProps {
  className?: string;
  size?: number | string;
  bgColor?: string;
  fgColor?: string;
}

export default function PremiumIcon({ 
  className = '', 
  size = '100%', 
  bgColor = '#a855f7', // purple-500
  fgColor = '#ffffff' 
}: PremiumIconProps) {
  return (
    <svg 
      viewBox="0 0 512 512" 
      width={size} 
      height={size} 
      className={`${className} shrink-0`}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Circular background */}
      <circle cx="256" cy="256" r="256" fill={bgColor} />
      
      {/* Logo group filled with foreground color */}
      <g fill={fgColor}>
        {/* Top Left Wing */}
        <path d="M 120,120 L 208,120 L 226.7,169.0 A 213,213 0 0,0 149.0,195.8 Z" />
        
        {/* Top Right Wing */}
        <path d="M 304,120 L 392,120 L 363.0,195.8 A 213,213 0 0,0 285.3,169.0 Z" />
        
        {/* Arc 1 (Outer) --> Note: we flip SVG A-path flags to render curves matching the favicon perfectly */}
        <path d="M 154.4,210.0 A 198,198 0 0,1 357.6,210.0 L 351.8,225.2 A 182,182 0 0,0 160.2,225.2 Z" />
        
        {/* Arc 2 (Middle) */}
        <path d="M 165.7,239.5 A 167,167 0 0,1 346.3,239.5 L 340.5,254.8 A 151,151 0 0,0 171.5,254.8 Z" />
        
        {/* Arc 3 (Inner) */}
        <path d="M 177.1,269.2 A 136,136 0 0,1 334.9,269.2 L 329.0,284.7 A 120,120 0 0,0 183.0,284.7 Z" />
        
        {/* Bottom Piece */}
        <path d="M 224,392 L 288,392 L 323.4,299.4 A 105,105 0 0,0 276.0,276.9 L 256,310 L 236.0,276.9 A 105,105 0 0,0 188.6,299.4 Z" />
      </g>
    </svg>
  );
}
