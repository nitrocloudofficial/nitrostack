// src/modules/audit/claim-extractor.service.ts

/**
 * ============================================================
 * VeriCite — Claim Extractor
 * ------------------------------------------------------------
 * Identifies candidate factual claims in a document using pattern
 * matching and lexical heuristics.
 *
 * WHAT CHANGED
 * The extraction heuristics are unchanged — they were sound. What
 * changed is the OUTPUT CONTRACT. This service previously emitted a
 * private `ExtractedClaim` interface whose fields did not line up
 * with what the mapper read:
 *
 *   produced `citationMarkers: string[]`  ->  mapper read `citationMarker?: string`
 *   produced `confidence`, `context`, `lineNumber`  ->  all silently dropped
 *   mapper read `citationId`, `page`, `paragraphIndex`  ->  never produced
 *
 * It now emits the canonical `Claim` from shared/contracts.ts, so
 * every field survives to the report and the widget, and any future
 * drift is a compile error rather than an empty string.
 *
 * The four near-identical push blocks in the old extraction loop
 * have been collapsed into a single classify-then-build step.
 * Classification precedence is unchanged:
 *   statistical -> causal -> comparative -> factual
 * ============================================================
 */

import { Injectable } from '@nitrostack/core';
import type {
    Claim,
    ClaimCategory,
    IClaimExtractionService,
} from '../../shared/contracts.js';
import {
    extractBodySentences,
    segmentDocument,
    type BodySentence,
} from '../../shared/document-segmenter.js';
import { CitationExtractorService } from './citation-extractor.service.js';

/** Extractor confidence by category — how likely the sentence is a real claim. */
const CATEGORY_CONFIDENCE: Readonly<Record<ClaimCategory, number>> = {
    statistical: 0.9,
    causal: 0.82,
    comparative: 0.78,
    factual: 0.72,
    other: 0.6,
};

/** Sentences matching any of these are document furniture, not claims. */
const NON_CLAIM_PATTERNS: readonly RegExp[] = [
    /^\[\d+\]/,
    /^references$/i,
    /^bibliography$/i,
    /^appendix/i,
    /^figure\s+\d+/i,
    /^table\s+\d+/i,
    /doi:/i,
];

@Injectable()
export class ClaimExtractorService implements IClaimExtractionService {

    /* ==========================================================
     * Public API
     * ========================================================== */

    /**
     * Extract claims from the document's ARGUMENT only.
     *
     * The bibliography, appendices, acknowledgements, captions and
     * headings are removed by `segmentDocument` before any sentence
     * is classified. This is the P0-1 root-cause fix: previously the
     * whole document (reference list included) was flattened into one
     * newline-free string and split, which turned every reference
     * entry into a phantom "factual claim".
     */
    async extractClaims(text: string): Promise<Claim[]> {
        if (typeof text !== 'string' || text.trim().length === 0) {
            return [];
        }

        const { body } = segmentDocument(text);
        const sentences = extractBodySentences(body);
        const claims: Claim[] = [];

        for (let i = 0; i < sentences.length; i++) {
            const sentence = sentences[i];

            // Defence in depth. Segmentation should already have removed
            // everything this catches; it stays so a malformed document
            // with no detectable headings still cannot inject apparatus.
            if (this.isNonClaim(sentence.text)) continue;

            const category = this.classify(sentence.text);
            if (category === null) continue;

            claims.push({
                id: `claim_${claims.length}`,
                text: sentence.text,
                category,
                extractionConfidence: CATEGORY_CONFIDENCE[category],
                context: this.getContext(sentences, i),
                paragraphIndex: sentence.paragraphIndex,
                citationMarkers: CitationExtractorService.findInlineMarkers(sentence.text),
                // Populated by CitationExtractorService.linkClaimsToCitations
                // once the reference list has been parsed.
                citationIds: [],
            });
        }

        return claims;
    }

