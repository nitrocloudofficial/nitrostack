// src/modules/verification/citation-verification.service.ts
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
/**
 * ============================================================
 * VeriCite — Citation Verification Facade
 * ------------------------------------------------------------
 * The single entry point the orchestrator calls. Implements
 * CITATION-FIRST retrieval:
 *
 *   Claim -> its citation markers -> resolved Citation objects
 *         -> DOI (or title) lookup across Crossref / OpenAlex /
 *            Semantic Scholar
 *         -> abstract -> LLM support verdict -> canonical result
 *
 * WHY THIS REPLACES ScholarlyApiService (P0-2 root cause)
 *
 * The previous implementation searched Crossref using the CLAIM
 * SENTENCE. That answers "does any paper anywhere discuss this
 * topic?", not "does the paper this claim cites support it?" —
 * which is the only question a citation auditor should ask.
 *
 * Observed live, searching by claim text for a transformer claim:
 *
 *   [Crossref] rel=0.5  stance=SUPPORTING  abstract=NO
 *              "Attention is All You Need... Unless You Are a CISO"
 *   [Crossref] rel=0.5  stance=SUPPORTING  abstract=NO
 *              "Attention via Synaptic Plasticity is All You Need"
 *
 * Fuzzy title matches on unrelated papers, both marked SUPPORTING
 * with no abstract ever retrieved — a false-positive generator.
 *
 * The engine cannot make that mistake: it looks up the cited work by
 * DOI first, and never issues a support verdict without an abstract.
 * ============================================================
 */
import { Injectable } from '@nitrostack/core';
import { TtlCache } from '../../shared/cache.js';
import { getConfig } from '../../shared/config.js';
import { describeError } from '../../shared/error.js';
import { OfflineVerificationService } from './offline-verification.service.js';
import { VerificationService } from './verification.service.js';
import { applyResolution, toCanonicalResult, uncitedResult } from './verification.adapter.js';
let CitationVerificationService = class CitationVerificationService {
    offlineVerifier;
    /**
     * The vendored engine composes its own providers internally.
     * Constructed lazily so environment variables are read only once
     * the first verification is actually requested.
     */
    engine = null;
    /**
     * Cross-claim verification cache.
     *
     * The engine caches internally per DOI, but only for the lifetime
     * of one VerificationService instance and with no entry cap. This
     * bounded cache sits above it so repeated citations across claims
     * (and across audits) cost one lookup, while memory stays capped
     * in a long-running MCP server.
     */
    cache;
    constructor(offlineVerifier) {
        this.offlineVerifier = offlineVerifier;
        const config = getConfig();
        this.cache = new TtlCache(config.cacheTtlMs, config.maxCacheEntries);
    }
    isOffline() {
        return getConfig().offline;
    }
    /** Cache telemetry, for logging and tests. */
    cacheStats() {
        return this.cache.stats();
    }
    /**
     * Verify one claim against every citation it actually cites.
     *
     * `evidence` is accepted to satisfy IVerificationService but is
     * unused: this service retrieves its own evidence citation-first
     * rather than receiving a pre-fetched claim-text search.
     */
    async verifyClaim(claim, citations, _evidence = []) {
        const { result } = await this.verifyClaimWithResolutions(claim, citations);
        return result;
    }
    /**
     * Verify a claim and additionally report what was learned about
     * each cited reference, so the orchestrator can mark citations
     * resolved/retracted without a second round of lookups.
     */
    async verifyClaimWithResolutions(claim, citations) {
        const linked = this.linkedCitations(claim, citations);
        if (linked.length === 0) {
            return { result: uncitedResult(claim), resolutions: [] };
        }
        const engineResults = [];
        const resolutions = [];
        for (const citation of linked) {
            try {
                const engineResult = await this.verifyOne(claim, citation);
                engineResults.push(engineResult);
                resolutions.push(applyResolution(citation, engineResult));
            }
            catch (error) {
                // One unreachable provider must not sink the claim; record
                // the failure against that citation and continue.
                engineResults.push({
                    claimId: claim.id,
                    citationId: citation.id,
                    existence: 'AMBIGUOUS',
                    status: 'ERROR',
                    confidence: 0,
                    reason: `Verification failed for this citation: ${describeError(error).message}`,
                    verifiedSources: [],
                    retracted: false,
                    metadata: {},
                });
                resolutions.push({ ...citation, resolved: false });
            }
        }
        return { result: toCanonicalResult(claim, engineResults), resolutions };
    }
    /* ==========================================================
     * Private
     * ========================================================== */
    async verifyOne(claim, citation) {
        const key = this.cacheKey(claim, citation);
        const cached = this.cache.get(key);
        if (cached) {
            // Re-key onto the requesting claim/citation; the verdict itself
            // depends only on (claim text, cited work), which the key covers.
            return { ...cached, claimId: claim.id, citationId: citation.id };
        }
        const result = this.isOffline()
            ? await this.offlineVerifier.verifyCitation(claim, citation)
            : await this.liveEngine().verifyCitation(claim, citation);
        // Never cache a transient failure as though it were a finding.
        if (result.status !== 'ERROR') {
            this.cache.set(key, result);
        }
        return result;
    }
    liveEngine() {
        if (!this.engine)
            this.engine = new VerificationService();
        return this.engine;
    }
    /**
     * Cache identity is (claim text, cited work) — the two inputs the
     * verdict actually depends on. Claim and citation ids are excluded
     * so the same assertion citing the same paper in a different
     * document reuses the result.
     */
    cacheKey(claim, citation) {
        const work = citation.doi
            ? `doi:${citation.doi.toLowerCase()}`
            : `raw:${(citation.title ?? citation.raw).toLowerCase().slice(0, 160)}`;
        return `${work}::${claim.text.toLowerCase().slice(0, 240)}`;
    }
    linkedCitations(claim, citations) {
        if (!Array.isArray(citations) || claim.citationIds.length === 0)
            return [];
        const wanted = new Set(claim.citationIds);
        return citations
            .filter((c) => wanted.has(c.id))
            .slice(0, getConfig().maxCitationsPerClaim);
    }
};
CitationVerificationService = __decorate([
    Injectable({ deps: [OfflineVerificationService] }),
    __metadata("design:paramtypes", [OfflineVerificationService])
], CitationVerificationService);
export { CitationVerificationService };
//# sourceMappingURL=citation-verification.service.js.map