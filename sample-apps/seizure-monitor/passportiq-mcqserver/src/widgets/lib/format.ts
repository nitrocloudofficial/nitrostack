/**
 * Presentation helpers.
 *
 * Everything here is pure and total — a widget bundle has no error boundary that
 * the officer can see, so a formatter that throws on an unexpected value blanks
 * the whole panel. Every function below accepts `unknown` and returns a string.
 */

/** `document_validate` -> `Document Validate`. Used for stage + action labels. */
export function humanise(raw: unknown): string {
  if (typeof raw !== 'string' || raw.length === 0) return '—';
  return raw
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Two-digit presentation for the sidebar Quick Stats ("07", not "7"). */
export function pad2(n: unknown): string {
  const v = typeof n === 'number' && Number.isFinite(n) ? Math.trunc(n) : 0;
  return v < 10 ? `0${v}` : String(v);
}

export function pct(n: unknown): string {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '—';
  return `${Math.round(n)}%`;
}

/** Confidence arrives 0..1 from the agent; officers read percentages. */
export function pctOf1(n: unknown): string {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '—';
  return `${Math.round(n * 100)}%`;
}

export function ms(n: unknown): string {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '—';
  if (n < 1000) return `${Math.round(n)}ms`;
  return `${(n / 1000).toFixed(1)}s`;
}

/** `14:32:07` — audit trails are scanned for order, not for date. */
export function clockTime(iso: unknown): string {
  if (typeof iso !== 'string') return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toTimeString().slice(0, 8);
}

export function dateTime(iso: unknown): string {
  if (typeof iso !== 'string') return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.toISOString().slice(0, 10)} ${d.toTimeString().slice(0, 5)}`;
}

/** Initials for an avatar node. `Vikram Nair` -> `VN`. */
export function initials(name: unknown): string {
  if (typeof name !== 'string' || !name.trim()) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Strip the `PIQ-2026-` prefix so ids fit inside a graph node caption. */
export function shortId(id: unknown): string {
  if (typeof id !== 'string') return '—';
  const m = id.match(/(\d{4})$/);
  return m ? m[1] : id;
}

export function truncate(text: unknown, max: number): string {
  if (typeof text !== 'string') return '';
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

export function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}
