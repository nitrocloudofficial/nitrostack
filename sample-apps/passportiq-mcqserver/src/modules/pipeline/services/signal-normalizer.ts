/**
 * Deterministic normalisers used by duplicate detection.
 *
 * Every comparison in detect_duplicate_signals runs on normalised values, never
 * raw ones. Two applicants who typed the same address as "Flat 4B, Sunrise
 * Residency" and "flat 4-b sunrise residency" are the same address for fraud
 * purposes, and a demo that only catches byte-identical strings is one typo away
 * from silently finding nothing on stage.
 *
 * No LLM, no randomness, no I/O — pure string functions, so the same input
 * always produces the same signals. That property is what makes the fraud-ring
 * reveal safe to rehearse.
 */
import type { Address } from '../../../contracts/index.js';

/**
 * Indian phone numbers to a comparable form: digits only, country code and
 * trunk prefixes stripped, last 10 digits kept.
 *
 * "+91 98450-12345", "098450 12345" and "9845012345" all collapse to
 * "9845012345".
 */
export function normalizePhone(phone: string | undefined | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D+/g, '');
  if (digits.length < 10) return null;
  return digits.slice(-10);
}

/** Lowercased, trimmed email. Enough for exact-reuse detection. */
export function normalizeEmail(email: string | undefined | null): string | null {
  if (!email) return null;
  const trimmed = email.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Address to a single comparable token.
 *
 * Punctuation dropped, whitespace collapsed, common Indian address abbreviations
 * unified ("flat"/"flt", "road"/"rd", "apartment"/"apt") so cosmetic differences
 * do not hide a genuine overlap. PIN code is appended last because it is the
 * highest-signal component.
 */
export function normalizeAddress(address: Address | undefined | null): string | null {
  if (!address) return null;

  const parts = [address.line1, address.line2 ?? '', address.city, address.state]
    .join(' ')
    .toLowerCase();

  const canonical = parts
    // Intra-word punctuation is DELETED, not replaced with a space, so initials
    // collapse the way a human reads them: "M.G. Road" -> "mg road", matching a
    // second applicant who typed "MG Road". Replacing these with a space instead
    // yields "m g road", which silently fails to match and un-plants a real
    // address overlap. Apostrophes and hyphens behave the same way
    // ("St. Mary's" / "St Marys", "Cross-Road" / "CrossRoad").
    .replace(/[.'’\-]/g, '')
    // Everything else separates tokens, so it becomes a space.
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\bflt\b/g, 'flat')
    .replace(/\bapt\b|\bapartments?\b/g, 'apartment')
    .replace(/\brd\b/g, 'road')
    .replace(/\bst\b/g, 'street')
    .replace(/\bnr\b/g, 'near')
    .replace(/\bblr\b|\bbengaluru\b|\bbangalore\b/g, 'bengaluru')
    .replace(/\s+/g, ' ')
    .trim();

  if (!canonical) return null;
  return `${canonical}|${address.pincode}`;
}

/** Passport numbers: uppercase, non-alphanumerics dropped. */
export function normalizePassportNumber(value: string | undefined | null): string | null {
  if (!value) return null;
  const canonical = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  return canonical.length > 0 ? canonical : null;
}

/**
 * Person names: lowercased, punctuation dropped, honorifics removed, tokens
 * SORTED.
 *
 * Sorting makes "Rohan Kumar Sharma" and "Sharma Rohan Kumar" compare equal,
 * which matters because Indian forms disagree on surname position. It does NOT
 * make "Rohan Sharma" equal "Rohan Kumar Sharma" — that is a middle-name
 * mismatch, which is Backend A's check_identity_consistency job to flag, not a
 * duplicate-identity signal.
 */
export function normalizeName(name: string | undefined | null): string | null {
  if (!name) return null;

  const tokens = name
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 0 && !['mr', 'mrs', 'ms', 'shri', 'smt', 'dr'].includes(token));

  if (tokens.length === 0) return null;
  return tokens.sort().join(' ');
}

/** Composite identity key: normalised name + exact DOB. */
export function normalizeNameDob(
  name: string | undefined | null,
  dob: string | undefined | null
): string | null {
  const normalizedName = normalizeName(name);
  if (!normalizedName || !dob) return null;
  return `${normalizedName}|${dob}`;
}

/** Document image hashes are already canonical; trim and lowercase defensively. */
export function normalizeImageHash(hash: string | undefined | null): string | null {
  if (!hash) return null;
  const trimmed = hash.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}

/** Human-readable one-line address, for node labels and evidence payloads. */
export function formatAddress(address: Address): string {
  return [address.line1, address.line2, address.city, address.state, address.pincode]
    .filter((part): part is string => Boolean(part && part.length > 0))
    .join(', ');
}
