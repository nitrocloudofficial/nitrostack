// src/shared/config.ts

/**
 * ============================================================
 * VeriCite — Runtime Configuration
 * ------------------------------------------------------------
 * Reads every tunable from the environment ONCE, validates it, and
 * exposes a frozen, fully-typed object.
 *
 * Design rules:
 *   • A malformed value never silently becomes NaN or 0 — it falls
 *     back to the documented default and records a warning.
 *   • Values are range-clamped so a typo cannot set concurrency to
 *     10 000 or a timeout to zero.
 *   • Control characters are stripped from every string, because a
 *     CRLF `.env` on Windows otherwise injects a trailing `\r` —
 *     the defect that made Crossref fail on 100% of requests.
 *   • `describeConfig()` never returns secret material, only whether
 *     a secret is present, so it is safe to log at startup.
 * ============================================================
 */

/* ------------------------------------------------------------
 * Bounds
 * ---------------------------------------------------------- */

const BOUNDS = {
    apiTimeoutMs: { min: 1_000, max: 120_000, fallback: 10_000 },
    claimBudgetMs: { min: 5_000, max: 600_000, fallback: 90_000 },
    concurrency: { min: 1, max: 32, fallback: 5 },
    maxCitationsPerClaim: { min: 1, max: 10, fallback: 3 },
    cacheTtlMs: { min: 0, max: 24 * 60 * 60 * 1_000, fallback: 30 * 60 * 1_000 },
    maxCacheEntries: { min: 16, max: 100_000, fallback: 5_000 },
} as const;

const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F]/g;

/* ------------------------------------------------------------
 * Primitive readers
 * ---------------------------------------------------------- */

const warnings: string[] = [];

function readString(name: string): string {
    const raw = process.env[name];
    if (typeof raw !== 'string') return '';

    const cleaned = raw.replace(CONTROL_CHARACTERS, '').trim();
    if (cleaned !== raw.trim()) {
        warnings.push(
            `${name} contained control characters (a CRLF .env file is the usual cause); `
            + 'they were stripped. Save .env with LF line endings.',
        );
    }
    return cleaned;
}

function readBoolean(name: string, fallback = false): boolean {
    const value = readString(name).toLowerCase();
    if (value === '') return fallback;
    if (['true', '1', 'yes', 'on'].includes(value)) return true;
    if (['false', '0', 'no', 'off'].includes(value)) return false;

    warnings.push(`${name}="${value}" is not a boolean; using ${fallback}.`);
    return fallback;
}

function readInt(name: string, bounds: { min: number; max: number; fallback: number }): number {
    const raw = readString(name);
    if (raw === '') return bounds.fallback;

    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
        warnings.push(`${name}="${raw}" is not an integer; using ${bounds.fallback}.`);
        return bounds.fallback;
    }

    const clamped = Math.min(bounds.max, Math.max(bounds.min, parsed));
    if (clamped !== parsed) {
        warnings.push(
            `${name}=${parsed} is outside [${bounds.min}, ${bounds.max}]; clamped to ${clamped}.`,
        );
    }
    return clamped;
}

/* ------------------------------------------------------------
 * Configuration
 * ---------------------------------------------------------- */

export interface VeriCiteConfig {
    /** Serve evidence from recorded fixtures instead of live providers. */
    offline: boolean;

    /** Per-provider HTTP timeout. */
    apiTimeoutMs: number;

    /** Wall-clock budget for verifying one claim end to end. */
    claimBudgetMs: number;

    /** Claims verified in parallel. */
    concurrency: number;

    /** Citations verified per claim before the rest are ignored. */
    maxCitationsPerClaim: number;

    /** Verification cache lifetime. Zero disables caching. */
    cacheTtlMs: number;

    /** Hard cap on cached entries, to bound memory. */
    maxCacheEntries: number;

    /** True when a Groq key is present. Never exposes the key itself. */
    hasGroqKey: boolean;

    /** True when a Semantic Scholar key is present. */
    hasSemanticScholarKey: boolean;
}

function build(): VeriCiteConfig {
    return Object.freeze({
        offline: readBoolean('VERICITE_OFFLINE', false),
        apiTimeoutMs: readInt('VERICITE_API_TIMEOUT_MS', BOUNDS.apiTimeoutMs),
        claimBudgetMs: readInt('VERICITE_CLAIM_BUDGET_MS', BOUNDS.claimBudgetMs),
        concurrency: readInt('VERICITE_CONCURRENCY', BOUNDS.concurrency),
        maxCitationsPerClaim: readInt('VERICITE_MAX_CITATIONS_PER_CLAIM', BOUNDS.maxCitationsPerClaim),
        cacheTtlMs: readInt('VERICITE_CACHE_TTL_MS', BOUNDS.cacheTtlMs),
        maxCacheEntries: readInt('VERICITE_MAX_CACHE_ENTRIES', BOUNDS.maxCacheEntries),
        hasGroqKey: readString('GROQ_API_KEY').length > 0,
        hasSemanticScholarKey: readString('SEMANTIC_SCHOLAR_API_KEY').length > 0,
    });
}

let cached: VeriCiteConfig | null = null;

/**
 * The active configuration.
 *
 * Read lazily and memoised so `.env` is loaded before first use, and
 * so tests can call `resetConfig()` after mutating the environment.
 */
export function getConfig(): VeriCiteConfig {
    if (!cached) cached = build();
    return cached;
}

/** Re-read the environment. Intended for tests. */
export function resetConfig(): void {
    cached = null;
    warnings.length = 0;
}

/* ------------------------------------------------------------
 * Startup validation
 * ---------------------------------------------------------- */

export interface ConfigDiagnostics {
    warnings: string[];
    /** Degradations the operator should know about, not errors. */
    notices: string[];
}

/**
 * Validate configuration and describe any degraded capability.
 *
 * Deliberately returns diagnostics rather than throwing: a missing
 * optional key should reduce capability, never prevent the server
 * from starting.
 */
export function validateConfig(): ConfigDiagnostics {
    const config = getConfig();
    const notices: string[] = [];

    if (config.offline) {
        notices.push(
            'VERICITE_OFFLINE=true — evidence is served from recorded fixtures. '
            + 'Results are labelled provider "Fixture" and AuditReport.offlineMode is set.',
        );
    } else {
        if (!config.hasGroqKey) {
            notices.push(
                'GROQ_API_KEY is not set — LLM claim-support verification is disabled. '
                + 'Citations still resolve, but every claim degrades to NOT_ENOUGH_EVIDENCE. '
                + 'Get a free key at https://console.groq.com',
            );
        }
        if (!config.hasSemanticScholarKey) {
            notices.push(
                'SEMANTIC_SCHOLAR_API_KEY is not set — the unauthenticated tier is rate '
                + 'limited and returns HTTP 429 under load. Verification degrades to '
                + 'Crossref + OpenAlex.',
            );
        }
    }

    return { warnings: [...warnings], notices };
}

/** Secret-free summary, safe to log at startup. */
export function describeConfig(): Record<string, string | number | boolean> {
    const config = getConfig();
    return {
        offline: config.offline,
        apiTimeoutMs: config.apiTimeoutMs,
        claimBudgetMs: config.claimBudgetMs,
        concurrency: config.concurrency,
        maxCitationsPerClaim: config.maxCitationsPerClaim,
        cacheTtlMs: config.cacheTtlMs,
        groqKey: config.hasGroqKey ? 'configured' : 'absent',
        semanticScholarKey: config.hasSemanticScholarKey ? 'configured' : 'absent',
    };
}
