import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface Corridor {
  id: string;
  from: string;
  fromFlag: string;
  fromX: number;
  fromY: number;
  fromColor: string;
  toX: number;
  toY: number;
  amount: string;
  duration: number;
  delay: number;
}

const corridors: Corridor[] = [
  {
    id: 'usa-in',
    from: 'USA',
    fromFlag: '🇺🇸',
    fromX: 148,
    fromY: 148,
    fromColor: '#3b82f6',
    toX: 610,
    toY: 208,
    amount: '$2.4B/yr',
    duration: 3.2,
    delay: 0,
  },
  {
    id: 'uk-in',
    from: 'UK',
    fromFlag: '🇬🇧',
    fromX: 388,
    fromY: 96,
    fromColor: '#8b5cf6',
    toX: 610,
    toY: 208,
    amount: '£1.1B/yr',
    duration: 2.6,
    delay: 0.5,
  },
  {
    id: 'uae-in',
    from: 'UAE',
    fromFlag: '🇦🇪',
    fromX: 530,
    fromY: 192,
    fromColor: '#14b8a6',
    toX: 610,
    toY: 208,
    amount: 'AED 3.2B/yr',
    duration: 2.0,
    delay: 0.3,
  },
  {
    id: 'ca-in',
    from: 'Canada',
    fromFlag: '🇨🇦',
    fromX: 178,
    fromY: 88,
    fromColor: '#ef4444',
    toX: 610,
    toY: 208,
    amount: 'C$0.9B/yr',
    duration: 3.6,
    delay: 0.8,
  },
  {
    id: 'au-in',
    from: 'Australia',
    fromFlag: '🇦🇺',
    fromX: 748,
    fromY: 308,
    fromColor: '#f59e0b',
    toX: 610,
    toY: 208,
    amount: 'A$0.7B/yr',
    duration: 2.8,
    delay: 1.2,
  },
];

// Compute an arc path between two points
const arcPath = (x1: number, y1: number, x2: number, y2: number): string => {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  // Perpendicular offset for curve
  const offset = -Math.sqrt(dx * dx + dy * dy) * 0.28;
  const cx = mx - (dy / Math.sqrt(dx * dx + dy * dy)) * offset;
  const cy = my + (dx / Math.sqrt(dx * dx + dy * dy)) * offset;
  return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
};

