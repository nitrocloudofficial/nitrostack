// src/modules/audit/audit.tools.ts

/**
 * ============================================================
 * VeriCite — Audit Tools (MCP Surface + Orchestrator)
 * ------------------------------------------------------------
 * Exposes three MCP tools:
 *
 *   extract_claims   — unchanged external surface
 *   verify_citation  — unchanged external surface
 *   run_full_audit   — primary orchestrator
 *
 * PIPELINE (citation-first, P0-2)
 *
 *   Document
 *     -> segment body / references          (document-segmenter)
 *     -> Claim Extraction                   (ClaimExtractorService)
 *     -> Citation Marker Extraction + link  (CitationExtractorService)
 *     -> DOI resolution + Crossref/OpenAlex/Semantic Scholar
 *        + LLM support verdict              (CitationVerificationService)
 *     -> Audit Mapper -> Trust Verdict -> Audit Report -> Widget
 *
 * WHAT CHANGED IN THIS PHASE
 *   • Claims are now extracted from the document BODY only. The
 *     bibliography previously produced phantom claims (measured:
 *     7 claims from a 2-sentence body), which inflated
 *     `missingCitation`, collapsed `citationCoverage`, and cost
 *     Document A roughly 39 points.
 *   • Evidence is retrieved per CITATION, not per claim sentence.
 *     `ScholarlyApiService` — whose claim-text Crossref search
 *     returned fuzzy, abstract-less matches scored SUPPORTING — is
 *     deleted, along with the audit-local `SupportVerifierService`
 *     it fed. Both are superseded by the vendored engine.
 *   • Reference resolution is a by-product of verification rather
 *     than a separate lookup pass, halving provider traffic.
 * ============================================================
 */

import {
    ToolDecorator as Tool,
    Widget,
    Injectable,
    ExecutionContext,
    z,
} from '@nitrostack/core';
import type { JsonObject } from '@nitrostack/core';

import type {
    AuditReport,
    Citation,
    Claim,
    EvidenceRecord,
    VerificationResult,
} from '../../shared/contracts.js';
import { API_TIMEOUT, APP, DOCUMENT_LIMITS } from '../../shared/constants.js';
import { getConfig } from '../../shared/config.js';
import { InvalidInputError, describeError } from '../../shared/error.js';
import { AuditMapper } from './audit.mapper.js';
import { ClaimExtractorService } from './claim-extractor.service.js';
import { CitationExtractorService } from './citation-extractor.service.js';
import { CitationVerificationService } from '../verification/citation-verification.service.js';

/* ============================================================
 * Typed tool inputs
 * ============================================================ */

interface RunFullAuditInput {
    document: string;
    documentName?: string;
    correlationId?: string;
}

interface ExtractClaimsInput {
    text: string;
    includeContext?: boolean;
}

interface VerifyCitationInput {
    claim: string;
    source?: string;
    includeEvidence?: boolean;
}

/* ============================================================
 * Structured [N/5] progress logging
 * ============================================================ */

class AuditLogger {
    private static readonly TOTAL_STEPS = 5;

    static step(ctx: ExecutionContext, step: number, label: string, meta?: JsonObject): void {
        ctx.logger.info(`[${step}/${AuditLogger.TOTAL_STEPS}] ${label}`, meta);
    }

    static warn(ctx: ExecutionContext, label: string, meta?: JsonObject): void {
        ctx.logger.warn(label, meta);
    }

    static error(ctx: ExecutionContext, label: string, meta?: JsonObject): void {
        ctx.logger.error(label, meta);
    }
}

/* ============================================================
 * Resiliency helpers
 * ============================================================ */

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`Timed out after ${ms}ms: ${label}`)), ms);
    });

    // Clearing the timer prevents a settled race from holding the
    // event loop open for the full timeout window.
    return Promise.race([promise, timeout]).finally(() => {
        if (timer !== undefined) clearTimeout(timer);
    }) as Promise<T>;
}

interface KeyedTask<T> {
    key: string;
    run: () => Promise<T>;
}

/**
 * Run keyed tasks in batches capped at `concurrency`. Tasks are keyed
 * so a rejected settlement can still be attributed to its claim.
 */
