'use client';

import { useCase } from '@/lib/case-context';

/**
 * Sits just below the stepper on patient and hospital views. Reads the
 * global notification set by insurer actions and renders a dismissible banner.
 * Renders nothing on the insurer view (insurer is the actor, not the audience).
 */
export function CaseNotificationBanner() {
  const { notification, dismissNotification } = useCase();

  if (!notification) return null;

  const isVerified = notification.tone === 'verified';

  return (
    <div
      role="status"
      aria-live="polite"
      className={`no-print border-b backdrop-blur-xl ${
        isVerified
          ? 'border-verified/30 bg-teal-500/10'
          : 'border-amber/30 bg-amber-400/10'
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-start justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex items-start gap-3">
          {/* Status dot matching the timeline actor colours */}
          <span
            aria-hidden
            className={`mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
              isVerified
                ? 'border-verified bg-verified'
                : 'border-amber bg-transparent'
            }`}
          >
            {isVerified && (
              <svg
                viewBox="0 0 12 12"
                className="h-2 w-2 text-paper"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  d="M2.5 6.2 5 8.7 9.5 3.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </span>
          <div>
            <p
              className={`text-xs font-semibold uppercase tracking-[0.08em] ${
                isVerified ? 'text-verified' : 'text-amber'
              }`}
            >
              {isVerified ? 'Insurer decision' : 'Insurer update'}
            </p>
            <p className={`mt-0.5 text-sm ${isVerified ? 'text-verified' : 'text-amber'}`}>
              {notification.message}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={dismissNotification}
          aria-label="Dismiss notification"
          className={`shrink-0 rounded px-2 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink ${
            isVerified
              ? 'text-verified hover:bg-verified/10'
              : 'text-amber hover:bg-amber/10'
          }`}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