export const AnimatedMap: React.FC = () => {
  const [activeCorridors, setActiveCorridors] = useState<Set<string>>(new Set());
  const [pulseIndia, setPulseIndia] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setPulseIndia((p) => !p);
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Start all corridors
    setActiveCorridors(new Set(corridors.map((c) => c.id)));
  }, []);

  return (
    <div className="relative w-full rounded-2xl glass-card overflow-hidden border border-slate-200/70 dark:border-slate-800 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200/50 dark:border-slate-800/50">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-bold text-sm text-slate-900 dark:text-white tracking-tight">
            🌍 Global Remittance Money Flow — Live Corridors
          </span>
        </div>
        <div className="text-[11px] font-mono text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-full border border-blue-500/20 font-semibold">
          {corridors.length} Active Routes → India
        </div>
      </div>

      {/* SVG World Map */}
      <div className="relative bg-slate-950/30 dark:bg-slate-950/50">
        {/* Grid dot background */}
        <div
          className="absolute inset-0 opacity-[0.06] dark:opacity-[0.12] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(#3b82f6 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        />

        <svg
          viewBox="0 0 900 370"
          className="w-full"
          style={{ maxHeight: '340px' }}
        >
          <defs>
            {/* Glow filter for particles */}
            <filter id="glow-particle">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Glow filter for India node */}
            <filter id="glow-india">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Gradients for each corridor */}
            {corridors.map((c) => (
              <linearGradient
                key={`grad-${c.id}`}
                id={`grad-${c.id}`}
                gradientUnits="userSpaceOnUse"
                x1={c.fromX}
                y1={c.fromY}
                x2={c.toX}
                y2={c.toY}
              >
                <stop offset="0%" stopColor={c.fromColor} stopOpacity="0.8" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.8" />
              </linearGradient>
            ))}
          </defs>

          {/* Render Arc Paths */}
          {corridors.map((corridor) => {
            const path = arcPath(
              corridor.fromX,
              corridor.fromY,
              corridor.toX,
              corridor.toY
            );
            return (
              <g key={corridor.id}>
                {/* Static trail arc */}
                <path
                  d={path}
                  fill="none"
                  stroke={corridor.fromColor}
                  strokeWidth="1.5"
                  strokeDasharray="5 5"
                  strokeOpacity="0.2"
                />
                {/* Glowing gradient arc */}
                <path
                  d={path}
                  fill="none"
                  stroke={`url(#grad-${corridor.id})`}
                  strokeWidth="1.5"
                  strokeOpacity="0.5"
                />
                {/* Moving money particle — dot 1 */}
                <motion.circle
                  r="4.5"
                  fill={corridor.fromColor}
                  filter="url(#glow-particle)"
                >
                  <animateMotion
                    path={path}
                    dur={`${corridor.duration}s`}
                    begin={`${corridor.delay}s`}
                    repeatCount="indefinite"
                  />
                </motion.circle>
                {/* Moving money particle — dot 2 (offset) */}
                <motion.circle
                  r="3"
                  fill={corridor.fromColor}
                  opacity="0.6"
                >
                  <animateMotion
                    path={path}
                    dur={`${corridor.duration}s`}
                    begin={`${corridor.delay + corridor.duration * 0.4}s`}
                    repeatCount="indefinite"
                  />
                </motion.circle>
              </g>
            );
          })}

          {/* Source Country Nodes */}
          {corridors.map((corridor) => (
            <g
              key={`node-${corridor.id}`}
              transform={`translate(${corridor.fromX}, ${corridor.fromY})`}
            >
              {/* Outer glow ring */}
              <circle
                r="14"
                fill={corridor.fromColor}
                opacity="0.08"
              />
              {/* Node circle */}
              <circle
                r="7"
                fill={corridor.fromColor}
                opacity="0.9"
              />
              {/* Inner dot */}
              <circle r="3" fill="white" opacity="0.7" />

              {/* Label */}
              <text
                x="0"
                y="-15"
                textAnchor="middle"
                fontSize="11"
                fontWeight="700"
                fontFamily="Inter, system-ui, sans-serif"
                fill="currentColor"
                className="fill-slate-700 dark:fill-slate-200"
              >
                {corridor.fromFlag} {corridor.from}
              </text>
              <text
                x="0"
                y="-4"
                textAnchor="middle"
                fontSize="8"
                fontFamily="monospace"
                opacity="0.6"
                fill="currentColor"
                className="fill-slate-500 dark:fill-slate-400"
              >
                {corridor.amount}
              </text>
            </g>
          ))}

          {/* India — Destination Node */}
          <g transform="translate(610, 208)">
            {/* Animated ping rings */}
            <circle r="32" fill="#10b981" opacity="0.05">
              <animate
                attributeName="r"
                values="20;38;20"
                dur="2.4s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                values="0.15;0;0.15"
                dur="2.4s"
                repeatCount="indefinite"
              />
            </circle>
            <circle r="20" fill="#10b981" opacity="0.12">
              <animate
                attributeName="r"
                values="14;26;14"
                dur="2.4s"
                begin="0.4s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                values="0.25;0;0.25"
                dur="2.4s"
                begin="0.4s"
                repeatCount="indefinite"
              />
            </circle>

            {/* Node */}
            <circle r="13" fill="#10b981" opacity="0.9" filter="url(#glow-india)" />
            <circle r="7" fill="white" opacity="0.9" />
            <circle r="3.5" fill="#10b981" />

            {/* Labels */}
            <text
              x="0"
              y="26"
              textAnchor="middle"
              fontSize="12"
              fontWeight="800"
              fontFamily="Inter, system-ui, sans-serif"
              fill="currentColor"
              className="fill-slate-900 dark:fill-white"
            >
              🇮🇳 India (INR)
            </text>
            <text
              x="0"
              y="38"
              textAnchor="middle"
              fontSize="9"
              fontFamily="monospace"
              fontWeight="600"
              fill="#10b981"
            >
              Primary Destination Hub
            </text>
          </g>
        </svg>
      </div>

      {/* Footer Stats */}
      <div className="flex items-center justify-between px-5 py-2.5 border-t border-slate-200/40 dark:border-slate-800/40 text-[11px]">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            Source Country
          </span>
          <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Destination Hub
          </span>
        </div>
        <span className="font-mono font-semibold text-emerald-500 flex items-center gap-1">
          ⚡ Smart Routing Active — Real-time API Feed
        </span>
      </div>
    </div>
  );
};
