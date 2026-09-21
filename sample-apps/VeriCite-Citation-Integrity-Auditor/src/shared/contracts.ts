// src/shared/contracts.ts

/**
 * ============================================================
 * VeriCite — Shared Data Contracts (CANONICAL)
 * ------------------------------------------------------------
 * Single source of truth for every data shape that crosses a
 * module boundary — including the widget.
 *
 * RULES
 *   1. Every type below is defined EXACTLY ONCE, here.
 *   2. No module may redeclare, mirror, or locally re-type any
 *      of these shapes. Import them.
 *   3. Producers emit canonical objects directly. The mapper
 *      normalises and validates; it never renames or invents.
 *   4. The widget imports these types (type-only) so a contract
 *      change is a compile error, not a silent render bug.
 *
 * OWNERSHIP
 *   Claim, Citation              — Extraction stage
 *   EvidenceRecord               — Scholarly provider stage
 *   VerificationResult           — Verification stage
 *   AuditSummary, AuditReport    — Orchestration / mapper
 *   TrustVerdict                 — Trust Verdict Engine
 * ============================================================
 */

/* ============================================================
 * Primitive union types
 * ============================================================ */

/** Semantic class of an extracted claim. */
export type ClaimCategory =
    | 'factual'
    | 'statistical'
    | 'causal'
    | 'comparative'
    | 'other';

/** Outcome of verifying a single claim against retrieved literature. */
export type VerificationStatus =
    | 'SUPPORTED'
    | 'CONTRADICTED'
    | 'NOT_ENOUGH_EVIDENCE'
    | 'UNRELATED'
    | 'ERROR';

/** Whether the claim's cited source could be located in an index. */
export type CitationExistence =
    | 'FOUND'
    | 'NOT_FOUND'
    | 'AMBIGUOUS';

/**
 * Overall audit health derived from the Integrity Score.
 *   GREEN  → score >= 80  (high integrity)
 *   AMBER  → score 55-79  (review recommended)
 *   RED    → score < 55   (integrity risk)
 */
export type ReportSeverity = 'GREEN' | 'AMBER' | 'RED';

/** Explainable trust classification produced by the verdict engine. */
export type TrustVerdictLevel =
    | 'HIGH_TRUST'
    | 'MODERATE_TRUST'
    | 'LOW_TRUST'
    | 'CRITICAL';

/** Direction a single piece of evidence points, relative to a claim. */
export type EvidenceStance =
    | 'SUPPORTING'
    | 'CONTRADICTING'
    | 'NEUTRAL';

/* ============================================================
 * Citation — owner: extraction stage
 * ============================================================ */

export interface Citation {
    id: string;

    /** Original reference-list entry exactly as it appears in the document. */
    raw: string;

    /**
     * In-document marker this reference is addressed by.
     * Numeric style -> "[12]". Author-year style -> "(Smith, 2020)".
     * Empty string when the reference was never cited inline.
     */
    marker: string;

    title?: string;
    authors?: string[];
    journal?: string;
    year?: number;
    doi?: string;
    url?: string;

    /** True once a scholarly provider confirmed this reference exists. */
    resolved: boolean;

    /** True when a provider reports the work as retracted. */
    retracted?: boolean;

    /** Provider that resolved this citation ("Crossref", "OpenAlex", ...). */
    resolvedBy?: string;
}

/* ============================================================
 * Claim — owner: extraction stage
 *
 * Canonical replacement for the former `ExtractedClaim`. Every
 * field the extractor produces is represented here so nothing is
 * dropped in transit.
 * ============================================================ */

export interface Claim {
    id: string;

    /** Sentence containing the factual assertion. */
    text: string;

    category: ClaimCategory;

    /** Extractor's own confidence that this sentence is a claim, [0, 1]. */
    extractionConfidence: number;

    /** Surrounding sentences, for display and for relevance scoring. */
    context: string;

    /** Zero-based index of the sentence within the document. */
    paragraphIndex: number;

    page?: number;

    /**
     * Every citation marker found inline in this sentence.
     * Canonical form is PLURAL and an ARRAY — a sentence may cite
     * several sources, e.g. ["[3]", "[7,8]"].
     */
    citationMarkers: string[];

    /**
     * Ids of `Citation` objects this claim resolves to.
     * Empty array means the claim is uncited.
     */
    citationIds: string[];
}

/* ============================================================
 * EvidenceRecord — owner: scholarly provider stage
 *
 * One retrieved scholarly work, already scored for relevance and
 * stance against the claim it was retrieved for.
 * ============================================================ */

export interface EvidenceRecord {
    /** Index that returned this record ("Crossref", "OpenAlex", "Fixture"). */
    provider: string;

    title: string;
    authors: string[];
    year?: number;
    doi?: string;
    url?: string;
    journal?: string;

    /** Abstract text, reconstructed from the provider payload where available. */
    abstract?: string;

    citationCount?: number;

    retracted: boolean;

    /** Lexical/semantic relevance to the claim, [0, 1]. */
    relevance: number;

    /** Direction this evidence points, decided by the contradiction analyzer. */
    stance: EvidenceStance;

    /** Human-readable justification for the assigned stance. */
    stanceReason: string;
}

/* ============================================================
 * VerificationResult — owner: verification stage
 *
 * Canonical replacement for both the former
 * `support-verifier.service.ts#VerificationResult` and the
 * mapper's `LocalVerificationResult`. Evidence arrays are part of
 * the contract so they can no longer be discarded at the boundary.
 * ============================================================ */

