'use client';

import { useRef, useState, type ReactNode, type MouseEvent } from 'react';

export function SpotlightCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 50, y: 50 });

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setPosition({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      className={`card-spotlight ${className}`}
      style={{ ['--mouse-x' as string]: `${position.x}%`, ['--mouse-y' as string]: `${position.y}%` }}
    >
      {children}
    </div>
  );
}
