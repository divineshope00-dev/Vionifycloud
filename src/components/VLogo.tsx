import React from 'react';

export default function VLogo({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className={className} fill="currentColor">
      <path d="M 100,120 L 198,120 L 216.7,169.0 A 213,213 0 0,0 139.0,195.8 Z" />
      <path d="M 314,120 L 412,120 L 383.0,195.8 A 213,213 0 0,0 305.3,169.0 Z" />
      <path d="M 154.4,210.0 A 198,198 0 0,1 357.6,210.0 L 351.8,225.2 A 182,182 0 0,0 160.2,225.2 Z" />
      <path d="M 165.7,239.5 A 167,167 0 0,1 346.3,239.5 L 340.5,254.8 A 151,151 0 0,0 171.5,254.8 Z" />
      <path d="M 177.1,269.2 A 136,136 0 0,1 334.9,269.2 L 329.0,284.7 A 120,120 0 0,0 183.0,284.7 Z" />
      <path d="M 224,392 L 288,392 L 323.4,299.4 A 105,105 0 0,0 276.0,276.9 L 256,310 L 236.0,276.9 A 105,105 0 0,0 188.6,299.4 Z" />
    </svg>
  );
}
