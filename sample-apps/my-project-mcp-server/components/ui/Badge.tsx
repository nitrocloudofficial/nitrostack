import type { ReactNode } from 'react';

export type BadgeTone = 'verified' | 'amber' | 'ink' | 'slate';

const TONE_CLASSES: Record<BadgeTone, string> = {
  verified: 'bg-teal-500/15 text-teal-800 border border-teal-300/50 backdrop-blur-md',
  amber: 'bg-amber-400/15 text-amber-800 border border-amber-300/50 backdrop-blur-md',
  ink: 'bg-slate-900/75 text-white border border-white/20 backdrop-blur-md',
  slate: 'bg-white/40 text-slate-700 border border-white/60 backdrop-blur-md',
};

export function Badge({
  children,
  tone = 'slate',
  className = '',
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  const toneClass = TONE_CLASSES[tone] ?? TONE_CLASSES.slate;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold tracking-wide uppercase shadow-2xs ${toneClass} ${className}`}
    >
      {children}
    </span>
  );
}