export interface VerificationResult {
    claimId: string;

    /** Citations this verification was performed against. */
    citationIds: string[];

    existence: CitationExistence;

    status: VerificationStatus;

    /** Normalised verification confidence, [0, 1]. */
    confidence: number;

    /** Human-readable explanation of the status. */
    reason: string;

    supportingEvidence: EvidenceRecord[];

    contradictingEvidence: EvidenceRecord[];

    /** Representative abstract snippet from the strongest evidence. */
    evidence?: string;

    /** Flattened view of the strongest evidence, for compact display. */
    metadata: {
        doi?: string;
        paperTitle?: string;
        authors?: string[];
        journal?: string;
        year?: number;
        citationCount?: number;
        /** Provider that supplied the strongest evidence. */
        source?: string;
    };

    /** Populated only when status === 'ERROR'. */
    error?: {
        name: string;
        message: string;
    };
}

/* ============================================================
 * ExtractionResult — extraction stage output
 * ============================================================ */

export interface ExtractionResult {
    claims: Claim[];
    citations: Citation[];
}

/* ============================================================
 * AuditSummary — owner: mapper
 * ============================================================ */

export interface AuditSummary {
    /** Total claims processed. */
    totalClaims: number;

    /** Claims corroborated by retrieved literature. */
    supported: number;

    /** Claims contradicted by retrieved literature. */
    contradicted: number;

    /** Claims that matched no relevant scholarly topic. */
    unrelated: number;

    /** Claims where sources were found but evidence was too weak to confirm. */
    insufficientEvidence: number;

    /**
     * Claims with no linked citation at all.
     * Computed from real extracted citations — never a placeholder.
     */
    missingCitation: number;

    /** Claims that failed due to an unrecoverable provider error. */
    errors: number;

    /** References parsed out of the document. */
    totalCitations: number;

    /** References confirmed to exist by a provider. */
    resolvedCitations: number;

    /** References that could not be confirmed. */
    unresolvedCitations: number;

    /** References a provider flagged as retracted. */
    retractedCitations: number;

    /** Fraction of claims carrying at least one linked citation, [0, 1]. */
    citationCoverage: number;

    /** Mean verification confidence across non-error claims, [0, 1]. */
    averageConfidence: number;
}

/* ============================================================
 * TrustVerdict — owner: Trust Verdict Engine
 * ============================================================ */

export interface TrustVerdict {
    level: TrustVerdictLevel;

    /** Integrity Score carried through from the audit, [0, 100]. */
    score: number;

    /** Verdict headline. */
    title: string;

    /** Executive narrative summary. */
    summary: string;

    /** Multi-factor reasoning points behind the classification. */
    reasoning: string[];

    strengths: string[];

    weaknesses: string[];

    recommendations: string[];

    /** Engine's confidence in its own verdict, [0, 1]. */
    confidence: number;

    /**
     * True when the audit could not be completed well enough to judge
     * the document (for example every provider call failed). Callers
     * must present this as "audit incomplete", NOT as "document is
     * untrustworthy" — the distinction matters.
     */
    inconclusive: boolean;
}

/* ============================================================
 * AuditReport — owner: orchestration
 * ============================================================ */

export interface AuditReport {
    /** Unique audit execution id. */
    auditId?: string;

    /** Correlation id propagated across distributed logs. */
    correlationId?: string;

    documentName: string;

    /** ISO-8601 generation timestamp. */
    generatedAt: string;

    /** Wall-clock duration from audit start to report assembly. */
    durationMs: number;

    /** Integrity Score, [0, 100]. */
    integrityScore: number;

    severity: ReportSeverity;

    verdict: TrustVerdict;

    claims: Claim[];

    citations: Citation[];

    results: VerificationResult[];

    summary: AuditSummary;

    /** True when evidence came from recorded fixtures rather than live APIs. */
    offlineMode: boolean;
}

/* ============================================================
 * Stage contracts
 *
 * These are implemented by the concrete services. Unlike the four
 * unused interfaces they replace, each one below has a real
 * implementor — see PHASE2_REPORT.md.
 * ============================================================ */

export interface IClaimExtractionService {
    /** Extract candidate claims from raw document text. */
    extractClaims(documentText: string): Promise<Claim[]>;
}

export interface ICitationExtractionService {
    /** Parse the reference list into canonical Citation objects. */
    extractCitations(documentText: string): Promise<Citation[]>;

    /**
     * Resolve each claim's inline markers to citation ids.
     *
     * Returns the citation list too, because linking can DISCOVER
     * citations: an author-year marker with no reference-list entry
     * still names a real work and is inferred into a Citation.
     */
    linkClaimsToCitations(
        claims: Claim[],
        citations: Citation[],
    ): { claims: Claim[]; citations: Citation[] };
}

export interface IScholarlyEvidenceService {
    /** Retrieve and score candidate evidence for a claim. */
    findEvidence(claim: Claim, citations: Citation[]): Promise<EvidenceRecord[]>;

    /** Confirm a parsed reference against a scholarly index. */
    resolveCitation(citation: Citation): Promise<Citation>;

    /** True when the service is serving recorded fixtures. */
    isOffline(): boolean;
}

export interface IVerificationService {
    /** Decide a claim's verification status from its evidence. */
    verifyClaim(
        claim: Claim,
        citations: Citation[],
        evidence: EvidenceRecord[],
    ): Promise<VerificationResult>;
}
