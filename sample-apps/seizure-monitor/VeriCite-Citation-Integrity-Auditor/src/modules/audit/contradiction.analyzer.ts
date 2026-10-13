// src/modules/audit/contradiction.analyzer.ts

/**
 * ============================================================
 * VeriCite — Contradiction Analyzer
 * ------------------------------------------------------------
 * Decides the STANCE of one retrieved scholarly work relative to
 * one claim: SUPPORTING, CONTRADICTING, or NEUTRAL.
 *
 * WHY THIS EXISTS
 * The previous verifier classified evidence by relevance score
 * alone — anything scoring <= 0.5 was filed as "contradicting".
 * A weakly-related paper is evidence of *absent support*, not
 * evidence *against*. That conflation made CONTRADICTED both
 * semantically wrong and (combined with the mock provider)
 * unreachable in practice.
 *
 * APPROACH — deterministic heuristics over the abstract:
 *   1. Lexical relevance gate (content-word overlap, title-weighted)
 *   2. Retraction signal
 *   3. Negation cues near shared terminology
 *   4. Polarity antonym conflict (increase vs. decrease, ...)
 *   5. Numeric disagreement on percentages
 *
 * PROPERTIES
 *   PURE          — no I/O, no async, no randomness
 *   DETERMINISTIC — identical input always yields identical stance
 *   EXPLAINABLE   — every stance carries a human-readable reason
 *
 * Chosen over an LLM judge so audits stay free, fast, offline-capable
 * and reproducible. Recall is lower than a model would achieve; the
 * trade-off is recorded in PHASE2_REPORT.md.
 * ============================================================
 */

import type { Claim, EvidenceStance } from '../../shared/contracts.js';
import { EVIDENCE } from '../../shared/constants.js';

export interface StanceAssessment {
    stance: EvidenceStance;
    reason: string;
    relevance: number;
}

export interface EvidenceCandidate {
    title: string;
    abstract?: string;
    retracted?: boolean;
}

/* ------------------------------------------------------------
 * Lexical resources
 * ---------------------------------------------------------- */

const STOP_WORDS = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'been', 'but', 'by', 'can',
    'could', 'did', 'do', 'does', 'for', 'from', 'had', 'has', 'have', 'how',
    'in', 'into', 'is', 'it', 'its', 'may', 'might', 'more', 'most', 'must',
    'no', 'not', 'of', 'on', 'or', 'our', 'over', 'she', 'should', 'so', 'some',
    'such', 'than', 'that', 'the', 'their', 'then', 'there', 'these', 'they',
    'this', 'those', 'through', 'to', 'was', 'we', 'were', 'what', 'when',
    'where', 'which', 'while', 'who', 'will', 'with', 'would', 'you', 'your',
    'also', 'both', 'each', 'other', 'between', 'during', 'after', 'before',
    'using', 'used', 'based', 'study', 'studies', 'result', 'results', 'paper',
    'article', 'research', 'analysis', 'data', 'method', 'methods', 'approach',
]);

/**
 * Antonym pairs. A claim asserting one side while the abstract
 * asserts the other, on a shared topic, is a contradiction signal.
 */
const POLARITY_PAIRS: ReadonlyArray<readonly [string, string]> = [
    ['increase', 'decrease'],
    ['increased', 'decreased'],
    ['increases', 'decreases'],
    ['rise', 'fall'],
    ['rising', 'falling'],
    ['higher', 'lower'],
    ['greater', 'smaller'],
    ['improve', 'worsen'],
    ['improved', 'worsened'],
    ['improves', 'worsens'],
    ['effective', 'ineffective'],
    ['beneficial', 'harmful'],
    ['benefit', 'harm'],
    ['safe', 'unsafe'],
    ['positive', 'negative'],
    ['significant', 'insignificant'],
    ['accelerate', 'decelerate'],
    ['accelerates', 'slows'],
    ['superior', 'inferior'],
    ['outperform', 'underperform'],
    ['outperforms', 'underperforms'],
    ['supports', 'refutes'],
    ['confirms', 'refutes'],
    ['gain', 'loss'],
    ['reduces', 'raises'],
    ['reduce', 'raise'],
];

/** Phrases in an abstract that explicitly negate a finding. */
const NEGATION_CUES: readonly string[] = [
    'no evidence',
    'no significant',
    'not significant',
    'no association',
    'not associated',
    'no correlation',
    'not correlated',
    'no effect',
    'without effect',
    'no difference',
    'no measurable',
    'failed to',
    'unable to',
    'did not',
    'does not',
    'do not support',
    'contrary to',
    'contradict',
    'contradicts',
    'refute',
    'refutes',
    'disprove',
    'disproves',
    'null result',
    'we find no',
    'found no',
    'cannot be attributed',
    'does not support',
];

const PERCENTAGE_PATTERN = /(\d{1,3}(?:\.\d+)?)\s*(?:%|percent)/gi;

