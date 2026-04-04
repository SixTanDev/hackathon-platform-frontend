'use client';

import { useEffect, useId, useState } from 'react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  size?: number;
}

/**
 * Logo component with a premium 3D rotating shield and lightning bolt.
 * Redesigned for SAMP platform with slow, continuous rotation.
 */
export function Logo({ className, size = 48 }: LogoProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const id = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted ? resolvedTheme === 'dark' : true;
  const shieldGradientId = `${id}-shieldGradient`;
  const lightningGradientId = `${id}-lightningFG`;
  const cyanBackdropId = `${id}-cyanBackdrop`;
  const shineId = `${id}-shine`;

  return (
    <div 
      className={cn("relative flex items-center justify-center", className)}
      style={{ 
        width: size, 
        height: size,
        perspective: '1000px' 
      }}
    >
      <style jsx>{`
        @keyframes rotate-y {
          0% { transform: rotateY(0deg); }
          100% { transform: rotateY(360deg); }
        }
        .spinning-shield {
          animation: rotate-y 8s linear infinite;
          transform-style: preserve-3d;
        }
        .shield-container {
          filter: drop-shadow(0 0 10px rgba(26, 127, 179, 0.3));
          transition: filter 0.3s ease;
        }
        .shield-container:hover {
          filter: drop-shadow(0 0 15px rgba(26, 127, 179, 0.5));
        }
      `}</style>
      
      <div className="shield-container spinning-shield w-full h-full">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          <defs>
            {/* Metallic Shield Gradient */}
            <linearGradient id={shieldGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={isDark ? "#0a192f" : "#002d4d"} />
              <stop offset="50%" stopColor={isDark ? "#112240" : "#004669"} />
              <stop offset="100%" stopColor={isDark ? "#0a192f" : "#002d4d"} />
            </linearGradient>
            
            {/* Lightning Foreground Gradient */}
            <linearGradient id={lightningGradientId} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f7941d" />
              <stop offset="100%" stopColor="#ff5e00" />
            </linearGradient>

            {/* Cyan Backdrop for Lightning */}
            <linearGradient id={cyanBackdropId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00d2ff" />
              <stop offset="100%" stopColor="#3a7bd5" />
            </linearGradient>

            {/* Shine effect */}
            <linearGradient id={shineId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="white" stopOpacity="0.15" />
              <stop offset="50%" stopColor="white" stopOpacity="0.05" />
              <stop offset="100%" stopColor="white" stopOpacity="0.1" />
            </linearGradient>
          </defs>

          {/* Shield Shape */}
          <path
            d="M12 2L3 6v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V6l-9-4z"
            fill={`url(#${shieldGradientId})`}
            stroke={isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.1)"}
            strokeWidth="0.5"
          />
          
          {/* Shine overlay */}
          <path
            d="M12 2L3 6v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V6l-9-4z"
            fill={`url(#${shineId})`}
          />

          {/* Cyan Backdrop (Rectangle/Path behind lightning) */}
          <path
            d="M10 6.5L8.5 13H11L10 18.5L15.5 11H13L14.5 6.5H10Z"
            fill={`url(#${cyanBackdropId})`}
            opacity="0.9"
            className="drop-shadow-sm"
          />

          {/* Orange Lightning Bolt (Slightly offset for depth) */}
          <path
            d="M12.5 3L6 13h5.5l-1 8L18 11h-5.5l1-8z"
            fill={`url(#${lightningGradientId})`}
            className="drop-shadow-md"
          />
        </svg>
      </div>
    </div>
  );
}
