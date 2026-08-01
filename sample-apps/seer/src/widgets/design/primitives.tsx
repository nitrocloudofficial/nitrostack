'use client';

import type { CSSProperties, ReactNode } from 'react';

export type Tone = 'signal' | 'caution' | 'alert' | 'muted';

const toneText: Record<Tone, string> = {
  signal: 'text-signal',
  caution: 'text-caution',
  alert: 'text-alert',
  muted: 'text-muted',
};

const toneBorder: Record<Tone, string> = {
  signal: 'border-signal',
  caution: 'border-caution',
  alert: 'border-alert',
  muted: 'border-muted',
};

const toneBg: Record<Tone, string> = {
  signal: 'bg-signal',
  caution: 'bg-caution',
  alert: 'bg-alert',
  muted: 'bg-muted',
};

export function cx(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ');
}

/** A measurement scale. See `.tick-rule` in globals.css. */
export function TickRule() {
  return <div aria-hidden className="tick-rule mt-2" />;
}

export function Frame({ maxHeight, children }: { maxHeight?: number | null; children: ReactNode }) {
  return (
    <main
      className="bg-canvas text-ink font-ui text-body min-h-[360px] overflow-auto p-4"
      style={{ maxHeight: maxHeight || 700 }}
    >
      {children}
    </main>
  );
}

export function Masthead({ label, title, subtitle, aside }: {
  label: string;
  title: string;
  subtitle?: string;
  aside?: ReactNode;
}) {
  return (
    <header className="mb-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-mono tabular text-micro text-muted m-0">{label}</p>
          <h1 className="text-title font-strong tracking-title mt-1 mb-0">{title}</h1>
          {subtitle && <p className="text-body text-muted mt-1 mb-0 max-w-[62ch]">{subtitle}</p>}
        </div>
        {aside}
      </div>
      <TickRule />
    </header>
  );
}

export function Panel({ title, note, accent, flush, children, className }: {
  title?: string;
  note?: string;
  accent?: Tone;
  flush?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cx(
        'bg-surface border border-rule rounded-lg p-3',
        accent && `border-l-2 ${toneBorder[accent]}`,
        !flush && 'mt-3',
        className,
      )}
    >
      {title && <h2 className="text-lead font-strong tracking-title m-0">{title}</h2>}
      {note && <p className="text-small text-muted mt-1 mb-0">{note}</p>}
      {(title || note) && <div className="h-3" />}
      {children}
    </section>
  );
}

/** A label above a value. Values are monospaced so columns line up. */
export function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-sunken rounded-md px-3 py-2 min-w-0">
      <div className="text-micro text-muted mb-0.5">{label}</div>
      <div className="font-mono tabular text-body font-medium truncate" title={value}>{value}</div>
    </div>
  );
}

export function Figure({ label, value, detail }: { label?: string; value: string; detail?: string }) {
  return (
    <div>
      {label && <div className="font-mono tabular text-micro text-muted">{label}</div>}
      <div className="font-mono tabular text-figure font-strong tracking-figure my-0.5">{value}</div>
      {detail && <div className="text-small text-signal">{detail}</div>}
    </div>
  );
}

/** Rectangular, not a pill — these are labels, not badges. */
export function Tag({ children, tone }: { children: ReactNode; tone?: Tone }) {
  return (
    <span
      className={cx(
        'font-mono tabular text-micro rounded-sm border px-1.5 py-0.5 whitespace-nowrap',
        tone ? `${toneText[tone]} ${toneBorder[tone]}` : 'text-ink border-rule',
      )}
    >
      {children}
    </span>
  );
}

export function TagRow({ label, values, tone }: { label?: string; values: string[]; tone?: Tone }) {
  return (
    <div>
      {label && <div className="text-micro text-muted mb-1">{label}</div>}
      <div className="flex flex-wrap gap-1">
        {values.map((value) => <Tag key={value} tone={tone}>{value}</Tag>)}
      </div>
    </div>
  );
}

export function Meter({ fraction, tone = 'signal' }: { fraction: number; tone?: Tone }) {
  const clamped = Math.max(0, Math.min(1, Number.isFinite(fraction) ? fraction : 0));
  return (
    <div className="bg-rule rounded-sm h-1.5 overflow-hidden">
      <div className={cx('h-full', toneBg[tone])} style={{ width: `${clamped * 100}%` }} />
    </div>
  );
}

export function Note({ tone = 'caution', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <p
      className={cx(
        'text-small text-ink border-l-2 rounded-r-sm px-3 py-2 mt-2 mb-0',
        toneBorder[tone],
        tone === 'caution' && 'bg-caution-surface',
      )}
    >
      {children}
    </p>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="text-small text-muted m-0">{children}</p>;
}

export function Loading({ children }: { children: ReactNode }) {
  return <div className="bg-canvas text-muted font-ui text-body p-6">{children}</div>;
}

export const buttonBase = 'rounded-md px-3 py-2 text-body font-medium cursor-pointer border';
export const buttonPrimary = cx(buttonBase, 'bg-signal text-surface border-transparent disabled:opacity-70');
export const buttonQuiet = cx(buttonBase, 'bg-transparent text-alert border-alert');

/** Tailwind cannot see a runtime value, so the track width arrives as a variable. */
export const autoGrid = 'grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(var(--min),1fr))]';

export function autoGridStyle(min: number): CSSProperties {
  return { '--min': `${min}px` } as CSSProperties;
}

export const th = 'text-left font-regular text-muted pr-2 pb-2';
export const td = 'text-left pr-2 py-2';
export const tdNum = 'text-left pr-2 py-2 font-mono tabular';