/** Absolute percentage-point gap beyond which figures are treated as conflicting. */
const PERCENTAGE_CONFLICT_THRESHOLD = 20;

/** Relevance floor before numeric disagreement is trusted. */
const NUMERIC_CONFLICT_MIN_RELEVANCE = 0.4;

/** Characters of context examined before a negation cue. */
const NEGATION_LOOKBEHIND = 25;

/** Characters of context examined after a negation cue (its actual scope). */
const NEGATION_LOOKAHEAD = 150;

/* ============================================================
 * ContradictionAnalyzer
 * ============================================================ */

export class ContradictionAnalyzer {

    /**
     * Assess one candidate work against one claim.
     * Evaluated in strict precedence order; the first triggered
     * signal wins so the reported reason is the decisive one.
     */
    static analyze(claim: Claim, candidate: EvidenceCandidate): StanceAssessment {
        const claimText = (claim?.text ?? '').toLowerCase();
        const title = (candidate?.title ?? '').toLowerCase();
        const abstract = (candidate?.abstract ?? '').toLowerCase();
        const corpus = `${title} ${abstract}`.trim();

        const relevance = ContradictionAnalyzer.computeRelevance(claimText, title, abstract);

        /* 1. Off-topic gate -------------------------------------- */
        if (relevance < EVIDENCE.MIN_RELEVANCE_CONSIDER) {
            return {
                stance: 'NEUTRAL',
                relevance,
                reason: 'Insufficient topical overlap with the claim to draw any conclusion.',
            };
        }

        /* 2. Retraction ------------------------------------------ */
        if (candidate?.retracted === true) {
            return {
                stance: 'CONTRADICTING',
                relevance,
                reason: 'The cited work has been RETRACTED by its publisher and cannot support this claim.',
            };
        }

        /* Nothing further is decidable without an abstract. ------ */
        if (abstract.length === 0) {
            return relevance >= EVIDENCE.MIN_RELEVANCE_SUPPORT
                ? {
                    stance: 'SUPPORTING',
                    relevance,
                    reason: `Title-level topical match (${Math.round(relevance * 100)}% term overlap); no abstract available for deeper analysis.`,
                }
                : {
                    stance: 'NEUTRAL',
                    relevance,
                    reason: 'Weak topical match and no abstract available for stance analysis.',
                };
        }

        const trustContradiction = relevance >= EVIDENCE.MIN_RELEVANCE_CONTRADICTION;

        /* 3. Negation cues --------------------------------------- */
        if (trustContradiction) {
            const cue = ContradictionAnalyzer.findNegationCue(abstract, claimText);
            if (cue) {
                return {
                    stance: 'CONTRADICTING',
                    relevance,
                    reason: `Source explicitly negates the claim ("${cue}") while discussing the same subject matter.`,
                };
            }
        }

        /* 4. Polarity conflict ----------------------------------- */
        if (trustContradiction) {
            const conflict = ContradictionAnalyzer.findPolarityConflict(claimText, corpus);
            if (conflict) {
                return {
                    stance: 'CONTRADICTING',
                    relevance,
                    reason: `Directional conflict: the claim asserts "${conflict.claimTerm}" whereas the source reports "${conflict.sourceTerm}".`,
                };
            }
        }

        /* 5. Numeric disagreement -------------------------------- */
        if (relevance >= NUMERIC_CONFLICT_MIN_RELEVANCE) {
            const numeric = ContradictionAnalyzer.findPercentageConflict(claimText, abstract);
            if (numeric) {
                return {
                    stance: 'CONTRADICTING',
                    relevance,
                    reason: `Quantitative disagreement: the claim states ${numeric.claimValue}% but the source reports ${numeric.sourceValue}%.`,
                };
            }
        }

        /* 6. Default --------------------------------------------- */
        if (relevance >= EVIDENCE.MIN_RELEVANCE_SUPPORT) {
            return {
                stance: 'SUPPORTING',
                relevance,
                reason: `Source addresses the same subject matter (${Math.round(relevance * 100)}% term overlap) with no contradicting signal detected.`,
            };
        }

        return {
            stance: 'NEUTRAL',
            relevance,
            reason: `Partial topical overlap (${Math.round(relevance * 100)}%), too weak to confirm or refute the claim.`,
        };
    }

    /* ==========================================================
     * Relevance
     * ========================================================== */

    /**
     * Weighted content-word overlap. Title matches count double —
     * a term in the title is far stronger evidence of aboutness
     * than the same term buried in an abstract.
     */
    static computeRelevance(claimText: string, title: string, abstract: string): number {
        const claimTerms = ContradictionAnalyzer.contentTerms(claimText);
        if (claimTerms.size === 0) return 0;

        const titleTerms = ContradictionAnalyzer.contentTerms(title);
        const abstractTerms = ContradictionAnalyzer.contentTerms(abstract);

        let score = 0;

        for (const term of claimTerms) {
            if (titleTerms.has(term)) score += 2;
            else if (abstractTerms.has(term)) score += 1;
        }

        // Perfect score is every claim term appearing in the title.
        const normalised = score / (claimTerms.size * 2);
        return Math.min(1, Math.round(normalised * 100) / 100);
    }

