'use client';

/**
 * MigrateEase UI primitives.
 *
 * Styles are inline-object based so the widget bundle stays self-contained
 * (no CSS module or Tailwind step in the widget build); brand values come
 * from the CSS custom properties in app/globals.css.
 */

import React, { CSSProperties, ReactNode } from 'react';

/* ---------------------------------- Brand --------------------------------- */

export function Logo({ size = 32 }: { size?: number }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      <svg width={size} height={size} viewBox="0 0 40 40" role="img" aria-label="MigrateEase">
        <rect width="40" height="40" rx="11" fill="var(--me-blue-600)" />
        <path
          d="M11 26.5 20 12l9 14.5"
          fill="none"
          stroke="#fff"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="20" cy="22.5" r="2.6" fill="#fff" />
      </svg>
    </span>
  );
}

export function WordMark({ size = 20 }: { size?: number }) {
  return (
    <span style={{ fontSize: size, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--me-text)' }}>
      Migrate<span style={{ color: 'var(--me-blue-600)' }}>Ease</span>
    </span>
  );
}

/* ---------------------------------- Shell --------------------------------- */

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: 'var(--me-canvas)', minHeight: '100%', width: '100%' }}>
      <div style={{ maxWidth: 880, margin: '0 auto', padding: 'clamp(16px, 4vw, 28px)' }}>
        {children}
      </div>
    </div>
  );
}

export function Card({
  children,
  padded = true,
  style,
}: {
  children: ReactNode;
  padded?: boolean;
  style?: CSSProperties;
}) {
  return (
    <section
      style={{
        background: 'var(--me-surface)',
        border: '1px solid var(--me-border)',
        borderRadius: 'var(--me-radius-lg)',
        boxShadow: 'var(--me-shadow-sm)',
        padding: padded ? 'clamp(16px, 3.5vw, 26px)' : 0,
        ...style,
      }}
    >
      {children}
    </section>
  );
}

export function ScreenHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <header
      style={{
        display: 'flex',
        gap: 16,
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        marginBottom: 18,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <h1 style={{ margin: 0, fontSize: 'clamp(19px, 3.4vw, 23px)', letterSpacing: '-0.02em' }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{ margin: '5px 0 0', color: 'var(--me-text-muted)', fontSize: 14 }}>{subtitle}</p>
        )}
      </div>
      {action}
    </header>
  );
}

/* --------------------------------- Buttons -------------------------------- */

type ButtonProps = {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  type?: 'button' | 'submit';
  full?: boolean;
};

export function Button({
  children,
  onClick,
  variant = 'primary',
  disabled = false,
  loading = false,
  type = 'button',
  full = false,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const palette: Record<string, CSSProperties> = {
    primary: {
      background: isDisabled ? 'var(--me-blue-300)' : 'var(--me-blue-600)',
      color: '#fff',
      border: '1px solid transparent',
    },
    secondary: {
      background: 'var(--me-surface)',
      color: 'var(--me-text)',
      border: '1px solid var(--me-border-strong)',
    },
    ghost: {
      background: 'transparent',
      color: 'var(--me-blue-700)',
      border: '1px solid transparent',
    },
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: '11px 18px',
        borderRadius: 'var(--me-radius)',
        fontSize: 14.5,
        fontWeight: 600,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        opacity: isDisabled && variant !== 'primary' ? 0.6 : 1,
        width: full ? '100%' : undefined,
        transition: 'transform 0.12s ease, box-shadow 0.15s ease, background 0.15s ease',
        boxShadow: variant === 'primary' && !isDisabled ? 'var(--me-shadow-sm)' : 'none',
        ...palette[variant],
      }}
    >
      {loading && <Spinner size={15} tone={variant === 'primary' ? 'onDark' : 'brand'} />}
      {children}
    </button>
  );
}

/* --------------------------------- Loading -------------------------------- */

export function Spinner({
  size = 18,
  tone = 'brand',
}: {
  size?: number;
  tone?: 'brand' | 'onDark';
}) {
  const color = tone === 'onDark' ? 'rgba(255,255,255,0.9)' : 'var(--me-blue-600)';
  return (
    <span
      role="status"
      aria-label="Loading"
      style={{
        width: size,
        height: size,
        display: 'inline-block',
        border: `2px solid ${tone === 'onDark' ? 'rgba(255,255,255,0.32)' : 'var(--me-blue-200)'}`,
        borderTopColor: color,
        borderRadius: '50%',
        animation: 'me-spin 0.65s linear infinite',
        flexShrink: 0,
      }}
    />
  );
}

