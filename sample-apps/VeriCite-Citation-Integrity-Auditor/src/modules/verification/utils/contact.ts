// src/modules/verification/utils/contact.ts

/**
 * ============================================================
 * VeriCite — Polite-pool contact handling
 * ------------------------------------------------------------
 * Crossref, OpenAlex and Semantic Scholar all grant higher rate
 * limits when a contact address is supplied in the User-Agent.
 *
 * WHY THIS FILE EXISTS
 *
 * Three provider services each built that header independently as:
 *
 *     `VeriCite/1.0 (mailto:${process.env["OPENALEX_EMAIL"] ?? "vericite@example.com"})`
 *
 * Two defects, both observed live:
 *
 *   1. The project's `.env` had CRLF line endings, so the value
 *      carried a trailing `\r`. Interpolated into a header this
 *      throws `Invalid character in header content ["User-Agent"]`
 *      and **Crossref failed on 100% of calls**. Verified: the same
 *      request succeeded once the value was stripped.
 *
 *   2. The fallback `vericite@example.com` — and an unfilled
 *      `.env` placeholder such as `your_email@domain.com` — sends a
 *      fake address to a polite pool. That is worse than sending
 *      none: it is a bogus contact attributed to real traffic.
 *
 * Both are fixed here, once, for every provider.
 * ============================================================ */

/** Characters that are illegal in an HTTP header value. */
const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F]/g;

/** Addresses that look configured but are not. */
const PLACEHOLDER_PATTERNS: readonly RegExp[] = [
    /^your[._-]?email@/i,
    /@(?:example|domain|test|localhost|email)\.(?:com|org|net|invalid)$/i,
    /^(?:email|user|name|changeme|todo)@/i,
];

const EMAIL_SHAPE = /^[^\s@<>();:,\\"[\]]+@[^\s@<>();:,\\"[\]]+\.[A-Za-z]{2,}$/;

/**
 * Return a usable contact address, or null.
 *
 * Reads CONTACT_EMAIL first (the root project's variable) and falls
 * back to OPENALEX_EMAIL (the engine's original variable) so both
 * spellings keep working.
 */
export function resolveContactEmail(): string | null {
    const raw = process.env['CONTACT_EMAIL'] ?? process.env['OPENALEX_EMAIL'] ?? '';

    // Strip CR/LF and other control characters before anything else —
    // this is the header-injection guard as well as the CRLF fix.
    const cleaned = raw.replace(CONTROL_CHARACTERS, '').trim();

    if (cleaned.length === 0) return null;
    if (!EMAIL_SHAPE.test(cleaned)) return null;
    if (PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(cleaned))) return null;

    return cleaned;
}

/**
 * Build the User-Agent header.
 *
 * When no valid contact address is configured the mailto clause is
 * omitted entirely rather than filled with a placeholder: anonymous
 * access is honest, a fake address is not.
 */
export function politeUserAgent(): string {
    const email = resolveContactEmail();
    return email
        ? `VeriCite/1.0 (+https://github.com/vericite; mailto:${email})`
        : 'VeriCite/1.0 (+https://github.com/vericite)';
}
