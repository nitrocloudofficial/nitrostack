/**
 * redact.ts — PII redaction (CLAUDE.md rule 9). Applied to EVERY audit payload
 * before storage. Never let PAN / mobile / name land in the audit log in clear.
 */

/** ABCDE1234F → ABCXXXXXXF (keep first 3 + last 1). */
export function maskPan(pan: string): string {
  if (typeof pan !== 'string' || pan.length < 5) return 'XXXXXXXXXX';
  return pan.slice(0, 3) + 'X'.repeat(pan.length - 4) + pan.slice(-1);
}

/** 9876543222 → 98XXXXXX22 (keep first 2 + last 2). */
export function maskMobile(m: string): string {
  const digits = String(m).replace(/\D/g, '');
  if (digits.length < 4) return 'XXXX';
  return digits.slice(0, 2) + 'X'.repeat(digits.length - 4) + digits.slice(-2);
}

/** Priya Sharma → P**** S***** (keep initials). */
export function maskName(name: string): string {
  if (typeof name !== 'string' || !name.trim()) return '****';
  return name
    .trim()
    .split(/\s+/)
    .map((w) => (w.length <= 1 ? w : w[0] + '*'.repeat(w.length - 1)))
    .join(' ');
}

const SENSITIVE_KEYS = new Set([
  'pan',
  'mobile',
  'phone',
  'name',
  'full_name',
  'customer_name',
  'dob',
  'aadhaar',
  'account_number',
  'email',
]);

const PAN_RE = /\b[A-Z]{5}[0-9]{4}[A-Z]\b/g;
const MOBILE_RE = /\b[6-9]\d{9}\b/g;

function redactStringContent(s: string): string {
  return s.replace(PAN_RE, (m) => maskPan(m)).replace(MOBILE_RE, (m) => maskMobile(m));
}

/** Deep-redact an arbitrary payload: mask by key name AND scrub PAN/mobile patterns in strings. */
export function redactAuditPayload(payload: unknown): Record<string, unknown> {
  return redactValue(payload) as Record<string, unknown>;
}

function redactValue(value: unknown, key?: string): unknown {
  if (value == null) return value;

  if (typeof value === 'string') {
    if (key && SENSITIVE_KEYS.has(key.toLowerCase())) {
      const k = key.toLowerCase();
      if (k === 'pan') return maskPan(value);
      if (k === 'mobile' || k === 'phone') return maskMobile(value);
      if (k.includes('name')) return maskName(value);
      if (k === 'dob') return '****-**-**';
      return 'REDACTED';
    }
    return redactStringContent(value);
  }

  if (Array.isArray(value)) return value.map((v) => redactValue(v));

  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = redactValue(v, k);
    return out;
  }

  return value;
}
