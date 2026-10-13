/**
 * Shared input sanitizers.
 *
 * NitroStack does not hard-enforce the Zod input schemas, so tools can receive
 * strings ("1800000", "₹18,00,000"), negatives, or unexpected enum values from
 * an LLM. These helpers coerce inputs defensively — this is both an error-audit
 * fix (no NaN / wrong math) and a security control (input validation).
 */

/** Coerce any value to a finite number, stripping ₹/commas/spaces; clamp + fallback. */
export function coerceNumber(
    value: unknown,
    opts: { min?: number; max?: number; fallback?: number } = {},
): number {
    let n: number;
    if (typeof value === 'number') {
        n = value;
    } else if (typeof value === 'string') {
        n = Number(value.replace(/[,\s₹_]/g, ''));
    } else {
        n = NaN;
    }
    if (!Number.isFinite(n)) n = opts.fallback ?? 0;
    if (opts.min !== undefined) n = Math.max(opts.min, n);
    if (opts.max !== undefined) n = Math.min(opts.max, n);
    return n;
}

/** Coerce to a non-negative number. */
export function coercePositive(value: unknown, fallback = 0): number {
    return coerceNumber(value, { min: 0, fallback });
}

const pad2 = (s: string) => s.padStart(2, '0');

/**
 * Coerce a loosely-formatted date to ISO `yyyy-mm-dd`, or null if unparseable.
 * Handles ISO, `yyyy/m/d`, `yyyy.m.d`, Indian day-first `d/m/yyyy` / `d-m-yyyy`,
 * and finally falls back to Date.parse. Prevents "wrong date format" retries.
 */
export function coerceDateISO(value: unknown): string | null {
    if (value == null) return null;
    const s = String(value).trim();

    let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/); // yyyy-m-d / yyyy/m/d
    if (m) return `${m[1]}-${pad2(m[2])}-${pad2(m[3])}`;

    m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/); // d-m-yyyy (Indian day-first)
    if (m) return `${m[3]}-${pad2(m[2])}-${pad2(m[1])}`;

    const d = new Date(s);
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    return null;
}

/** Normalize an arbitrary value to one of the allowed enum members, else fallback. */
export function normalizeEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
    const s = String(value ?? '').toLowerCase().trim().replace(/[\s-]+/g, '_');
    const hit = allowed.find((a) => a.toLowerCase() === s);
    return hit ?? fallback;
}
