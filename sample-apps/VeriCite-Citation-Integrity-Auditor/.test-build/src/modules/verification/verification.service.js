/**
 * VeriCite – Verification Engine
 * verification.service.ts
 *
 * Orchestrator — receives a Claim + Citation, fans out to all lookup
 * services in parallel, merges results, and returns a VerificationResult matching shared contracts.
 */
import { CrossrefService } from "./services/crossref.service.js";
import { OpenAlexService } from "./services/openalex.service.js";
import { SemanticScholarService } from "./services/semantic-scholar.service.js";
import { SupportVerifierService } from "./services/support-verifier.service.js";
import { createLogger } from "./utils/logger.js";
const logger = createLogger("verification-service");
// ── Confidence scoring ────────────────────────────────────────────────────
/**
 * Helper to wrap any promise with a hard timeout.
 * Prevents hanging network calls or stalled sockets from blocking the engine.
 */
function withTimeout(promiseFn, timeoutMs, label) {
    let timer;
    const timeoutPromise = new Promise((_, reject) => {
        timer = setTimeout(() => {
            reject(new Error(`${label} after ${timeoutMs}ms`));
        }, timeoutMs);
    });
    return Promise.race([
        promiseFn().finally(() => clearTimeout(timer)),
        timeoutPromise,
    ]);
}
/**
 * Computes an existence confidence score in [0, 1].
 */
function computeExistenceConfidence(crossref, openAlex, semScholar) {
    const hits = [crossref, openAlex, semScholar].filter((p) => p !== null);
    const hitCount = hits.length;
    if (hitCount === 0)
        return 0.0;
    const hasDoiMatch = hits.some((p) => typeof p.doi === "string" && p.doi.trim().length > 0);
    let score = hitCount / 3;
    if (hasDoiMatch) {
        score = Math.max(score, 0.75 + 0.25 * (hitCount / 3));
    }
    else if (hitCount >= 2) {
        score = Math.max(score, 0.70);
    }
    else {
        score = Math.max(score, 0.45);
    }
    return parseFloat(Math.min(1.0, score).toFixed(4));
}
/**
 * Composite confidence = weighted combination of existence + support confidence.
 */
