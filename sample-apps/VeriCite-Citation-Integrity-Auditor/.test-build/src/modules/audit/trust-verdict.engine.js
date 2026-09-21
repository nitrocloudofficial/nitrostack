// src/modules/audit/trust-verdict.engine.ts
import { VERDICT_THRESHOLDS } from '../../shared/constants.js';
const EMPTY_SUMMARY = {
    totalClaims: 0,
    supported: 0,
    contradicted: 0,
    unrelated: 0,
    insufficientEvidence: 0,
    missingCitation: 0,
    errors: 0,
    totalCitations: 0,
    resolvedCitations: 0,
    unresolvedCitations: 0,
    retractedCitations: 0,
    citationCoverage: 0,
    averageConfidence: 0,
};
const MIN_VERDICT_CONFIDENCE = 0.1;
export class TrustVerdictEngine {
    static computeVerdict(input) {
        const summary = input?.summary ?? EMPTY_SUMMARY;
        const results = Array.isArray(input?.results) ? input.results : [];
        const citations = Array.isArray(input?.citations) ? input.citations : [];
        const integrityScore = Math.min(100, Math.max(0, input?.integrityScore ?? 0));
        /* Edge case: nothing to judge --------------------------- */
        if (summary.totalClaims === 0) {
            return TrustVerdictEngine.noClaimsVerdict();
        }
        const total = summary.totalClaims;
        const ratios = {
            supported: summary.supported / total,
            contradicted: summary.contradicted / total,
            missing: summary.missingCitation / Math.max(total, 1),
            error: summary.errors / total,
        };
        const inconclusive = ratios.error >= VERDICT_THRESHOLDS.INCONCLUSIVE_ERROR_RATIO;
        const { level, title } = TrustVerdictEngine.determineLevelAndTitle(integrityScore, summary, ratios, inconclusive);
        const confidence = TrustVerdictEngine.computeConfidence(summary, ratios);
        return {
            level,
            score: integrityScore,
            title,
            summary: TrustVerdictEngine.narrate(level, summary, ratios, inconclusive),
            reasoning: TrustVerdictEngine.reason(integrityScore, summary, ratios, inconclusive),
            strengths: TrustVerdictEngine.strengths(summary, results, citations),
            weaknesses: TrustVerdictEngine.weaknesses(summary, results),
            recommendations: TrustVerdictEngine.recommend(summary, results, level, inconclusive),
            confidence,
            inconclusive,
        };
    }
    /* ==========================================================
     * Classification
     * ========================================================== */
    static determineLevelAndTitle(score, summary, ratios, inconclusive) {
        const level = TrustVerdictEngine.determineLevel(score, summary, ratios);
        if (inconclusive) {
            return {
                level,
                title: `Audit Incomplete — Only ${summary.totalClaims - summary.errors} of ${summary.totalClaims} Claims Could Be Checked`,
            };
        }
        return { level, title: TrustVerdictEngine.titleFor(level, summary) };
    }
    static determineLevel(score, summary, ratios) {
        if (score < VERDICT_THRESHOLDS.CRITICAL_SCORE
            || (summary.contradicted > 0
                && ratios.contradicted >= VERDICT_THRESHOLDS.CRITICAL_CONTRADICTION_RATIO)) {
            return 'CRITICAL';
        }
        if (score < VERDICT_THRESHOLDS.LOW_SCORE
            || ratios.supported < VERDICT_THRESHOLDS.LOW_SUPPORTED_RATIO) {
            return 'LOW_TRUST';
        }
        if (score < VERDICT_THRESHOLDS.MODERATE_SCORE
            || ratios.supported < VERDICT_THRESHOLDS.MODERATE_SUPPORTED_RATIO) {
            return 'MODERATE_TRUST';
        }
        // Any contradiction at all caps the ceiling: a document cannot
        // be "high integrity" while conflicting with published work.
        return summary.contradicted > 0 ? 'MODERATE_TRUST' : 'HIGH_TRUST';
    }
    static titleFor(level, summary) {
        switch (level) {
            case 'CRITICAL':
                if (summary.contradicted > 0) {
                    return `Critical: ${summary.contradicted} Claim(s) Contradicted by Published Literature`;
                }
                if (summary.retractedCitations > 0) {
                    return `Critical: ${summary.retractedCitations} Retracted Reference(s) Cited`;
                }
                return 'Critical: Severe Citation Integrity Deficiency';
            case 'LOW_TRUST':
                return 'Low Citation Integrity — Substantial Verification Deficit';
            case 'MODERATE_TRUST':
                return summary.contradicted > 0
                    ? 'Moderate Trust — Isolated Contradiction Requires Review'
                    : 'Moderate Trust — Partial Peer-Reviewed Support';
            case 'HIGH_TRUST':
                return 'High Academic Integrity Verified';
        }
    }
    /* ==========================================================
     * Narrative
     * ========================================================== */
    static narrate(level, summary, ratios, inconclusive) {
        const total = summary.totalClaims;
        const confidencePct = Math.round(summary.averageConfidence * 100);
        const coveragePct = Math.round(summary.citationCoverage * 100);
        if (inconclusive) {
            return `This audit could not be completed reliably: ${summary.errors} of ${total} claim(s) failed during `
                + 'scholarly retrieval. The verdict below reflects only the minority of claims that were successfully '
                + 'checked and should NOT be read as a judgement on the document. Re-run once providers are reachable.';
        }
        switch (level) {
            case 'HIGH_TRUST':
                return `This document exhibits high academic rigor. ${summary.supported} of ${total} claim(s) are `
                    + `corroborated by indexed scholarly literature at ${confidencePct}% mean confidence, with `
                    + `${coveragePct}% of claims carrying a linked reference. No contradicting evidence was detected.`;
            case 'MODERATE_TRUST':
                return `This document demonstrates moderate credibility. ${summary.supported} of ${total} claim(s) are `
                    + `corroborated, but ${summary.insufficientEvidence + summary.unrelated} claim(s) lack confirming `
                    + `evidence`
                    + (summary.contradicted > 0
                        ? ` and ${summary.contradicted} conflict(s) with published findings`
                        : '')
                    + `. Citation coverage stands at ${coveragePct}%.`;
            case 'LOW_TRUST':
                return `Caution advised. Only ${summary.supported} of ${total} claim(s) could be independently verified `
                    + `against scholarly databases, and ${summary.missingCitation} claim(s) carry no linked reference `
                    + `at all (${coveragePct}% coverage).`;
            case 'CRITICAL':
                if (summary.contradicted > 0) {
                    return `Severe academic integrity risk. ${summary.contradicted} of ${total} claim(s) `
                        + `(${Math.round(ratios.contradicted * 100)}%) are directly contradicted by published `
                        + 'literature. Immediate review and remediation required.';
                }
                return `Severe academic integrity risk. Only ${summary.supported} of ${total} claim(s) are supported `
                    + `and ${summary.missingCitation} are uncited (${coveragePct}% coverage). The document does not `
                    + 'currently meet publication standards for citation integrity.';
        }
    }
    /* ==========================================================
     * Diagnostics
     * ========================================================== */
    static reason(score, summary, ratios, inconclusive) {
        const points = [];
        if (inconclusive) {
            points.push(`COVERAGE WARNING: ${summary.errors} of ${summary.totalClaims} claim(s) could not be checked. `
                + 'Treat every figure below as provisional.');
        }
        points.push(`Integrity Score ${score}/100, derived from per-claim verification outcomes with penalties for uncited claims and retracted references.`);
        points.push(`Verification rate: ${Math.round(ratios.supported * 100)}% supported (${summary.supported}/${summary.totalClaims}).`);
        points.push(`Citation coverage: ${Math.round(summary.citationCoverage * 100)}% of claims carry a linked reference (${summary.missingCitation} uncited).`);
        if (summary.totalCitations > 0) {
            points.push(`Reference list: ${summary.totalCitations} entries parsed, ${summary.resolvedCitations} confirmed `
                + `against a scholarly index, ${summary.unresolvedCitations} unconfirmed.`);
        }
        else {
            points.push('No reference list could be parsed from the document.');
        }
        if (summary.contradicted > 0) {
            points.push(`ALERT: ${summary.contradicted} claim(s) conflict directly with published peer-reviewed findings.`);
        }
        if (summary.retractedCitations > 0) {
            points.push(`ALERT: ${summary.retractedCitations} cited reference(s) have been RETRACTED by their publisher.`);
        }
        if (summary.insufficientEvidence > 0) {
            points.push(`${summary.insufficientEvidence} claim(s) matched indexed sources but lacked evidence strong enough to confirm.`);
        }
        if (summary.unrelated > 0) {
            points.push(`${summary.unrelated} claim(s) matched no topically relevant literature.`);
        }
        if (summary.errors > 0 && !inconclusive) {
            points.push(`${summary.errors} claim(s) failed during retrieval and were excluded from scoring.`);
        }
        return points;
    }
    static strengths(summary, results, citations) {
        const strengths = [];
        if (summary.supported > 0) {
            strengths.push(`${summary.supported} factual assertion(s) corroborated by indexed scholarly literature.`);
        }
        if (summary.contradicted === 0 && summary.totalClaims > 0) {
            strengths.push('Zero literature contradictions detected across all audited claims.');
        }
        if (summary.citationCoverage >= 0.8) {
            strengths.push(`Strong citation discipline: ${Math.round(summary.citationCoverage * 100)}% of claims carry a linked reference.`);
        }
        if (summary.resolvedCitations > 0) {
            strengths.push(`${summary.resolvedCitations} of ${summary.totalCitations} reference(s) confirmed to exist in a scholarly index.`);
        }
        if (summary.averageConfidence >= 0.75) {
            strengths.push(`High mean verification confidence of ${Math.round(summary.averageConfidence * 100)}%.`);
        }
        const providers = new Set(results
            .map((r) => r.metadata?.source)
            .filter((s) => Boolean(s)));
        if (providers.size > 0) {
            strengths.push(`Cross-referenced against ${Array.from(providers).sort().join(', ')}.`);
        }
        if (citations.length > 0 && summary.retractedCitations === 0) {
            strengths.push('No retracted works detected in the reference list.');
        }
        if (strengths.length === 0) {
            strengths.push('Document structure parsed successfully; no positive integrity signals detected.');
        }
        return strengths;
    }
    static weaknesses(summary, results) {
        const weaknesses = [];
        if (summary.contradicted > 0) {
            const examples = results
                .filter((r) => r.status === 'CONTRADICTED')
                .map((r) => r.metadata?.paperTitle)
                .filter((t) => Boolean(t))
                .slice(0, 2);
            weaknesses.push(`${summary.contradicted} claim(s) contradicted by published literature`
                + (examples.length > 0 ? `, including "${examples.join('", "')}".` : '.'));
        }
        if (summary.retractedCitations > 0) {
            weaknesses.push(`${summary.retractedCitations} cited work(s) have been retracted and must be removed.`);
        }
        if (summary.missingCitation > 0) {
            weaknesses.push(`${summary.missingCitation} claim(s) carry no linked bibliographic reference.`);
        }
        if (summary.unresolvedCitations > 0) {
            weaknesses.push(`${summary.unresolvedCitations} reference(s) could not be confirmed against any scholarly index.`);
        }
        if (summary.insufficientEvidence > 0) {
            weaknesses.push(`${summary.insufficientEvidence} claim(s) rest on ambiguous or weak supporting evidence.`);
        }
        if (summary.unrelated > 0) {
            weaknesses.push(`${summary.unrelated} claim(s) could not be matched to any relevant scholarly literature.`);
        }
        if (summary.errors > 0) {
            weaknesses.push(`${summary.errors} claim(s) could not be verified due to provider failures.`);
        }
        if (weaknesses.length === 0) {
            weaknesses.push('No material citation weaknesses detected.');
        }
        return weaknesses;
    }
    static recommend(summary, results, level, inconclusive) {
        const recs = [];
        if (inconclusive) {
            recs.push('Re-run this audit once scholarly providers are reachable; the current coverage is too low to act on.');
        }
        if (summary.retractedCitations > 0) {
            recs.push('URGENT: Remove or replace retracted references — citing retracted work is a publication-blocking defect.');
        }
        if (summary.contradicted > 0) {
            const ids = results
                .filter((r) => r.status === 'CONTRADICTED')
                .map((r) => r.claimId)
                .slice(0, 5);
            recs.push(`URGENT: Revise the claims flagged CONTRADICTED (${ids.join(', ')}) — they conflict with published findings.`);
        }
        if (summary.missingCitation > 0) {
            recs.push(`Add bibliographic references for the ${summary.missingCitation} uncited factual statement(s).`);
        }
        if (summary.unresolvedCitations > 0) {
            recs.push('Verify unconfirmed references — check DOIs and titles, as unresolvable entries may be malformed or fabricated.');
        }
        if (summary.insufficientEvidence > 0) {
            recs.push('Strengthen claims flagged INSUFFICIENT with explicit empirical data or more directly relevant citations.');
        }
        if (summary.errors > 0 && !inconclusive) {
            recs.push('Re-run the audit for claims affected by provider errors to close the coverage gap.');
        }
        if (level === 'HIGH_TRUST' && recs.length === 0) {
            recs.push('Document is ready for submission; maintain reference integrity through final copy-editing.');
        }
        return recs;
    }
    /* ==========================================================
     * Confidence
     * ========================================================== */
    static computeConfidence(summary, ratios) {
        const raw = summary.averageConfidence * (1 - ratios.error);
        const clamped = Math.min(1, Math.max(MIN_VERDICT_CONFIDENCE, raw));
        const rounded = Math.round(clamped * 100) / 100;
        return Number.isNaN(rounded) ? 0.5 : rounded;
    }
    /* ==========================================================
     * Edge case
     * ========================================================== */
    static noClaimsVerdict() {
        return {
            level: 'CRITICAL',
            score: 0,
            title: 'Audit Incomplete: No Extracted Claims',
            summary: 'No verifiable factual claims were extracted from the document, so citation integrity could not be '
                + 'assessed. This reflects the input, not a judgement on the work.',
            reasoning: ['No factual assertions, statistics, or causal statements were identified in the supplied text.'],
            strengths: ['Document structural analysis completed without error.'],
            weaknesses: ['Zero verifiable claims identified.'],
            recommendations: ['Supply a document containing explicit research claims and a reference list.'],
            confidence: MIN_VERDICT_CONFIDENCE,
            inconclusive: true,
        };
    }
}
//# sourceMappingURL=trust-verdict.engine.js.map