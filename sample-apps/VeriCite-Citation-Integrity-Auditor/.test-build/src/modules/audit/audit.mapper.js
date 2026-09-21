// src/modules/audit/audit.mapper.ts
import { SCORING, SEVERITY_THRESHOLDS } from '../../shared/constants.js';
import { TrustVerdictEngine } from './trust-verdict.engine.js';
const SCORE_MIN = 0;
const SCORE_MAX = 100;
export class AuditMapper {
    /* ==========================================================
     * Normalisation
     * ----------------------------------------------------------
     * Producers already emit canonical shapes. These passes only
     * enforce invariants the rest of the pipeline relies on:
     * arrays are arrays, numbers are in range, ids are present.
     * ========================================================== */
    static normaliseClaims(claims) {
        if (!Array.isArray(claims))
            return [];
        return claims
            .filter((c) => Boolean(c))
            .map((c) => ({
            ...c,
            id: c.id || 'claim_unknown',
            text: c.text ?? '',
            category: c.category ?? 'other',
            extractionConfidence: AuditMapper.clampUnit(c.extractionConfidence),
            context: c.context ?? '',
            paragraphIndex: Number.isInteger(c.paragraphIndex) ? c.paragraphIndex : 0,
            citationMarkers: Array.isArray(c.citationMarkers) ? c.citationMarkers : [],
            citationIds: Array.isArray(c.citationIds) ? c.citationIds : [],
        }));
    }
    static normaliseCitations(citations) {
        if (!Array.isArray(citations))
            return [];
        return citations
            .filter((c) => Boolean(c))
            .map((c) => ({
            ...c,
            id: c.id || 'cit_unknown',
            raw: c.raw ?? '',
            marker: c.marker ?? '',
            resolved: c.resolved === true,
            retracted: c.retracted === true,
        }));
    }
    static normaliseResults(results) {
        if (!Array.isArray(results))
            return [];
        return results
            .filter((r) => Boolean(r))
            .map((r) => ({
            ...r,
            claimId: r.claimId || 'unknown',
            citationIds: Array.isArray(r.citationIds) ? r.citationIds : [],
            existence: r.existence ?? 'AMBIGUOUS',
            status: r.status ?? 'ERROR',
            confidence: AuditMapper.clampUnit(r.confidence),
            reason: r.reason ?? '',
            supportingEvidence: AuditMapper.normaliseEvidence(r.supportingEvidence),
            contradictingEvidence: AuditMapper.normaliseEvidence(r.contradictingEvidence),
            metadata: r.metadata ?? {},
        }));
    }
    static normaliseEvidence(evidence) {
        if (!Array.isArray(evidence))
            return [];
        return evidence
            .filter((e) => Boolean(e))
            .map((e) => ({
            ...e,
            authors: Array.isArray(e.authors) ? e.authors : [],
            relevance: AuditMapper.clampUnit(e.relevance),
            retracted: e.retracted === true,
            stance: e.stance ?? 'NEUTRAL',
            stanceReason: e.stanceReason ?? '',
        }));
    }
    /* ==========================================================
     * Aggregation
     * ========================================================== */
    /**
     * Build the summary from real extracted data.
     *
     * `missingCitation` is derived from CLAIMS — a claim with an
     * empty `citationIds` is uncited — not from a verifier field
     * that never existed. That single change is what breaks the
     * always-CRITICAL degeneracy.
     */
    static buildSummary(claims, citations, results) {
        const safeClaims = Array.isArray(claims) ? claims : [];
        const safeCitations = Array.isArray(citations) ? citations : [];
        const safeResults = Array.isArray(results) ? results : [];
        const countBy = (status) => safeResults.filter((r) => r.status === status).length;
        const citedClaims = safeClaims.filter((c) => c.citationIds.length > 0).length;
        const resolvedCitations = safeCitations.filter((c) => c.resolved).length;
        const retractedCitations = safeCitations.filter((c) => c.retracted === true).length;
        const scoredResults = safeResults.filter((r) => r.status !== 'ERROR');
        const averageConfidence = scoredResults.length > 0
            ? scoredResults.reduce((sum, r) => sum + r.confidence, 0) / scoredResults.length
            : 0;
        return {
            totalClaims: safeResults.length,
            supported: countBy('SUPPORTED'),
            contradicted: countBy('CONTRADICTED'),
            unrelated: countBy('UNRELATED'),
            insufficientEvidence: countBy('NOT_ENOUGH_EVIDENCE'),
            missingCitation: safeClaims.length - citedClaims,
            errors: countBy('ERROR'),
            totalCitations: safeCitations.length,
            resolvedCitations,
            unresolvedCitations: safeCitations.length - resolvedCitations,
            retractedCitations,
            citationCoverage: safeClaims.length > 0
                ? Math.round((citedClaims / safeClaims.length) * 100) / 100
                : 0,
            averageConfidence: Math.round(averageConfidence * 100) / 100,
        };
    }
    /* ==========================================================
     * Scoring
     * ========================================================== */
    /**
     * Integrity Score, [0, 100].
     *
     *   base    = mean status points across NON-ERROR claims
     *   penalty = citation-coverage shortfall + retracted references
     *
     * ERROR claims are excluded from the denominator on purpose: a
     * provider outage is our failure, not the author's, and must not
     * be scored as though the document were unsupported. Their count
     * still surfaces in the summary and lowers verdict confidence.
     */
    static computeIntegrityScore(summary) {
        const scoredCount = summary.supported
            + summary.contradicted
            + summary.unrelated
            + summary.insufficientEvidence;
        if (scoredCount === 0)
            return SCORE_MIN;
        const points = summary.supported * SCORING.STATUS_POINTS.SUPPORTED
            + summary.insufficientEvidence * SCORING.STATUS_POINTS.NOT_ENOUGH_EVIDENCE
            + summary.unrelated * SCORING.STATUS_POINTS.UNRELATED
            + summary.contradicted * SCORING.STATUS_POINTS.CONTRADICTED;
        const base = points / scoredCount;
        const coveragePenalty = (1 - AuditMapper.clampUnit(summary.citationCoverage)) * SCORING.MAX_COVERAGE_PENALTY;
        const retractionPenalty = Math.min(SCORING.MAX_RETRACTION_PENALTY, summary.retractedCitations * SCORING.RETRACTION_PENALTY_PER_CITATION);
        const score = Math.round(base - coveragePenalty - retractionPenalty);
        return Math.min(SCORE_MAX, Math.max(SCORE_MIN, score));
    }
    static scoreToSeverity(score) {
        if (score >= SEVERITY_THRESHOLDS.GREEN)
            return 'GREEN';
        if (score >= SEVERITY_THRESHOLDS.AMBER)
            return 'AMBER';
        return 'RED';
    }
    /* ==========================================================
     * Assembly
     * ========================================================== */
    static buildReport(input) {
        const claims = AuditMapper.normaliseClaims(input?.claims);
        const citations = AuditMapper.normaliseCitations(input?.citations);
        const results = AuditMapper.normaliseResults(input?.results);
        const summary = AuditMapper.buildSummary(claims, citations, results);
        const integrityScore = AuditMapper.computeIntegrityScore(summary);
        const severity = AuditMapper.scoreToSeverity(integrityScore);
        const verdict = TrustVerdictEngine.computeVerdict({
            integrityScore,
            summary,
            results,
            citations,
        });
        return {
            documentName: input?.documentName || 'uploaded-document',
            generatedAt: new Date().toISOString(),
            durationMs: Math.max(0, input?.durationMs ?? 0),
            integrityScore,
            severity,
            verdict,
            claims,
            citations,
            results,
            summary,
            offlineMode: input?.offlineMode === true,
        };
    }
    /* ==========================================================
     * Helpers
     * ========================================================== */
    static clampUnit(value) {
        if (typeof value !== 'number' || !Number.isFinite(value))
            return 0;
        return Math.min(1, Math.max(0, value));
    }
}
//# sourceMappingURL=audit.mapper.js.map