async function runWithConcurrency<T>(
    tasks: Array<KeyedTask<T>>,
    concurrency: number,
    onFailure: (key: string, error: unknown) => T,
): Promise<T[]> {
    const output: T[] = [];

    for (let i = 0; i < tasks.length; i += concurrency) {
        const batch = tasks.slice(i, i + concurrency);
        const settled = await Promise.allSettled(batch.map((t) => t.run()));

        settled.forEach((result, index) => {
            output.push(
                result.status === 'fulfilled'
                    ? result.value
                    : onFailure(batch[index].key, result.reason),
            );
        });
    }

    return output;
}

/* ============================================================
 * Result builders
 * ============================================================ */

function buildErrorResult(claim: Claim, error: unknown): VerificationResult {
    const described = describeError(error);

    return {
        claimId: claim.id,
        citationIds: [...claim.citationIds],
        existence: 'AMBIGUOUS',
        status: 'ERROR',
        confidence: 0,
        reason: `Verification failed: ${described.message}`,
        supportingEvidence: [],
        contradictingEvidence: [],
        metadata: {},
        error: described,
    };
}

/**
 * Report returned when the audit could not start. The message is
 * surfaced through the verdict rather than as a synthetic ERROR
 * claim, so guard failures never pollute the scoring counts.
 */
function buildGuardReport(
    documentName: string,
    message: string,
    durationMs: number,
    auditId: string,
    correlationId: string,
    offlineMode: boolean,
): AuditReport {
    const report = AuditMapper.buildReport({
        documentName,
        claims: [],
        citations: [],
        results: [],
        durationMs,
        offlineMode,
    });

    report.auditId = auditId;
    report.correlationId = correlationId;
    report.verdict = {
        ...report.verdict,
        title: 'Audit Not Run',
        summary: message,
        reasoning: [message],
        weaknesses: ['Audit did not execute.'],
        recommendations: ['Resubmit with a document that satisfies the input requirements.'],
        inconclusive: true,
    };

    return report;
}

/* ============================================================
 * AuditTools
 * ============================================================ */

@Injectable({
    deps: [
        ClaimExtractorService,
        CitationExtractorService,
        CitationVerificationService,
    ],
})
export class AuditTools {

    constructor(
        private readonly claimExtractorService: ClaimExtractorService,
        private readonly citationExtractorService: CitationExtractorService,
        private readonly verificationService: CitationVerificationService,
    ) { }

    /* ----------------------------------------------------------
     * TOOL: extract_claims
     * -------------------------------------------------------- */
    @Tool({
        name: 'extract_claims',
        description:
            'Extract and categorize claims from text. Identifies factual statements, '
            + 'statistics, causal claims, and comparisons.',
        inputSchema: z.object({
            text: z.string().describe('The text to analyze for claims'),
            includeContext: z
                .boolean()
                .optional()
                .describe('Include surrounding context for each claim (default: true)'),
        }),
    })
    async extractClaims(input: ExtractClaimsInput, ctx: ExecutionContext) {
        ctx.logger.info('Extracting claims from text', {
            textLength: input.text?.length ?? 0,
            includeContext: input.includeContext ?? true,
        });

        try {
            if (!input.text || typeof input.text !== 'string') {
                throw new InvalidInputError('Input text must be a non-empty string');
            }

            const claims = await this.claimExtractorService.extractClaims(input.text);

            const processedClaims =
                input.includeContext === false
                    ? claims.map((c) => ({ ...c, context: '' }))
                    : claims;

            return {
                status: 'success',
                claimsFound: claims.length,
                claims: processedClaims,
                summary: {
                    factual: claims.filter((c) => c.category === 'factual').length,
                    statistical: claims.filter((c) => c.category === 'statistical').length,
                    causal: claims.filter((c) => c.category === 'causal').length,
                    comparative: claims.filter((c) => c.category === 'comparative').length,
                },
            };
        } catch (error) {
            ctx.logger.error('Failed to extract claims', { error: describeError(error).message });
            return {
                status: 'error',
                message: describeError(error).message,
                claimsFound: 0,
                claims: [],
            };
        }
    }