function computeCompositeConfidence(existenceConfidence, supportConfidence, hasAbstract) {
    if (!hasAbstract) {
        return parseFloat((existenceConfidence * 0.75).toFixed(4));
    }
    const composite = 0.4 * existenceConfidence + 0.6 * supportConfidence;
    return parseFloat(Math.min(1.0, Math.max(0.0, composite)).toFixed(4));
}
// ── Metadata merging ──────────────────────────────────────────────────────
function mergeMetadata(crossref, openAlex, semScholar) {
    const resolvedDoi = crossref?.doi ?? openAlex?.doi ?? semScholar?.doi ?? null;
    const canonicalTitle = crossref?.title ?? openAlex?.title ?? semScholar?.title ?? null;
    const allAuthorLists = [
        crossref?.authors ?? [],
        openAlex?.authors ?? [],
        semScholar?.authors ?? [],
    ];
    const resolvedAuthors = allAuthorLists.reduce((best, cur) => (cur.length > best.length ? cur : best), []);
    const resolvedYear = crossref?.year ?? openAlex?.year ?? semScholar?.year ?? null;
    const abstract = openAlex?.abstract ?? semScholar?.abstract ?? null;
    const citationCount = semScholar?.citationCount ?? openAlex?.citationCount ?? null;
    const venue = semScholar?.venue ?? openAlex?.venue ?? null;
    return {
        resolvedDoi,
        canonicalTitle,
        resolvedAuthors,
        resolvedYear,
        abstract,
        citationCount,
        venue,
        semanticScholarId: semScholar?.paperId ?? null,
        openAlexId: openAlex?.id ?? null,
        concepts: openAlex?.concepts ?? [],
        retracted: openAlex?.retracted === true,
        crossrefVerified: crossref !== null,
        semanticScholarVerified: semScholar !== null,
        openAlexVerified: openAlex !== null,
    };
}
// ── Build reason string ───────────────────────────────────────────────────
function buildReason(exists, existenceConfidence, supportStatus, supportReason, metadata) {
    if (!exists) {
        return "The cited paper could not be found in any academic database (Crossref, OpenAlex, Semantic Scholar).";
    }
    const parts = [];
    const verifiedBy = [];
    if (metadata.crossrefVerified)
        verifiedBy.push("Crossref");
    if (metadata.openAlexVerified)
        verifiedBy.push("OpenAlex");
    if (metadata.semanticScholarVerified)
        verifiedBy.push("Semantic Scholar");
    parts.push(`Paper confirmed in ${verifiedBy.join(", ")} (existence confidence: ${(existenceConfidence * 100).toFixed(0)}%).`);
    if (metadata.resolvedDoi) {
        parts.push(`DOI: ${metadata.resolvedDoi}.`);
    }
    if (!metadata.abstract) {
        parts.push("No abstract was available for support verification.");
    }
    else {
        parts.push(`Claim support verdict: ${supportStatus}. ${supportReason}`);
    }
    return parts.join(" ");
}
const CACHE_TTL_MS = 30 * 60 * 1_000;
// ── Main orchestrator class ───────────────────────────────────────────────
export class VerificationService {
    crossref;
    openAlex;
    semScholar;
    supportVerifier;
    cache = new Map();
    constructor(crossref, openAlex, semScholar, supportVerifier) {
        this.crossref = crossref ?? new CrossrefService();
        this.openAlex = openAlex ?? new OpenAlexService();
        this.semScholar = semScholar ?? new SemanticScholarService();
        this.supportVerifier = supportVerifier ?? new SupportVerifierService();
    }
    buildCacheKey(citation) {
        if (citation.doi) {
            return `doi:${citation.doi.toLowerCase().trim()}`;
        }
        const searchTitle = citation.title?.trim() || citation.raw.trim();
        return `title:${searchTitle.toLowerCase()}`;
    }
    getCached(key) {
        const entry = this.cache.get(key);
        if (!entry)
            return undefined;
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            logger.debug("Cache: evicted stale entry", { key });
            return undefined;
        }
        return entry.result;
    }
    setCached(key, result) {
        this.cache.set(key, {
            result,
            expiresAt: Date.now() + CACHE_TTL_MS,
        });
        logger.debug("Cache: stored result", {
            key,
            expiresIn: `${CACHE_TTL_MS / 60_000}min`,
        });
    }
    /**
     * Verifies a claim against its cited paper citation.
     */
    async verifyCitation(claim, citation) {
        const startMs = Date.now();
        logger.info("Starting citation verification", {
            claimId: claim.id,
            citationId: citation.id,
            title: citation.title ?? "N/A",
            raw: citation.raw,
            doi: citation.doi ?? "N/A",
        });
        // ── Cache read ────────────────────────────────────────────────────────
        const cacheKey = this.buildCacheKey(citation);
        const cached = this.getCached(cacheKey);
        if (cached) {
            logger.info("Cache hit — returning cached result", { cacheKey });
            return {
                ...cached,
                claimId: claim.id,
                citationId: citation.id,
            };
        }
        // ── Phase 1: Parallel API lookups ──────────────────────────────────────
        logger.info("Phase 1: running parallel API lookups with bounded timeouts");
        const [crossrefResult, openAlexResult, semScholarResult] = await Promise.all([
            this.safeLookup("Crossref", () => this.crossref.lookupPaper(citation)),
            this.safeLookup("OpenAlex", () => this.openAlex.lookupPaper(citation)),
            this.safeLookup("Semantic Scholar", () => this.semScholar.lookupPaper(citation)),
        ]);
        // ── Phase 2: Merge metadata & calculate existence ──────────────────────
        const internalMeta = mergeMetadata(crossrefResult, openAlexResult, semScholarResult);
        const exists = internalMeta.crossrefVerified || internalMeta.openAlexVerified || internalMeta.semanticScholarVerified;
        const existenceConfidence = computeExistenceConfidence(crossrefResult, openAlexResult, semScholarResult);
        const verifiedSources = [];
        if (internalMeta.crossrefVerified)
            verifiedSources.push("Crossref");
        if (internalMeta.openAlexVerified)
            verifiedSources.push("OpenAlex");
        if (internalMeta.semanticScholarVerified)
            verifiedSources.push("Semantic Scholar");
        const existence = exists
            ? existenceConfidence < 0.5
                ? "AMBIGUOUS"
                : "FOUND"
            : "NOT_FOUND";
        logger.info("Phase 2: metadata merged", {
            exists,
            existence,
            existenceConfidence,
            doi: internalMeta.resolvedDoi ?? "unresolved",
            verifiedSourcesCount: verifiedSources.length,
        });
        // ── Phase 3: LLM Support Verification ────────────────────────────────
        logger.info("Phase 3: running LLM support verification");
        const supportResult = await this.supportVerifier.verifySupportClaim(claim.text, internalMeta.abstract);
        logger.info("Phase 3: support verification complete", {
            status: supportResult.status,
            confidence: supportResult.confidence,
        });
        // ── Phase 4: Assemble final result matching shared contracts ──────────
        const compositeConfidence = computeCompositeConfidence(existenceConfidence, supportResult.confidence, Boolean(internalMeta.abstract));
        const reason = buildReason(exists, existenceConfidence, supportResult.status, supportResult.reason, internalMeta);
        const result = {
            claimId: claim.id,
            citationId: citation.id,
            existence,
            // A retracted source cannot support a claim, whatever the abstract says.
            status: internalMeta.retracted
                ? "CONTRADICTED"
                : exists
                    ? supportResult.status
                    : "NOT_ENOUGH_EVIDENCE",
            confidence: compositeConfidence,
            reason: internalMeta.retracted
                ? `The cited work has been RETRACTED by its publisher. ${reason}`
                : reason,
            verifiedSources,
            retracted: internalMeta.retracted,
            ...(internalMeta.abstract ? { evidence: internalMeta.abstract } : {}),
            metadata: {
                ...(internalMeta.resolvedDoi || citation.doi ? { doi: internalMeta.resolvedDoi ?? citation.doi } : {}),
                ...(internalMeta.canonicalTitle || citation.title ? { paperTitle: internalMeta.canonicalTitle ?? citation.title } : {}),
                ...(internalMeta.resolvedAuthors.length > 0 || citation.authors ? { authors: internalMeta.resolvedAuthors.length > 0 ? internalMeta.resolvedAuthors : citation.authors } : {}),
                ...(internalMeta.venue || citation.journal ? { journal: internalMeta.venue ?? citation.journal } : {}),
                ...(internalMeta.resolvedYear || citation.year ? { year: internalMeta.resolvedYear ?? citation.year } : {}),
                ...(internalMeta.citationCount !== null ? { citationCount: internalMeta.citationCount } : {}),
                ...(verifiedSources.length > 0 ? { source: verifiedSources.join(", ") } : {}),
            },
        };
        const totalDurationMs = Date.now() - startMs;
        logger.info("Verification complete", {
            claimId: claim.id,
            citationId: citation.id,
            existence: result.existence,
            status: result.status,
            confidence: compositeConfidence,
            durationMs: totalDurationMs,
        });
        // ── Cache write ───────────────────────────────────────────────────────
        if (exists) {
            this.setCached(cacheKey, result);
        }
        return result;
    }
    async safeLookup(sourceName, fn) {
        const startMs = Date.now();
        const HARD_TIMEOUT_MS = 12_000;
        try {
            const result = await withTimeout(fn, HARD_TIMEOUT_MS, `${sourceName} provider lookup timed out`);
            const elapsedMs = Date.now() - startMs;
            if (result) {
                logger.info(`${sourceName} lookup succeeded (${elapsedMs}ms)`);
            }
            else {
                logger.warn(`${sourceName} lookup returned no matching record (${elapsedMs}ms)`);
            }
            return result;
        }
        catch (err) {
            const elapsedMs = Date.now() - startMs;
            logger.error(`${sourceName} lookup failed or timed out (${elapsedMs}ms) — continuing with remaining providers`, {
                error: err instanceof Error ? err.message : String(err),
            });
            return null;
        }
    }
}
//# sourceMappingURL=verification.service.js.map