    /* ==========================================================
     * Signal detectors
     * ========================================================== */

    /**
     * A negation cue only counts when it sits near vocabulary the
     * claim also uses — otherwise an unrelated null finding in the
     * same abstract would be misread as refuting our claim.
     */
    private static findNegationCue(abstract: string, claimText: string): string | null {
        const claimTerms = ContradictionAnalyzer.contentTerms(claimText);

        for (const cue of NEGATION_CUES) {
            const at = abstract.indexOf(cue);
            if (at < 0) continue;

            // A negation's scope is what FOLLOWS it ("we found no evidence
            // THAT vaccination causes autism"), so the window is heavily
            // forward-weighted. A wide symmetric window let an unrelated
            // null finding elsewhere in the same abstract read as refuting
            // the claim — e.g. "no evidence of instrument drift" in a paper
            // that otherwise supports the claim.
            const window = abstract.slice(
                Math.max(0, at - NEGATION_LOOKBEHIND),
                Math.min(abstract.length, at + cue.length + NEGATION_LOOKAHEAD),
            );

            const windowTerms = ContradictionAnalyzer.contentTerms(window);
            let shared = 0;
            for (const term of claimTerms) {
                if (windowTerms.has(term)) shared++;
            }

            if (shared >= 2) return cue;
        }

        return null;
    }

    private static findPolarityConflict(
        claimText: string,
        corpus: string,
    ): { claimTerm: string; sourceTerm: string } | null {
        const claimTerms = ContradictionAnalyzer.tokenize(claimText);
        const corpusTerms = ContradictionAnalyzer.tokenize(corpus);

        for (const [left, right] of POLARITY_PAIRS) {
            if (claimTerms.has(left) && corpusTerms.has(right) && !claimTerms.has(right)) {
                return { claimTerm: left, sourceTerm: right };
            }
            if (claimTerms.has(right) && corpusTerms.has(left) && !claimTerms.has(left)) {
                return { claimTerm: right, sourceTerm: left };
            }
        }

        return null;
    }

    private static findPercentageConflict(
        claimText: string,
        abstract: string,
    ): { claimValue: number; sourceValue: number } | null {
        const claimValues = ContradictionAnalyzer.extractPercentages(claimText);
        const sourceValues = ContradictionAnalyzer.extractPercentages(abstract);

        if (claimValues.length === 0 || sourceValues.length === 0) return null;

        for (const claimValue of claimValues) {
            // Agreement with ANY reported figure clears the claim.
            const agrees = sourceValues.some(
                (v) => Math.abs(v - claimValue) <= PERCENTAGE_CONFLICT_THRESHOLD,
            );
            if (agrees) return null;
        }

        const claimValue = claimValues[0];
        const sourceValue = sourceValues.reduce((closest, v) =>
            Math.abs(v - claimValue) < Math.abs(closest - claimValue) ? v : closest,
        );

        return { claimValue, sourceValue };
    }

    /* ==========================================================
     * Tokenisation
     * ========================================================== */

    private static extractPercentages(text: string): number[] {
        const values: number[] = [];
        for (const match of text.matchAll(PERCENTAGE_PATTERN)) {
            const value = Number(match[1]);
            if (Number.isFinite(value) && value >= 0 && value <= 100) {
                values.push(value);
            }
        }
        return values;
    }

    private static tokenize(text: string): Set<string> {
        return new Set(
            text
                .toLowerCase()
                .replace(/[^a-z0-9\s-]/g, ' ')
                .split(/\s+/)
                .filter((t) => t.length > 0),
        );
    }

    /** Tokens minus stop words, lightly stemmed so plurals match. */
    private static contentTerms(text: string): Set<string> {
        const terms = new Set<string>();

        for (const token of ContradictionAnalyzer.tokenize(text)) {
            if (token.length < 4) continue;
            if (STOP_WORDS.has(token)) continue;
            terms.add(ContradictionAnalyzer.stem(token));
        }

        return terms;
    }

    /** Suffix stripping only — enough to unify plural/tense variants. */
    private static stem(token: string): string {
        if (token.length > 5 && token.endsWith('ies')) return `${token.slice(0, -3)}y`;
        if (token.length > 5 && token.endsWith('ing')) return token.slice(0, -3);
        if (token.length > 4 && token.endsWith('ed')) return token.slice(0, -2);
        if (token.length > 4 && token.endsWith('es')) return token.slice(0, -2);
        if (token.length > 3 && token.endsWith('s') && !token.endsWith('ss')) {
            return token.slice(0, -1);
        }
        return token;
    }
}