    /* ----------------------------------------------------------
     * TOOL: verify_citation
     * -------------------------------------------------------- */
    @Tool({
        name: 'verify_citation',
        description:
            'Verify a claim against scholarly sources. Returns supporting evidence, '
            + 'contradicting evidence, and confidence score.',
        inputSchema: z.object({
            claim: z.string().describe('The claim to verify'),
            source: z
                .string()
                .optional()
                .describe('The cited source to verify against (DOI, title, or full reference)'),
            includeEvidence: z
                .boolean()
                .optional()
                .describe('Include full evidence details (default: true)'),
        }),
    })
    async verifyCitation(input: VerifyCitationInput, ctx: ExecutionContext) {
        ctx.logger.info('Verifying citation', {
            claim: input.claim?.substring(0, 50),
            source: input.source,
        });

        try {
            if (!input.claim || typeof input.claim !== 'string') {
                throw new InvalidInputError('Claim must be a non-empty string');
            }

            // Single-claim pipeline input. When no source is supplied the
            // claim text itself becomes the search string, which is the
            // only case where claim-text lookup remains appropriate:
            // the caller has explicitly asked without naming a citation.
            const citation: Citation = {
                id: 'cit_adhoc',
                raw: input.source?.trim() || input.claim,
                marker: '',
                doi: extractDoi(input.source),
                title: input.source?.trim(),
                resolved: false,
            };

            const claim: Claim = {
                id: 'citation_verify',
                text: input.claim,
                category: 'factual',
                extractionConfidence: 1,
                context: input.claim,
                paragraphIndex: 0,
                citationMarkers: [],
                citationIds: [citation.id],
            };

            const result = await this.verificationService.verifyClaim(claim, [citation]);

            const response: Record<string, unknown> = {
                status: 'success',
                claim: input.claim,
                verified: result.status === 'SUPPORTED',
                confidenceScore: result.confidence,
                verificationStatus: result.status,
                citationExistence: result.existence,
                supportingEvidenceCount: result.supportingEvidence.length,
                contradictingEvidenceCount: result.contradictingEvidence.length,
                notes: result.reason,
            };

            if (input.includeEvidence !== false) {
                response['supportingEvidence'] = result.supportingEvidence.map(summariseEvidence);
                response['contradictingEvidence'] = result.contradictingEvidence.map(summariseEvidence);
            }

            return response;
        } catch (error) {
            ctx.logger.error('Failed to verify citation', { error: describeError(error).message });
            return {
                status: 'error',
                message: describeError(error).message,
                verified: false,
                confidenceScore: 0,
            };
        }
    }