export function LoadingState({ label }: { label: string }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
        padding: '40px 20px',
        textAlign: 'center',
      }}
    >
      <Spinner size={28} />
      <p style={{ margin: 0, color: 'var(--me-text-muted)', fontSize: 14 }}>{label}</p>
    </div>
  );
}

/** Shimmer placeholder used while a list is loading. */
export function SkeletonRows({ rows = 4 }: { rows?: number }) {
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          style={{
            position: 'relative',
            overflow: 'hidden',
            height: 44,
            borderRadius: 'var(--me-radius)',
            background: 'var(--me-surface-alt)',
            border: '1px solid var(--me-border)',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              transform: 'translateX(-100%)',
              background:
                'linear-gradient(90deg, transparent, rgba(37,99,235,0.09), transparent)',
              animation: `me-shimmer 1.25s ${i * 0.09}s infinite`,
            }}
          />
        </div>
      ))}
    </div>
  );
}

/* ---------------------------------- Alerts -------------------------------- */

export function Alert({
  tone = 'error',
  title,
  children,
  action,
}: {
  tone?: 'error' | 'warning' | 'info' | 'success';
  title?: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  const tones = {
    error: { bg: 'var(--me-danger-bg)', fg: 'var(--me-danger)', icon: '!' },
    warning: { bg: 'var(--me-warning-bg)', fg: 'var(--me-warning)', icon: '!' },
    info: { bg: 'var(--me-blue-50)', fg: 'var(--me-blue-700)', icon: 'i' },
    success: { bg: 'var(--me-success-bg)', fg: 'var(--me-success)', icon: '✓' },
  }[tone];

  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className="me-animate-in"
      style={{
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
        background: tones.bg,
        borderRadius: 'var(--me-radius)',
        padding: '13px 15px',
        border: `1px solid ${tones.fg}22`,
      }}
    >
      <span
        aria-hidden
        style={{
          flexShrink: 0,
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: tones.fg,
          color: '#fff',
          fontSize: 12,
          fontWeight: 700,
          display: 'grid',
          placeItems: 'center',
          marginTop: 1,
        }}
      >
        {tones.icon}
      </span>
      <div style={{ minWidth: 0, flex: 1 }}>
        {title && (
          <div style={{ fontWeight: 650, color: tones.fg, fontSize: 14.5 }}>{title}</div>
        )}
        {children && (
          <div style={{ fontSize: 14, color: 'var(--me-text-muted)', marginTop: title ? 3 : 0 }}>
            {children}
          </div>
        )}
        {action && <div style={{ marginTop: 11 }}>{action}</div>}
      </div>
    </div>
  );
}

/* --------------------------------- Badges --------------------------------- */

export function Badge({
  children,
  tone = 'brand',
}: {
  children: ReactNode;
  tone?: 'brand' | 'success' | 'danger' | 'neutral';
}) {
  const tones = {
    brand: { bg: 'var(--me-blue-50)', fg: 'var(--me-blue-700)' },
    success: { bg: 'var(--me-success-bg)', fg: 'var(--me-success)' },
    danger: { bg: 'var(--me-danger-bg)', fg: 'var(--me-danger)' },
    neutral: { bg: 'var(--me-surface-alt)', fg: 'var(--me-text-muted)' },
  }[tone];

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 11px',
        borderRadius: 999,
        fontSize: 12.5,
        fontWeight: 650,
        background: tones.bg,
        color: tones.fg,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  );
}

/* --------------------------------- Fields --------------------------------- */

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label style={{ display: 'block' }}>
      <span style={{ display: 'block', fontSize: 13.5, fontWeight: 600, marginBottom: 6 }}>
        {label}
      </span>
      {children}
      {hint && (
        <span
          style={{ display: 'block', fontSize: 12.5, color: 'var(--me-text-subtle)', marginTop: 5 }}
        >
          {hint}
        </span>
      )}
    </label>
  );
}

export const inputStyle: CSSProperties = {
  width: '100%',
  padding: '11px 13px',
  borderRadius: 'var(--me-radius)',
  border: '1px solid var(--me-border-strong)',
  background: 'var(--me-surface)',
  fontSize: 14.5,
  outline: 'none',
};

/** Key/value row used by the case summary and extracted-field panels. */
export function DataRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 14,
        justifyContent: 'space-between',
        alignItems: 'baseline',
        padding: '10px 0',
        borderBottom: '1px solid var(--me-border)',
        flexWrap: 'wrap',
      }}
    >
      <span style={{ color: 'var(--me-text-muted)', fontSize: 13.5 }}>{label}</span>
      <span style={{ fontWeight: 600, fontSize: 14, textAlign: 'right', wordBreak: 'break-word' }}>
        {value}
      </span>
    </div>
  );
}

