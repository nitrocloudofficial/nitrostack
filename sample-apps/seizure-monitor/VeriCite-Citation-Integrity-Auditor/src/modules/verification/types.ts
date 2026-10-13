// src/modules/verification/types.ts

/**
 * ============================================================
 * VeriCite — Verification Engine: internal types
 * ------------------------------------------------------------
 * The engine arrived with its own `src/shared/contracts.ts`, a
 * pre-Phase-2 copy of the canonical contracts. That file is NOT
 * vendored — two competing definitions of `Claim` and
 * `VerificationResult` is exactly the defect the contract
 * reconciliation phase removed.
 *
 * Instead:
 *   • Inputs (`Claim`, `Citation`) come straight from the canonical
 *     contracts. The engine only reads `id`/`text` from a Claim and
 *     `id`/`raw`/`title`/`doi`/`year` from a Citation, all of which
 *     the canonical shapes provide — so no adaptation is needed on
 *     the way in.
 *   • Output stays engine-shaped as `EngineVerificationResult`
 *     (single `citationId`, no evidence arrays) and is translated to
 *     the canonical `VerificationResult` by `verification.adapter.ts`.
 *
 * Keeping the engine's output shape intact means its orchestration
 * code is vendored unmodified apart from import paths.
 * ============================================================
 */

import type {
    Citation,
    CitationExistence,
    Claim,
    VerificationStatus,
} from '../../shared/contracts.js';

export type { Claim, Citation, VerificationStatus, CitationExistence };

/* ------------------------------------------------------------
 * Provider payloads
 * ---------------------------------------------------------- */

export interface CrossrefPaper {
    title: string | null;
    doi: string | null;
    year: number | null;
    authors: string[];
    publisher: string | null;
    url: string | null;
    score: number;
}

export interface OpenAlexPaper {
    id: string | null;
    title: string | null;
    doi: string | null;
    year: number | null;
    authors: string[];
    abstract: string | null;
    citationCount: number | null;
    venue: string | null;
    concepts: string[];
    retracted: boolean;
}

export interface SemanticScholarPaper {
    paperId: string | null;
    title: string | null;
    doi: string | null;
    year: number | null;
    authors: string[];
    abstract: string | null;
    citationCount: number | null;
    venue: string | null;
}

/** Verdict from the LLM support step. */
export interface SupportVerificationResult {
    status: VerificationStatus;
    confidence: number;
    reason: string;
}

/* ------------------------------------------------------------
 * Engine output
 * ---------------------------------------------------------- */

/**
 * One claim verified against ONE cited paper.
 *
 * Deliberately distinct from the canonical `VerificationResult`,
 * which aggregates every citation a claim makes. The adapter merges
 * per-citation engine results into one canonical result per claim.
 */
export interface EngineVerificationResult {
    claimId: string;
    citationId: string;
    existence: CitationExistence;
    status: VerificationStatus;
    confidence: number;
    reason: string;
    evidence?: string;
    /** Providers that confirmed the paper's existence. */
    verifiedSources: string[];
    /** True when a provider reports the work as retracted. */
    retracted: boolean;
    metadata: {
        doi?: string;
        paperTitle?: string;
        authors?: string[];
        journal?: string;
        year?: number;
        citationCount?: number;
        source?: string;
    };
}