    /* ----------------------------------------------------------
     * TOOL: run_full_audit
     * -------------------------------------------------------- */
    @Tool({
        name: 'run_full_audit',
        description:
            'Run a complete citation-integrity audit on a document. '
            + 'Returns a structured AuditReport with an Integrity Score (0-100), '
            + 'an explainable Trust Verdict, per-claim status, and a severity rating.',
        inputSchema: z.object({
            document: z.string().describe('The full document text to audit'),
            documentName: z.string().optional().describe('Source document name (e.g. "thesis.pdf")'),
            correlationId: z.string().optional().describe('Optional tracing correlation ID'),
        }),
    })
    @Widget('integrity-report')
    async runFullAudit(input: RunFullAuditInput, ctx: ExecutionContext): Promise<AuditReport> {
        const startTime = Date.now();
        const auditId = `audit_${startTime}_${Math.random().toString(36).substring(2, 8)}`;
        const correlationId = input.correlationId ?? auditId;
        const documentName = (input.documentName ?? 'uploaded-document').substring(0, 100);
        const offlineMode = this.verificationService.isOffline();

        const guard = this.validateDocument(input.document);
        if (guard) {
            AuditLogger.warn(ctx, 'Input guard rejected document', { auditId, correlationId, guard });
            return buildGuardReport(
                documentName, guard, Date.now() - startTime, auditId, correlationId, offlineMode,
            );
        }

        /* ---------------------------------------------------
         * [1/5] Extract claims (body only)
         * ------------------------------------------------- */
        AuditLogger.step(ctx, 1, 'Extracting claims…', {
            auditId,
            correlationId,
            documentLength: input.document.trim().length,
            appName: APP.NAME,
            offlineMode,
        });

        let rawClaims: Claim[];

        try {
            rawClaims = await withTimeout(
                this.claimExtractorService.extractClaims(input.document),
                API_TIMEOUT,
                'claim extraction',
            );
        } catch (error) {
            AuditLogger.error(ctx, 'Claim extraction failed', {
                auditId, error: describeError(error).message,
            });
            return buildGuardReport(
                documentName,
                `Claim extraction failed: ${describeError(error).message}`,
                Date.now() - startTime, auditId, correlationId, offlineMode,
            );
        }

        if (rawClaims.length > DOCUMENT_LIMITS.MAX_CLAIMS_PER_AUDIT) {
            AuditLogger.warn(
                ctx,
                `Claim count ${rawClaims.length} exceeds cap ${DOCUMENT_LIMITS.MAX_CLAIMS_PER_AUDIT}; truncating.`,
                { auditId },
            );
            rawClaims = rawClaims.slice(0, DOCUMENT_LIMITS.MAX_CLAIMS_PER_AUDIT);
        }

        AuditLogger.step(ctx, 1, 'Claim extraction complete', {
            auditId, claimsFound: rawClaims.length,
        });

        /* ---------------------------------------------------
         * [2/5] Extract citation markers and link them
         * ------------------------------------------------- */
        AuditLogger.step(ctx, 2, 'Extracting citations and linking markers…', { auditId });

        const parsedCitations = await this.safeExtractCitations(input.document, ctx, auditId);
        const { claims, citations: linkedCitations } =
            this.citationExtractorService.linkClaimsToCitations(rawClaims, parsedCitations);

        AuditLogger.step(ctx, 2, 'Citation stage complete', {
            auditId,
            citationsParsed: parsedCitations.length,
            citationsInferredFromMarkers: linkedCitations.length - parsedCitations.length,
            claimsWithCitations: claims.filter((c) => c.citationIds.length > 0).length,
        });

        if (claims.length === 0) {
            AuditLogger.warn(ctx, 'No claims extracted — returning empty report', { auditId });
            const report = AuditMapper.buildReport({
                documentName,
                claims: [],
                citations: linkedCitations,
                results: [],
                durationMs: Date.now() - startTime,
                offlineMode,
            });
            report.auditId = auditId;
            report.correlationId = correlationId;
            return report;
        }

        /* ---------------------------------------------------
         * [3/5] Citation-first verification
         * ------------------------------------------------- */
        AuditLogger.step(ctx, 3, 'Resolving DOIs and verifying against cited sources…', {
            auditId,
            claimCount: claims.length,
            concurrencyCap: getConfig().concurrency,
        });

        interface ClaimOutcome {
            result: VerificationResult;
            resolutions: Citation[];
        }

        const tasks: Array<KeyedTask<ClaimOutcome>> = claims.map((claim) => ({
            key: claim.id,
            run: async (): Promise<ClaimOutcome> => {
                try {
                    // Bounded even though every provider has its own timeout:
                    // a provider that accepts a connection and then never
                    // responds would otherwise hang the whole audit. Budget
                    // covers up to MAX_CITATIONS_PER_CLAIM sequential lookups.
                    return await withTimeout(
                        this.verificationService.verifyClaimWithResolutions(
                            claim, linkedCitations,
                        ),
                        getConfig().claimBudgetMs,
                        `verifyClaim(${claim.id})`,
                    );
                } catch (error) {
                    AuditLogger.warn(ctx, `Claim ${claim.id} failed — marking ERROR`, {
                        auditId, error: describeError(error).message,
                    });
                    return { result: buildErrorResult(claim, error), resolutions: [] };
                }
            },
        }));

        const claimsById = new Map(claims.map((c) => [c.id, c]));

        const outcomes = await runWithConcurrency(
            tasks,
            getConfig().concurrency,
            (key, error) => {
                const claim = claimsById.get(key);
                return {
                    result: buildErrorResult(claim ?? emptyClaim(key), error),
                    resolutions: [],
                };
            },
        );

        /* ---------------------------------------------------
         * [4/5] Fold reference resolutions back into citations
         * ------------------------------------------------- */
        AuditLogger.step(ctx, 4, 'Consolidating reference resolutions…', { auditId });

        const results = outcomes.map((o) => o.result);
        const citations = this.mergeResolutions(
            linkedCitations,
            outcomes.flatMap((o) => o.resolutions),
        );

        /* ---------------------------------------------------
         * [5/5] Assemble report
         * ------------------------------------------------- */
        AuditLogger.step(ctx, 5, 'Building report and Trust Verdict…', { auditId });

        const report = AuditMapper.buildReport({
            documentName,
            claims,
            citations,
            results,
            durationMs: Date.now() - startTime,
            offlineMode,
        });

        report.auditId = auditId;
        report.correlationId = correlationId;

        ctx.logger.info('Audit complete', {
            auditId,
            correlationId,
            documentName,
            offlineMode,
            integrityScore: report.integrityScore,
            verdictLevel: report.verdict.level,
            inconclusive: report.verdict.inconclusive,
            severity: report.severity,
            totalClaims: report.summary.totalClaims,
            supported: report.summary.supported,
            contradicted: report.summary.contradicted,
            missingCitation: report.summary.missingCitation,
            citationCoverage: report.summary.citationCoverage,
            retractedCitations: report.summary.retractedCitations,
            errors: report.summary.errors,
            durationMs: report.durationMs,
        });

        return report;
    }