    /** Public classification helper, retained for callers and tests. */
    categorizeClaimType(claim: string): ClaimCategory {
        return this.classify(claim) ?? 'other';
    }

    /* ==========================================================
     * Classification
     * ========================================================== */

    /** Returns null when the sentence is not a claim at all. */
    private classify(sentence: string): ClaimCategory | null {
        if (this.isStatisticalClaim(sentence)) return 'statistical';
        if (this.isCausalClaim(sentence)) return 'causal';
        if (this.isComparativeClaim(sentence)) return 'comparative';
        if (this.isFactualClaim(sentence)) return 'factual';
        return null;
    }

    private isNonClaim(sentence: string): boolean {
        return NON_CLAIM_PATTERNS.some((pattern) => pattern.test(sentence));
    }

    private isStatisticalClaim(line: string): boolean {
        const patterns = [
            /\d+\s*(%|percent|percentage)/i,
            /\d+\.\d+\s*%/i,
            /\d+\s*(million|billion|trillion)/i,
            /\d+\s*(years?|months?|days?|hours?)/i,
            /\d+\s*times/i,
            /approximately\s+\d+/i,
            /about\s+\d+/i,
            /\baccuracy\b/i,
            /\bprecision\b/i,
            /\brecall\b/i,
            /\bf1\b/i,
            /\bauc\b/i,
            /\bbleu\b/i,
            /\brouge\b/i,
            /\bscore\b/i,
            /\bmean\b/i,
            /\bmedian\b/i,
        ];
        return patterns.some((p) => p.test(line));
    }

    private isCausalClaim(line: string): boolean {
        const patterns = [
            /causes?/i,
            /leads?\s+to/i,
            /results?\s+in/i,
            /due\s+to/i,
            /because\s+of/i,
            /as\s+a\s+result/i,
            /therefore/i,
            /consequently/i,
            /improves?/i,
            /increase(s|d)?/i,
            /decrease(s|d)?/i,
            /enhance(s|d)?/i,
            /boost(s|ed)?/i,
            /reduce(s|d)?/i,
            /affect(s|ed)?/i,
            /influence(s|d)?/i,
            /enable(s|d)?/i,
        ];
        return patterns.some((p) => p.test(line));
    }

    private isComparativeClaim(line: string): boolean {
        const patterns = [
            /more\s+than/i,
            /less\s+than/i,
            /greater\s+than/i,
            /smaller\s+than/i,
            /better\s+than/i,
            /worse\s+than/i,
            /compared\s+to/i,
            /versus/i,
            /vs\./i,
            /outperform(s|ed)?/i,
            /surpass(es|ed)?/i,
            /exceed(s|ed)?/i,
            /higher\s+than/i,
            /lower\s+than/i,
            /superior\s+to/i,
            /inferior\s+to/i,
            /more\s+accurate/i,
            /less\s+accurate/i,
        ];
        return patterns.some((p) => p.test(line));
    }

    private isFactualClaim(line: string): boolean {
        if (
            this.isStatisticalClaim(line)
            || this.isCausalClaim(line)
            || this.isComparativeClaim(line)
        ) {
            return false;
        }

        if (line.length < 15) return false;

        return /^[A-Z]/.test(line);
    }

    /* ==========================================================
     * Text handling
     * ========================================================== */

    /**
     * Neighbouring sentences, for display and relevance scoring.
     * Context never crosses a paragraph boundary — the previous
     * implementation could splice unrelated sections together.
     */
    private getContext(sentences: BodySentence[], index: number, contextSize = 1): string {
        const target = sentences[index];
        const start = Math.max(0, index - contextSize);
        const end = Math.min(sentences.length, index + contextSize + 1);

        return sentences
            .slice(start, end)
            .filter((s) => s.paragraphIndex === target.paragraphIndex)
            .map((s) => s.text)
            .join(' ')
            .substring(0, 200);
    }
}
