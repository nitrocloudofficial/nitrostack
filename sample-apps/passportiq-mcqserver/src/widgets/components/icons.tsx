/**
 * Inline SVG icon set.
 *
 * WHY HAND-DRAWN PATHS INSTEAD OF AN ICON PACKAGE
 * ---------------------------------------------
 * Widget bundles are single self-contained HTML files with no network access
 * inside an MCP host iframe. An icon font or a CDN sprite therefore renders as
 * tofu boxes in the one environment that matters. `lucide-react` would work but
 * pulls its full module graph into five separate bundles for the fourteen glyphs
 * this product actually uses.
 *
 * Every path below is drawn on a 24×24 grid with `currentColor` and a 1.8 stroke,
 * so an icon inherits colour from its container and stays optically consistent
 * with 13px text at 18px box size.
 */
import React from 'react';

export interface IconProps {
  size?: number;
  className?: string;
  /** Fill instead of stroke — used by the small status glyphs inside dots. */
  solid?: boolean;
  /**
   * Explicit colour. Icons inherit `currentColor` by default, which is right
   * inside coloured containers; this escape hatch is for the many call sites that
   * want one tinted glyph without wrapping it in a span just to set `color`.
   */
  color?: string;
}

function svg(path: React.ReactNode, props: IconProps, viewBox = '0 0 24 24') {
  const size = props.size ?? 18;
  return (
    <svg
      width={size}
      height={size}
      viewBox={viewBox}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={props.className}
      style={props.color ? { color: props.color } : undefined}
      aria-hidden="true"
      focusable="false"
    >
      {path}
    </svg>
  );
}

export const IconDashboard = (p: IconProps) =>
  svg(
    <>
      <rect x="3" y="3" width="7.5" height="7.5" rx="1.6" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.6" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.6" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.6" />
    </>,
    p
  );

export const IconQueue = (p: IconProps) =>
  svg(
    <>
      <path d="M8 6h13M8 12h13M8 18h13" />
      <circle cx="3.6" cy="6" r="1.3" />
      <circle cx="3.6" cy="12" r="1.3" />
      <circle cx="3.6" cy="18" r="1.3" />
    </>,
    p
  );

export const IconGraph = (p: IconProps) =>
  svg(
    <>
      <circle cx="12" cy="5" r="2.6" />
      <circle cx="5" cy="18" r="2.6" />
      <circle cx="19" cy="18" r="2.6" />
      <path d="M10.3 7L6.7 15.6M13.7 7l3.6 8.6M7.6 18h8.8" />
    </>,
    p
  );

export const IconShield = (p: IconProps) =>
  svg(
    <>
      <path d="M12 3l7.5 3v5.4c0 4.6-3.1 8.3-7.5 9.6-4.4-1.3-7.5-5-7.5-9.6V6z" />
      <path d="M9.2 12l2 2 3.6-3.8" />
    </>,
    p
  );

export const IconAgent = (p: IconProps) =>
  svg(
    <>
      <rect x="4" y="8" width="16" height="12" rx="3" />
      <path d="M12 8V4.6M9 14h.01M15 14h.01M9.5 17.4h5" />
      <path d="M2.5 12.5v3M21.5 12.5v3" />
    </>,
    p
  );

export const IconAudit = (p: IconProps) =>
  svg(
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5M9 13h6M9 17h4" />
    </>,
    p
  );

export const IconBell = (p: IconProps) =>
  svg(
    <>
      <path d="M18 9a6 6 0 1 0-12 0c0 5-2 6.5-2 6.5h16S18 14 18 9" />
      <path d="M10.3 19a2 2 0 0 0 3.4 0" />
    </>,
    p
  );

export const IconSearch = (p: IconProps) =>
  svg(
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M15.4 15.4L20 20" />
    </>,
    p
  );

export const IconPhone = (p: IconProps) =>
  svg(
    <path d="M16.5 21c-7.5 0-13.5-6-13.5-13.5V6a2 2 0 0 1 2-2h2.2a1 1 0 0 1 1 .8l.7 3a1 1 0 0 1-.5 1.1l-1.4.8a10.5 10.5 0 0 0 4.8 4.8l.8-1.4a1 1 0 0 1 1.1-.5l3 .7a1 1 0 0 1 .8 1V19a2 2 0 0 1-2 2z" />,
    p
  );

export const IconPin = (p: IconProps) =>
  svg(
    <>
      <path d="M12 21.5s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11z" />
      <circle cx="12" cy="10.2" r="2.6" />
    </>,
    p
  );

export const IconMail = (p: IconProps) =>
  svg(
    <>
      <rect x="3" y="5" width="18" height="14" rx="2.4" />
      <path d="M3.6 6.6L12 12.7l8.4-6.1" />
    </>,
    p
  );

export const IconDoc = (p: IconProps) =>
  svg(
    <>
      <path d="M13.5 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.5z" />
      <path d="M13.5 3v5.5H19" />
    </>,
    p
  );

