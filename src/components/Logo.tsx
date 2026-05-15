import React from 'react';

export const Logo = ({ size = 120, color = "currentColor", className = "" }: { size?: number, color?: string, className?: string }) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 512 512" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={`transition-all duration-300 ${className}`}
    >
      <g transform="translate(256, 256)">
        {/* Creating a dense, geometric flower pattern using 30 overlapping ellipses */}
        {[...Array(30)].map((_, i) => {
          const rotation = i * 6; // 360 / 60 or balanced degrees
          return (
            <ellipse
              key={i}
              cx="0"
              cy="0"
              rx={180}
              ry={60}
              transform={`rotate(${rotation})`}
              stroke={color}
              strokeWidth="0.3"
              strokeOpacity={0.15}
              fill="none"
            />
          );
        })}
        
        {/* Core geometric accents */}
        <circle r="40" stroke={color} strokeWidth="0.5" strokeOpacity="0.2" fill="none" />
        <circle r="5" fill={color} fillOpacity="0.8" />
        
        {/* Radial details */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
          <line
            key={i}
            x1="0"
            y1="0"
            x2={200 * Math.cos(angle * Math.PI / 180)}
            y2={200 * Math.sin(angle * Math.PI / 180)}
            stroke={color}
            strokeWidth="0.2"
            strokeOpacity="0.1"
            className="hidden md:block"
          />
        ))}
      </g>
    </svg>
  );
};

export const SmartAILogo = ({ white = false, size = 64 }: { white?: boolean, size?: number }) => (
  <div className="flex flex-col items-center justify-center gap-2">
    <Logo size={size} color={white ? "white" : "white"} />
    <div className="flex flex-col items-center">
      <h1 className={`text-2xl font-sans font-medium tracking-[0.2em] ${white ? 'text-white' : 'text-white'}`}>
        SMART AI
      </h1>
      <div className="h-[1px] w-full bg-white opacity-20 my-1"></div>
      <p className={`text-[10px] tracking-[0.1em] opacity-60 ${white ? 'text-white' : 'text-white'}`}>
        CREATED BY SHARMA'S
      </p>
    </div>
  </div>
);
