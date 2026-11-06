import React from 'react';
import type { Severity } from '../lib/view-model';

export const SEVERITY_LABEL: Record<Severity, string> = { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low', info: 'Info' };
export const SEVERITY_ORDER: Severity[] = ['critical', 'high', 'medium', 'low', 'info'];

// A different shape per level, so severity is readable without colour. Coloured by --sev-* through currentColor.
export function SeverityIcon({ severity }: { severity: Severity }) {
  const common = { viewBox: '0 0 12 12', 'aria-hidden': true, focusable: false } as const;
  switch (severity) {
    case 'critical':
      return (
        <svg {...common}>
          <path d="M4 1h4l3 3v4l-3 3H4L1 8V4z" fill="currentColor" />
          <path d="M4 4l4 4M8 4L4 8" className="cut" />
        </svg>
      );
    case 'high':
      return (
        <svg {...common}>
          <path d="M6 1l5.5 10h-11z" fill="currentColor" />
          <path d="M6 4.5v3M6 9v.5" className="cut" />
        </svg>
      );
    case 'medium':
      return (
        <svg {...common}>
          <path d="M6 1l5 5-5 5-5-5z" fill="currentColor" />
        </svg>
      );
    case 'low':
      return (
        <svg {...common}>
          <circle cx="6" cy="6" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="6" cy="6" r="5" fill="currentColor" />
          <path d="M6 5.5v3M6 3.5v.5" className="cut" />
        </svg>
      );
  }
}