export const IconFingerprint = (p: IconProps) =>
  svg(
    <>
      <path d="M12 4.2c-3.1 0-5.7 2-6.6 4.8" />
      <path d="M18.6 9A7 7 0 0 0 12 4.2" />
      <path d="M8.4 19.4A9.6 9.6 0 0 1 7 14.2c0-2.8 2.2-5 5-5s5 2.2 5 5c0 1.4-.3 2.7-.9 3.9" />
      <path d="M12 12.6c-.9 0-1.6.7-1.6 1.6 0 1.6.4 3.1 1.1 4.4" />
    </>,
    p
  );

export const IconCheck = (p: IconProps) =>
  svg(<path d="M5 12.8l4.3 4.2L19 7.5" />, p);

export const IconX = (p: IconProps) => svg(<path d="M6.4 6.4l11.2 11.2M17.6 6.4L6.4 17.6" />, p);

export const IconQuestion = (p: IconProps) =>
  svg(
    <>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M9.6 9.6a2.4 2.4 0 1 1 3.6 2.1c-.7.4-1.2 1-1.2 1.8v.3M12 17.1h.01" />
    </>,
    p
  );

export const IconAlert = (p: IconProps) =>
  svg(
    <>
      <path d="M10.3 3.9L2.6 17.2A2 2 0 0 0 4.3 20h15.4a2 2 0 0 0 1.7-2.8L13.7 3.9a2 2 0 0 0-3.4 0z" />
      <path d="M12 9v4M12 16.4h.01" />
    </>,
    p
  );

export const IconBolt = (p: IconProps) =>
  svg(<path d="M13.4 2.5L4.5 13.6h5.6l-.7 7.9 8.9-11.1h-5.6z" />, p);

export const IconPlay = (p: IconProps) => svg(<path d="M7 4.5l12 7.5-12 7.5z" />, p);

export const IconPause = (p: IconProps) =>
  svg(
    <>
      <path d="M8.5 4.5v15M15.5 4.5v15" />
    </>,
    p
  );

export const IconRefresh = (p: IconProps) =>
  svg(
    <>
      <path d="M20.3 11a8.4 8.4 0 0 0-14.4-4.4L3 9.4" />
      <path d="M3.7 13a8.4 8.4 0 0 0 14.4 4.4L21 14.6" />
      <path d="M3 5v4.4h4.4M21 19v-4.4h-4.4" />
    </>,
    p
  );

export const IconEye = (p: IconProps) =>
  svg(
    <>
      <path d="M2.2 12S5.6 5.6 12 5.6 21.8 12 21.8 12 18.4 18.4 12 18.4 2.2 12 2.2 12z" />
      <circle cx="12" cy="12" r="2.9" />
    </>,
    p
  );

export const IconLink = (p: IconProps) =>
  svg(
    <>
      <path d="M10.4 13.6a4 4 0 0 0 5.7 0l2.8-2.8a4 4 0 0 0-5.7-5.7l-1.6 1.6" />
      <path d="M13.6 10.4a4 4 0 0 0-5.7 0l-2.8 2.8a4 4 0 0 0 5.7 5.7l1.6-1.6" />
    </>,
    p
  );

export const IconClock = (p: IconProps) =>
  svg(
    <>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M12 7.4V12l3.2 2" />
    </>,
    p
  );

export const IconUser = (p: IconProps) =>
  svg(
    <>
      <circle cx="12" cy="8.4" r="3.8" />
      <path d="M4.8 20a7.2 7.2 0 0 1 14.4 0" />
    </>,
    p
  );

/** The signal-hub glyph for a given identifier kind in the fraud graph. */
export function signalIcon(kind: string, size = 15): React.ReactNode {
  const k = kind.toLowerCase();
  if (k.includes('phone')) return <IconPhone size={size} />;
  if (k.includes('address')) return <IconPin size={size} />;
  if (k.includes('email')) return <IconMail size={size} />;
  if (k.includes('document') || k.includes('image')) return <IconDoc size={size} />;
  if (k.includes('name') || k.includes('dob')) return <IconFingerprint size={size} />;
  if (k.includes('passport')) return <IconShield size={size} />;
  return <IconAlert size={size} />;
}

export const IconChat = (p: IconProps) =>
  svg(
    <>
      <path d="M21 11.5a8.4 8.4 0 0 1-8.5 8.3c-1.5 0-2.9-.35-4.1-.98L3 20l1.2-4.2A8.1 8.1 0 0 1 3 11.5 8.4 8.4 0 0 1 12.5 3.2 8.4 8.4 0 0 1 21 11.5z" />
      <path d="M8.5 10.5h7M8.5 13.5h4.5" />
    </>,
    p
  );

export const IconLogout = (p: IconProps) =>
  svg(
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5M21 12H9" />
    </>,
    p
  );
