import React, { useEffect, useState } from 'react';

interface ConfidenceMeterProps {
  score: number; // 0–100
  label?: string;
}

export const ConfidenceMeter: React.FC<ConfidenceMeterProps> = ({
  score,
  label = 'AI Confidence',
}) => {
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      let start = 0;
      const step = score / 30;
      const interval = setInterval(() => {
        start += step;
        if (start >= score) {
          setAnimatedScore(score);
          clearInterval(interval);
        } else {
          setAnimatedScore(Math.round(start));
        }
      }, 30);
      return () => clearInterval(interval);
    }, 200);
    return () => clearTimeout(timer);
  }, [score]);

  const segments = 20;
  const filledSegments = Math.round((animatedScore / 100) * segments);

  const getColor = () => {
    if (score >= 90) return { fill: '#10b981', text: 'text-emerald-500 dark:text-emerald-400', label: 'Excellent' };
    if (score >= 75) return { fill: '#14b8a6', text: 'text-teal-500 dark:text-teal-400', label: 'High' };
    if (score >= 60) return { fill: '#f59e0b', text: 'text-amber-500 dark:text-amber-400', label: 'Medium' };
    return { fill: '#ef4444', text: 'text-rose-500 dark:text-rose-400', label: 'Low' };
  };

  const { fill, text, label: riskLabel } = getColor();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-500 dark:text-slate-400 font-medium">{label}</span>
        <span className={`font-mono font-black text-sm ${text}`}>
          {animatedScore}%
        </span>
      </div>

      {/* Segmented Progress Bar */}
      <div className="flex gap-[3px]">
        {Array.from({ length: segments }).map((_, i) => (
          <div
            key={i}
            className="confidence-segment transition-all duration-500"
            style={{
              backgroundColor: i < filledSegments ? fill : undefined,
              opacity: i < filledSegments ? 1 - (i * 0.02) : undefined,
              transitionDelay: `${i * 18}ms`,
            }}
            aria-hidden="true"
          >
            {i >= filledSegments && (
              <div
                className="h-full w-full rounded-sm"
                style={{ backgroundColor: 'rgba(148, 163, 184, 0.15)' }}
              />
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between text-[10px] font-mono">
        <span className="text-slate-400">0</span>
        <span className={`font-bold uppercase tracking-wider ${text}`}>
          {riskLabel} Confidence
        </span>
        <span className="text-slate-400">100</span>
      </div>
    </div>
  );
};
