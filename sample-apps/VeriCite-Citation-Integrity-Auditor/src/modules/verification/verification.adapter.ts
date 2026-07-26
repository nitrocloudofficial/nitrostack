// src/modules/verification/verification.adapter.ts

/**
 * ============================================================
 * VeriCite — Verification Adapter (Anti-Corruption Layer)
 * ------------------------------------------------------------
 * Translates engine output into canonical contract output.
 *
 * The engine answers ONE question per call: "does cited paper X
 * support claim Y?" — so a claim citing three papers produces three
 * `EngineVerificationResult`s. The canonical `VerificationResult`
 * is per-CLAIM. This module merges them, and is the only place
 * that knows both shapes.
 *
 * PURE · DETERMINISTIC · NO I/O
 * ============================================================
 */

import type {
    Citation,
    Claim,
    CitationExistence,
    EvidenceRecord,
    EvidenceStance,
    VerificationResult,
    VerificationStatus,
} from '../../shared/contracts.js';
import type { EngineVerificationResult } from './types.js';

/**
 * Status precedence when a claim cites several papers.
 *
 * A contradiction from any cited source outranks support from the
 * others: citing one paper that refutes you is a finding, not an
 * average. ERROR ranks lowest so a single provider failure never
 * masks a real verdict from a sibling citation.
 */
const STATUS_PRECEDENCE: readonly VerificationStatus[] = [
    'CONTRADICTED',
    'SUPPORTED',
    'NOT_ENOUGH_EVIDENCE',
    'UNRELATED',
    'ERROR',
];

const EXISTENCE_PRECEDENCE: readonly CitationExistence[] = [
    'FOUND',
    'AMBIGUOUS',
    'NOT_FOUND',
];

function stanceFor(status: VerificationStatus): EvidenceStance {
    if (status === 'SUPPORTED') return 'SUPPORTING';
    if (status === 'CONTRADICTED') return 'CONTRADICTING';
    return 'NEUTRAL';
}

/** One engine result becomes one evidence record. */
export function toEvidenceRecord(result: EngineVerificationResult): EvidenceRecord {
    return {
        provider: result.metadata.source ?? result.verifiedSources.join(', ') ?? 'Unknown',
        title: result.metadata.paperTitle ?? '(untitled)',
        authors: result.metadata.authors ?? [],
        year: result.metadata.year,
        doi: result.metadata.doi,
        journal: result.metadata.journal,
        abstract: result.evidence,
        citationCount: result.metadata.citationCount,
        retracted: result.retracted,
        // The engine's composite confidence already blends existence
        // certainty with support strength, which is what relevance means
        // at this layer.
        relevance: clampUnit(result.confidence),
        stance: stanceFor(result.status),
        stanceReason: result.reason,
    };
}

/**
 * Merge every per-citation engine result for one claim into the
 * canonical per-claim `VerificationResult`.
 */
export function toCanonicalResult(
    claim: Claim,
    results: EngineVerificationResult[],
): VerificationResult {
    if (results.length === 0) {
        return uncitedResult(claim);
    }

    const evidence = results.map(toEvidenceRecord);

    const status = STATUS_PRECEDENCE.find((s) => results.some((r) => r.status === s))
        ?? 'NOT_ENOUGH_EVIDENCE';

    const existence = EXISTENCE_PRECEDENCE.find((e) => results.some((r) => r.existence === e))
        ?? 'NOT_FOUND';

    // The decisive result is the highest-confidence one matching the
    // winning status, so the surfaced metadata explains the verdict.
    const decisive = results
        .filter((r) => r.status === status)
        .reduce((best, r) => (r.confidence > best.confidence ? r : best));

    return {
        claimId: claim.id,
        citationIds: results.map((r) => r.citationId),
        existence,
        status,
        confidence: clampUnit(decisive.confidence),
        reason: decisive.reason,
        supportingEvidence: evidence.filter((e) => e.stance === 'SUPPORTING'),
        contradictingEvidence: evidence.filter((e) => e.stance === 'CONTRADICTING'),
        evidence: decisive.evidence,
        metadata: {
            doi: decisive.metadata.doi,
            paperTitle: decisive.metadata.paperTitle,
            authors: decisive.metadata.authors,
            journal: decisive.metadata.journal,
            year: decisive.metadata.year,
            citationCount: decisive.metadata.citationCount,
            source: decisive.metadata.source,
        },
    };
}

/**
 * A claim with no citation marker cannot be citation-verified.
 *
 * This is reported as UNRELATED rather than NOT_ENOUGH_EVIDENCE
 * deliberately: NOT_ENOUGH_EVIDENCE means "a source was located but
 * the evidence was too weak", which would be a false statement here.
 * Uncitedness is separately and explicitly counted by
 * `AuditSummary.missingCitation`, so nothing is lost by using the
 * lowest-weight status.
 */
export function uncitedResult(claim: Claim): VerificationResult {
    return {
        claimId: claim.id,
        citationIds: [],
        existence: 'NOT_FOUND',
        status: 'UNRELATED',
        confidence: 0,
        reason:
            'This claim carries no citation marker linked to the reference list, '
            + 'so it could not be verified against a cited source.',
        supportingEvidence: [],
        contradictingEvidence: [],
        metadata: {},
    };
}

function clampUnit(value: number): number {
    if (!Number.isFinite(value)) return 0;
    return Math.round(Math.min(1, Math.max(0, value)) * 10000) / 10000;
}

/** Reflect what the engine learned about a reference back onto the Citation. */
export function applyResolution(
    citation: Citation,
    result: EngineVerificationResult,
): Citation {
    const resolved = result.existence !== 'NOT_FOUND';

    return {
        ...citation,
        resolved,
        retracted: result.retracted,
        resolvedBy: resolved && result.verifiedSources.length > 0
            ? result.verifiedSources.join(', ')
            : citation.resolvedBy,
        doi: citation.doi ?? result.metadata.doi,
        title: citation.title ?? result.metadata.paperTitle,
        year: citation.year ?? result.metadata.year,
        journal: citation.journal ?? result.metadata.journal,
    };
}