/* -------------------------------- Stepper --------------------------------- */

export type StepKey = 'chat' | 'case' | 'requirements' | 'upload' | 'validation';

export const STEP_ORDER: { key: StepKey; label: string }[] = [
  { key: 'chat', label: 'Describe' },
  { key: 'case', label: 'Case' },
  { key: 'requirements', label: 'Checklist' },
  { key: 'upload', label: 'Upload' },
  { key: 'validation', label: 'Verify' },
];

export function ProgressStepper({
  current,
  onNavigate,
  reachable,
}: {
  current: StepKey;
  onNavigate?: (step: StepKey) => void;
  reachable: (step: StepKey) => boolean;
}) {
  const currentIndex = STEP_ORDER.findIndex((s) => s.key === current);

  return (
    <nav
      aria-label="Progress"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        marginBottom: 20,
        overflowX: 'auto',
        paddingBottom: 4,
      }}
    >
      {STEP_ORDER.map((step, index) => {
        const isDone = index < currentIndex;
        const isCurrent = index === currentIndex;
        const canGo = reachable(step.key) && !isCurrent;

        return (
          <React.Fragment key={step.key}>
            {index > 0 && (
              <span
                aria-hidden
                style={{
                  height: 2,
                  flex: '1 1 12px',
                  minWidth: 12,
                  borderRadius: 2,
                  background: index <= currentIndex ? 'var(--me-blue-500)' : 'var(--me-border-strong)',
                  transition: 'background 0.3s ease',
                }}
              />
            )}
            <button
              type="button"
              onClick={canGo && onNavigate ? () => onNavigate(step.key) : undefined}
              disabled={!canGo}
              aria-current={isCurrent ? 'step' : undefined}
              title={step.label}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                padding: '5px 10px 5px 5px',
                borderRadius: 999,
                border: 'none',
                background: isCurrent ? 'var(--me-blue-50)' : 'transparent',
                cursor: canGo ? 'pointer' : 'default',
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  width: 23,
                  height: 23,
                  borderRadius: '50%',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 11.5,
                  fontWeight: 700,
                  background: isDone
                    ? 'var(--me-success)'
                    : isCurrent
                      ? 'var(--me-blue-600)'
                      : 'var(--me-border-strong)',
                  color: isDone || isCurrent ? '#fff' : 'var(--me-text-subtle)',
                  transition: 'background 0.3s ease',
                }}
              >
                {isDone ? '✓' : index + 1}
              </span>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: isCurrent ? 650 : 500,
                  color: isCurrent ? 'var(--me-blue-700)' : 'var(--me-text-muted)',
                }}
              >
                {step.label}
              </span>
            </button>
          </React.Fragment>
        );
      })}
    </nav>
  );
}

/* --------------------------- Success animation ---------------------------- */

export function SuccessCheck({ size = 62, tone = 'success' }: { size?: number; tone?: 'success' | 'danger' }) {
  const color = tone === 'success' ? 'var(--me-success)' : 'var(--me-danger)';

  return (
    <div style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}>
      <span
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          border: `2px solid ${color}`,
          animation: 'me-ring 1.15s ease-out forwards',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          background: color,
          display: 'grid',
          placeItems: 'center',
          animation: 'me-pop 0.42s cubic-bezier(0.2, 0.8, 0.3, 1) both',
        }}
      >
        <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" aria-hidden>
          {tone === 'success' ? (
            <path
              d="M5 12.5 10 17.5 19 7"
              fill="none"
              stroke="#fff"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                strokeDasharray: 26,
                strokeDashoffset: 26,
                animation: 'me-draw-check 0.4s 0.22s ease-out forwards',
              }}
            />
          ) : (
            <path
              d="M7 7 17 17 M17 7 7 17"
              fill="none"
              stroke="#fff"
              strokeWidth="2.6"
              strokeLinecap="round"
              style={{
                strokeDasharray: 30,
                strokeDashoffset: 30,
                animation: 'me-draw-check 0.4s 0.22s ease-out forwards',
              }}
            />
          )}
        </svg>
      </div>
    </div>
  );
}

/* --------------------------------- Layout --------------------------------- */

export function Actions({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 10,
        flexWrap: 'wrap',
        marginTop: 22,
        justifyContent: 'flex-end',
      }}
    >
      {children}
    </div>
  );
}
