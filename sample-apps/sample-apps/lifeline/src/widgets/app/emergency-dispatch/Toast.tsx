'use client';

export type ToastKind = 'success' | 'error' | 'info';

export interface ToastData {
  kind: ToastKind;
  message: string;
}

const KIND_STYLE: Record<ToastKind, { bg: string; fg: string; icon: string }> = {
  success: { bg: 'rgba(22,163,74,0.95)', fg: '#ffffff', icon: '✅' },
  error: { bg: 'rgba(220,38,38,0.95)', fg: '#ffffff', icon: '⚠️' },
  info: { bg: 'rgba(37,99,235,0.95)', fg: '#ffffff', icon: 'ℹ️' },
};

/**
 * A single, always-visible-at-most-one toast. This app's interactions are
 * one-at-a-time (user clicks one button, waits for feedback, moves on) so a
 * stacking queue would add complexity with no real benefit here.
 */
export default function Toast({ toast, onDismiss }: { toast: ToastData; onDismiss: () => void }) {
  const style = KIND_STYLE[toast.kind];
  return (
    <div
      role="status"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        margin: '8px 16px 0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        fontSize: 12.5,
        fontWeight: 600,
        color: style.fg,
        background: style.bg,
        borderRadius: 10,
        padding: '9px 12px',
        boxShadow: '0 6px 16px rgba(0,0,0,0.18)',
      }}
    >
      <span>
        {style.icon} {toast.message}
      </span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        style={{ background: 'transparent', border: 'none', color: style.fg, cursor: 'pointer', fontSize: 14, lineHeight: 1, opacity: 0.85 }}
      >
        ✕
      </button>
    </div>
  );
}
