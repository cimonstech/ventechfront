'use client';

import React from 'react';

interface CheckmarkLoaderProps {
  size?: number; // px
  color?: string; // stroke color
  strokeWidth?: number; // px
  loop?: boolean; // whether to continuously erase and redraw
  speedMs?: number; // total cycle duration
}

// An animated outline-only orange checkmark that draws progressively.
const CheckmarkLoader: React.FC<CheckmarkLoaderProps> = ({
  size = 64,
  color = '#FF7A19',
  strokeWidth = 6,
  loop = true,
  speedMs = 1100,
}) => {
  // Normalize path length so animation traces precisely from start to end regardless of actual SVG length
  const norm = 1;
  return (
    <div style={{ width: size, height: size }} aria-label="Loading" role="status">
      <svg
        viewBox="0 0 48 48"
        width={size}
        height={size}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Checkmark with slight curve to match visual style */}
        <path
          d="M10 26 C12 28, 18 33, 20 34 C22 35, 34 18, 38 12"
          pathLength={norm}
          style={{
            strokeDasharray: norm,
            strokeDashoffset: norm,
            animation: loop
              ? `cm-draw-erasing ${speedMs * 2}ms cubic-bezier(.4,.0,.2,1) infinite`
              : `cm-draw-once ${speedMs}ms cubic-bezier(.4,.0,.2,1) forwards`,
          }}
        />
      </svg>

      <style jsx>{`
        @keyframes cm-draw-once {
          to { stroke-dashoffset: 0; }
        }
        @keyframes cm-draw-erasing {
          0% { stroke-dashoffset: ${norm}; }
          50% { stroke-dashoffset: 0; }
          65% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: ${norm}; }
        }
      `}</style>
    </div>
  );
};

export default CheckmarkLoader;


