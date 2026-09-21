import { ToolDecorator as Tool, Injectable, z } from '@nitrostack/core';
import { CaseStoreService } from '../case-store/case-store.service.js';
import type { Case, DimensionScore, Recommendation, Dimension } from '../../shared-types.js';

const ScoreCaseSchema = z.object({
    caseId: z.string().describe('Case ID to score — must have been investigated with other tools first'),
    businessName: z.string().describe('Business name'),
});

@Injectable({ deps: [CaseStoreService] })
export class ScoringTools {
    constructor(private readonly caseStore: CaseStoreService) { }

    @Tool({
        name: 'score_case',
        description: 'Read the full CaseState after all tools have run and compute: four DimensionScores (identity, location, digital_presence, document_integrity), an overallScore (0-100), a Recommendation, a one-sentence recommendationReason, and a missingEvidence checklist. Call this LAST after document_reader, registry_checker, address_checker, and web_presence_checker have all been run.',
        inputSchema: ScoreCaseSchema,
        examples: {
            request: { caseId: 'case-001', businessName: 'Priya Textiles Pvt Ltd' },
            response: {
                id: 'case-001',
                businessName: 'Priya Textiles Pvt Ltd',
                status: 'cleared',
                overallScore: 88,
                recommendation: 'proceed',
                recommendationReason: 'All four dimensions verified with strong evidence; no unresolved contradictions.',
                missingEvidence: [],
                dimensionScores: [
                    { dimension: 'identity', score: 92, driver: 'Registry record matches across name, director, and registration number' },
                    { dimension: 'location', score: 90, driver: 'Registered address verified in CBD Bengaluru, matches registry' },
                    { dimension: 'digital_presence', score: 85, driver: 'Active website, Google listing, 47 reviews in 5.8-year-old domain' },
                    { dimension: 'document_integrity', score: 97, driver: 'Registration certificate quality 97% — all fields legible and consistent' },
                ],
                claims: [],
                trace: [],
                submittedAt: '2024-01-15T10:00:00Z',
            }
        }
    })
    async scoreCase(args: z.infer<typeof ScoreCaseSchema>): Promise<Case> {
        const state = this.caseStore.get(args.caseId);
        if (!state) {
            throw new Error(`Case ${args.caseId} not found. Run investigation tools first.`);
        }

        const now = new Date().toISOString();
        const { claims, rawToolResults } = state;

        // ── Dimension scoring ───────────────────────────────────────────────

        // Helper: get tool results by source keyword
        const getResults = (keyword: string) =>
            rawToolResults.filter(r => r.source?.toLowerCase().includes(keyword));

        // IDENTITY — registry + document OCR name/reg number claims
        const identityClaims = claims.filter(c => c.dimension === 'identity');
        const registryResults = getResults('registry');
        const docResults = getResults('document ocr');

        let identityScore = 50;
        let identityDriver = 'Insufficient identity verification data';
        const identityContradicted = identityClaims.some(c => c.status === 'contradicted');
        const identityVerified = identityClaims.filter(c => c.status === 'verified').length;
        const identityConfidence = registryResults.length > 0
            ? registryResults.reduce((a, r) => a + (r.confidence ?? 0), 0) / registryResults.length
            : 0.4;

        if (identityContradicted) {
            identityScore = Math.round(30 + identityVerified * 5 + identityConfidence * 20);
            identityDriver = 'Identity contradiction found — name or registration number mismatch with registry';
        } else if (registryResults.length > 0 && registryResults[0].data && (registryResults[0].data as any).nameMatch && (registryResults[0].data as any).isActive) {
            identityScore = 95;
            identityDriver = 'Registry record matches across name, director, and registration number';
            // Force verify any pending identity claims
            claims.forEach(c => {
                if (c.dimension === 'identity' && c.status === 'pending') c.status = 'verified';
            });
        } else if (identityVerified >= 3) {
            identityScore = Math.round(70 + identityConfidence * 25);
            identityDriver = 'Registry record matches across name, director, and registration number';
        } else if (identityVerified >= 1) {
            identityScore = Math.round(55 + identityConfidence * 20);
            identityDriver = `${identityVerified} of ${identityClaims.length} identity claims verified`;
        } else if (registryResults.length === 0) {
            identityScore = 25;
            identityDriver = 'No registry lookup performed — identity unverified';
        }

        // LOCATION — address checker results
        const locationClaims = claims.filter(c => c.dimension === 'location');
        const addressResults = getResults('address verification');

        let locationScore = 40;
        let locationDriver = 'No address verification data';
        const locationContradicted = locationClaims.some(c => c.status === 'contradicted');
        const locationVerified = locationClaims.filter(c => c.status === 'verified').length;
        const addrConfidence = addressResults.length > 0
            ? addressResults.reduce((a, r) => a + (r.confidence ?? 0), 0) / addressResults.length
            : 0.3;

        if (locationContradicted) {
            locationScore = Math.round(25 + addrConfidence * 20);
            locationDriver = 'Address contradiction — claimed address conflicts with registry or utility bill';
        } else if (locationVerified >= 1) {
            locationScore = Math.round(65 + addrConfidence * 30);
            locationDriver = addressResults[0]?.data && typeof addressResults[0].data === 'object' && 'zone' in (addressResults[0].data as object)
                ? `Address verified in ${(addressResults[0].data as { zone: string }).zone}`
                : 'Address verified against GIS data';
        } else if (addressResults.length === 0) {
            locationScore = 30;
            locationDriver = 'Address not cross-checked — utility bill check missing';
        }

        // DIGITAL PRESENCE — web presence checker results
        const webClaims = claims.filter(c => c.dimension === 'digital_presence');
        const webResults = getResults('web presence');

        let digitalScore = 40;
        let digitalDriver = 'No digital presence data';
        const webConfidence = webResults.length > 0
            ? webResults.reduce((a, r) => a + (r.confidence ?? 0), 0) / webResults.length
            : 0.3;

        if (webResults.length > 0) {
            digitalScore = Math.round(webConfidence * 90);
            const data = webResults[0]?.data as Record<string, unknown> | undefined;
            if (data) {
                const reviewCount = typeof data.reviewCount === 'number' ? data.reviewCount : 0;
                const hasListing = !!data.hasGoogleListing;
                const domainAge = typeof data.domainAgeYears === 'number' ? data.domainAgeYears : 0;
                const consistent = data.domainAgeConsistentWithIncorporation !== false;
                digitalDriver = consistent && hasListing && reviewCount > 10
                    ? `Active website, Google listing, ${reviewCount} reviews in ${domainAge.toFixed(1)}-year-old domain`
                    : !consistent
                        ? `Domain only ${domainAge.toFixed(1)} years old — inconsistent with claimed years of operation`
                        : reviewCount === 0 && !hasListing
                            ? 'Zero verified digital footprint — no reviews, no Google listing'
                            : 'Limited digital presence — minimal online footprint';
            }
        }

        // DOCUMENT INTEGRITY — doc extraction quality scores
        let docIntegrityScore = 50;
        let docIntegrityDriver = 'No documents submitted';
        const docConfidence = docResults.length > 0
            ? docResults.reduce((a, r) => a + (r.confidence ?? 0), 0) / docResults.length
            : 0.5;

        if (docResults.length > 0) {
            docIntegrityScore = Math.round(docConfidence * 100);
            docIntegrityDriver = docConfidence >= 0.9
                ? `Registration certificate quality ${Math.round(docConfidence * 100)}% — all fields legible and consistent`
                : docConfidence >= 0.7
                    ? `Document quality ${Math.round(docConfidence * 100)}% — minor legibility issues`
                    : `Poor document quality (${Math.round(docConfidence * 100)}%) — fields partially illegible, manual review needed`;
        }

        // ── Overall score ───────────────────────────────────────────────────
        const dimensionScores: DimensionScore[] = [
            { dimension: 'identity', score: Math.min(100, Math.max(0, identityScore)), driver: identityDriver },
            { dimension: 'location', score: Math.min(100, Math.max(0, locationScore)), driver: locationDriver },
            { dimension: 'digital_presence', score: Math.min(100, Math.max(0, digitalScore)), driver: digitalDriver },
            { dimension: 'document_integrity', score: Math.min(100, Math.max(0, docIntegrityScore)), driver: docIntegrityDriver },
        ];

        const overallScore = Math.round(
            dimensionScores[0].score * 0.35 +
            dimensionScores[1].score * 0.30 +
            dimensionScores[2].score * 0.15 +
            dimensionScores[3].score * 0.20
        );

        // ── Recommendation ─────────────────────────────────────────────────
        const contradictions = claims.filter(c => c.status === 'contradicted');
        const missingDimensions: Dimension[] = (['identity', 'location', 'digital_presence', 'document_integrity'] as Dimension[])
            .filter(d => !claims.some(c => c.dimension === d));

        const missingEvidence: string[] = [];

        if (!registryResults.length) missingEvidence.push('Business registry lookup not completed');
        if (!addressResults.length) missingEvidence.push('Address verification against utility bill not performed');
        if (!webResults.length) missingEvidence.push('Digital footprint analysis not completed');
        if (!docResults.length) missingEvidence.push('No documents submitted or extracted');
        if (webResults.length > 0 && !(webResults[0].data as Record<string, unknown>)?.hasGoogleListing) {
            missingEvidence.push('Google Business listing not found — request official Google My Business verification');
        }
        if (contradictions.some(c => c.dimension === 'location')) {
            missingEvidence.push('Utility bill showing the current operating address');
            missingEvidence.push('Notarised letter explaining address discrepancy');
        }
        if (locationScore < 50) {
            missingEvidence.push('Latest electricity bill or municipal tax receipt for business premises');
        }
        if (identityScore < 60) {
            missingEvidence.push('Director Aadhaar + PAN card copies for KYC');
        }

        let recommendation: Recommendation;
        let recommendationReason: string;
        let caseStatus: Case['status'];

        const contradictionCount = contradictions.length;
        const hasMultipleUnexplainedRedFlags =
            contradictionCount >= 2 ||
            (contradictionCount >= 1 && dimensionScores.filter(d => d.score < 50).length >= 1);

        if (overallScore >= 75 && contradictionCount === 0 && missingEvidence.length <= 1) {
            recommendation = 'proceed';
            recommendationReason = 'All four dimensions verified with strong evidence; no unresolved contradictions.';
            caseStatus = 'cleared';
        } else if (hasMultipleUnexplainedRedFlags || overallScore < 60) {
            recommendation = 'escalate';
            recommendationReason = `Multiple independent red flags across ${contradictionCount} dimensions — manual review by senior credit officer required.`;
            caseStatus = 'escalated';
        } else if (missingEvidence.length >= 3 && overallScore < 65) {
            recommendation = 'flag_insufficient';
            recommendationReason = 'Insufficient evidence across critical dimensions — investigation cannot reach a reliable conclusion without additional documents.';
            caseStatus = 'needs_review';
        } else {
            recommendation = 'request_evidence';
            recommendationReason = `${contradictionCount > 0 ? contradictionCount + ' contradiction(s) require clarification; ' : ''}${missingEvidence.length} additional evidence item(s) needed to complete verification.`;
            caseStatus = 'needs_review';
        }

        const result: Case = {
            id: args.caseId,
            businessName: args.businessName,
            submittedAt: state.createdAt,
            status: caseStatus,
            overallScore,
            dimensionScores,
            claims,
            recommendation,
            recommendationReason,
            missingEvidence,
            trace: [], // Chef populates this
        };

        return result;
    }
}
