/**
 * ============================================================
 * VeriCite — Production Global Constants & Security Bounds
 * ------------------------------------------------------------
 * Centralized, immutable system constants, operational limits,
 * and security bounds for the orchestration layer.
 * ============================================================
 */
/* ------------------------------------------------------------
 * Project & Environment Metadata
 * ---------------------------------------------------------- */
export const APP = {
    NAME: "VeriCite",
    VERSION: "1.0.0",
    DESCRIPTION: "Autonomous Citation Integrity Auditor",
};
/* ------------------------------------------------------------
 * Security & Resource Protection Bounds (DoS Prevention)
 * ---------------------------------------------------------- */
export const DOCUMENT_LIMITS = {
    /** Maximum allowed document size in characters (~500KB). */
    MAX_DOCUMENT_LENGTH_CHARACTERS: 500_000,
    /** Maximum claims evaluated per single audit run to cap fan-out. */
    MAX_CLAIMS_PER_AUDIT: 100,
    /** Minimum document length required for processing. */
    MIN_DOCUMENT_LENGTH_CHARACTERS: 10,
};
/* ------------------------------------------------------------
 * Operational Timeout & Resiliency Configuration
 * ---------------------------------------------------------- */
/** Per-API request timeout in milliseconds (10 seconds). */
export const API_TIMEOUT = 10_000;
/** Maximum concurrent claim verifications executing in parallel. */
export const MAX_PARALLEL_VERIFICATIONS = 5;
/** Resiliency Retry Configuration */
export const RETRY_CONFIG = {
    MAX_RETRIES: 2,
    BASE_DELAY_MS: 200,
    MAX_DELAY_MS: 1_000,
};
/** Environment variable that forces recorded-fixture evidence. */
export const OFFLINE_ENV_FLAG = "VERICITE_OFFLINE";
/* ------------------------------------------------------------
 * Confidence Thresholds
 * ---------------------------------------------------------- */
export const CONFIDENCE = {
    HIGH: 90,
    MEDIUM: 70,
    LOW: 50,
};
/* ------------------------------------------------------------
 * Integrity Scoring Model
 * ------------------------------------------------------------
 * Score = mean(points per non-ERROR claim)
 *         - citation coverage penalty
 *         - retraction penalty
 *
 * ERROR claims are EXCLUDED from the denominator. A provider
 * outage is our failure, not the author's, and must not be
 * scored as if the document were unsupported.
 * ---------------------------------------------------------- */
export const SCORING = {
    /** Points awarded per claim, by verification status. */
    STATUS_POINTS: {
        SUPPORTED: 100,
        NOT_ENOUGH_EVIDENCE: 45,
        UNRELATED: 25,
        CONTRADICTED: 0,
        ERROR: 0,
    },
    /** Maximum penalty applied when no claim carries a citation. */
    MAX_COVERAGE_PENALTY: 25,
    /** Penalty per retracted reference discovered. */
    RETRACTION_PENALTY_PER_CITATION: 10,
    /** Ceiling on the cumulative retraction penalty. */
    MAX_RETRACTION_PENALTY: 20,
};
/* ------------------------------------------------------------
 * Severity Thresholds (Integrity Score → ReportSeverity)
 * ---------------------------------------------------------- */
export const SEVERITY_THRESHOLDS = {
    GREEN: 80,
    AMBER: 55,
};
/* ------------------------------------------------------------
 * Trust Verdict Thresholds
 * ------------------------------------------------------------
 * NOTE: there is deliberately NO "missing citation ratio" hard
 * gate here. The previous engine escalated to CRITICAL whenever
 * missingRatio > 0.5, which — combined with a mapper bug that
 * marked every claim as missing — forced CRITICAL on every audit.
 * Citation coverage now influences the verdict through the score,
 * proportionally, instead of as a cliff.
 * ---------------------------------------------------------- */
export const VERDICT_THRESHOLDS = {
    CRITICAL_SCORE: 35,
    /** Share of contradicted claims that alone justifies CRITICAL. */
    CRITICAL_CONTRADICTION_RATIO: 0.15,
    LOW_SCORE: 60,
    LOW_SUPPORTED_RATIO: 0.35,
    MODERATE_SCORE: 80,
    MODERATE_SUPPORTED_RATIO: 0.7,
    /** Fraction of claims that must error before the audit is inconclusive. */
    INCONCLUSIVE_ERROR_RATIO: 0.6,
};
/* ------------------------------------------------------------
 * Evidence Scoring & Stance Detection
 * ---------------------------------------------------------- */
export const EVIDENCE = {
    /** Minimum relevance for evidence to count toward support. */
    MIN_RELEVANCE_SUPPORT: 0.35,
    /** Below this relevance, evidence is discarded as off-topic. */
    MIN_RELEVANCE_CONSIDER: 0.15,
    /** Cap on evidence records retained per claim. */
    MAX_EVIDENCE_PER_CLAIM: 5,
    /** Relevance floor for a contradiction signal to be trusted. */
    MIN_RELEVANCE_CONTRADICTION: 0.25,
};
/* ------------------------------------------------------------
 * Report Severity
 * ---------------------------------------------------------- */
export const REPORT_SEVERITY = {
    GREEN: "GREEN",
    AMBER: "AMBER",
    RED: "RED",
};
/* ------------------------------------------------------------
 * Trust Verdict Classification Levels
 * ---------------------------------------------------------- */
export const VERDICT_LEVELS = {
    HIGH_TRUST: "HIGH_TRUST",
    MODERATE_TRUST: "MODERATE_TRUST",
    LOW_TRUST: "LOW_TRUST",
    CRITICAL: "CRITICAL",
};
/* ------------------------------------------------------------
 * Supported Scholarly Verification Providers
 * ---------------------------------------------------------- */
export const PROVIDERS = {
    CROSSREF: "Crossref",
    OPENALEX: "OpenAlex",
    SEMANTIC_SCHOLAR: "Semantic Scholar",
    GROQ: "Groq",
};
/* ------------------------------------------------------------
 * Verification Status Enum Mapping
 * ---------------------------------------------------------- */
export const VERIFICATION_STATUS = {
    SUPPORTED: "SUPPORTED",
    CONTRADICTED: "CONTRADICTED",
    NOT_ENOUGH_EVIDENCE: "NOT_ENOUGH_EVIDENCE",
    UNRELATED: "UNRELATED",
    ERROR: "ERROR",
};
/* ------------------------------------------------------------
 * Citation Existence Enum Mapping
 * ---------------------------------------------------------- */
export const CITATION_EXISTENCE = {
    FOUND: "FOUND",
    NOT_FOUND: "NOT_FOUND",
    AMBIGUOUS: "AMBIGUOUS",
};
/* ------------------------------------------------------------
 * Palette Tokens (Light/Dark Mode Shared Tokens)
 * ---------------------------------------------------------- */
export const COLORS = {
    GREEN: "#22C55E",
    AMBER: "#F59E0B",
    RED: "#EF4444",
    CRITICAL: "#DC2626",
    BLUE: "#3B82F6",
    PURPLE: "#8B5CF6",
    GRAY: "#6B7280",
};
//# sourceMappingURL=constants.js.map