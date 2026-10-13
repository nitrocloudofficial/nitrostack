'use client';

import React, { useEffect, useState } from 'react';

interface OrbitalGaugeProps {
  beforeDir: number;
  afterDir: number;
  threshold?: number;
}

const RADIUS = 120;
const CENTER = 140;

function dirToAngle(dir: number): number {
  const clamped = Math.min(Math.max(dir, 0), 1.2);
  return -225 + (clamped / 1.2) * 270;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

export default function OrbitalGauge({ beforeDir, afterDir, threshold = 0.8 }: OrbitalGaugeProps) {
  const [displayedDir, setDisplayedDir] = useState(beforeDir);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplayedDir(afterDir);
      return;
    }

    const duration = 1200;
    const start = performance.now();
    let frame: number;
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayedDir(beforeDir + (afterDir - beforeDir) * eased);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [beforeDir, afterDir]);

  const thresholdAngle = dirToAngle(threshold);
  const dotAngle = dirToAngle(displayedDir);
  const dotPos = polarToCartesian(CENTER, CENTER, RADIUS, dotAngle);
  const isSafe = displayedDir >= threshold;
  const activeColor = isSafe ? 'var(--aurora-cyan, #22d3ee)' : 'var(--supernova-red, #fb3b49)';

  return (
    <svg viewBox="0 0 280 280" className="w-full max-w-xs mx-auto" role="img" aria-label="Disparate Impact Ratio gauge">
      {Array.from({ length: 20 }).map((_, i) => (
        <circle
          key={i}
          cx={(i * 37) % 280}
          cy={(i * 53) % 280}
          r={0.8}
          fill="var(--starlight, #e4e4f0)"
          opacity={0.15}
        />
      ))}

      <path d={describeArc(CENTER, CENTER, RADIUS, -225, thresholdAngle)} stroke="var(--supernova-red, #fb3b49)" strokeWidth={6} strokeOpacity={0.35} fill="none" />
      <path d={describeArc(CENTER, CENTER, RADIUS, thresholdAngle, 45)} stroke="var(--aurora-cyan, #22d3ee)" strokeWidth={6} strokeOpacity={0.35} fill="none" />

      <circle cx={polarToCartesian(CENTER, CENTER, RADIUS, thresholdAngle).x} cy={polarToCartesian(CENTER, CENTER, RADIUS, thresholdAngle).y} r={4} fill="var(--starlight, #e4e4f0)" />
      <text
        x={polarToCartesian(CENTER, CENTER, RADIUS + 18, thresholdAngle).x}
        y={polarToCartesian(CENTER, CENTER, RADIUS + 18, thresholdAngle).y}
        fill="var(--dust, #6b7089)" fontFamily="var(--font-mono, monospace)" fontSize={11} textAnchor="middle"
      >
        0.80
      </text>

      <circle cx={dotPos.x} cy={dotPos.y} r={9} fill={activeColor} style={{ filter: `drop-shadow(0 0 8px ${activeColor})` }} />

      <text x={CENTER} y={CENTER - 4} textAnchor="middle" fill="var(--starlight, #e4e4f0)" fontFamily="var(--font-display, sans-serif)" fontSize={32} fontWeight={600}>
        {displayedDir.toFixed(2)}
      </text>
      <text x={CENTER} y={CENTER + 18} textAnchor="middle" fill="var(--dust, #6b7089)" fontFamily="var(--font-mono, monospace)" fontSize={11}>
        DISPARATE IMPACT RATIO
      </text>
    </svg>
  );
}