    /* ==========================================================
     * Private helpers
     * ========================================================== */

    /** Returns a rejection message, or null when the document is acceptable. */
    private validateDocument(document: unknown): string | null {
        if (typeof document !== 'string' || document.length === 0) {
            return 'Document must be a non-empty string.';
        }

        const length = document.trim().length;

        if (length < DOCUMENT_LIMITS.MIN_DOCUMENT_LENGTH_CHARACTERS) {
            return `Document length (${length}) is below the minimum of `
                + `${DOCUMENT_LIMITS.MIN_DOCUMENT_LENGTH_CHARACTERS} characters.`;
        }

        if (length > DOCUMENT_LIMITS.MAX_DOCUMENT_LENGTH_CHARACTERS) {
            return `Document payload (${length} characters) exceeds the maximum of `
                + `${DOCUMENT_LIMITS.MAX_DOCUMENT_LENGTH_CHARACTERS}.`;
        }

        return null;
    }

    /**
     * Citation parsing must never abort an audit. A document with an
     * unparseable reference list is still worth auditing — it simply
     * scores as having no citation coverage.
     */
    private async safeExtractCitations(
        document: string,
        ctx: ExecutionContext,
        auditId: string,
    ): Promise<Citation[]> {
        try {
            return await withTimeout(
                this.citationExtractorService.extractCitations(document),
                API_TIMEOUT,
                'citation extraction',
            );
        } catch (error) {
            AuditLogger.warn(ctx, 'Citation extraction failed — continuing without references', {
                auditId, error: describeError(error).message,
            });
            return [];
        }
    }

    /**
     * Several claims may cite the same reference, so the same citation
     * can be resolved more than once. A successful resolution always
     * wins over an unsuccessful one.
     */
    private mergeResolutions(parsed: Citation[], resolutions: Citation[]): Citation[] {
        if (resolutions.length === 0) return parsed;

        const best = new Map<string, Citation>();

        for (const citation of resolutions) {
            const existing = best.get(citation.id);
            if (!existing || (!existing.resolved && citation.resolved)) {
                best.set(citation.id, citation);
            }
        }

        return parsed.map((citation) => best.get(citation.id) ?? citation);
    }
}

/* ============================================================
 * Module-local helpers
 * ============================================================ */

function emptyClaim(id: string): Claim {
    return {
        id,
        text: '',
        category: 'other',
        extractionConfidence: 0,
        context: '',
        paragraphIndex: 0,
        citationMarkers: [],
        citationIds: [],
    };
}

const DOI_IN_TEXT = /\b(10\.\d{4,9}\/[-._;()/:A-Z0-9]+)\b/i;

function extractDoi(source?: string): string | undefined {
    if (!source) return undefined;
    return DOI_IN_TEXT.exec(source)?.[1]?.replace(/[.,;]+$/, '');
}

/** Response shaping for verify_citation; field names preserved. */
function summariseEvidence(evidence: EvidenceRecord) {
    return {
        source: evidence.provider,
        title: evidence.title,
        authors: evidence.authors,
        year: evidence.year,
        doi: evidence.doi,
        relevanceScore: evidence.relevance,
        stance: evidence.stance,
        stanceReason: evidence.stanceReason,
        retracted: evidence.retracted,
    };
}
