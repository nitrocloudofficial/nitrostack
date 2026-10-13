import { ToolDecorator as Tool, Injectable, z } from '@nitrostack/core';
import { CaseStoreService } from '../case-store/case-store.service.js';
import type { ToolResult, Evidence } from '../../shared-types.js';

// Mock web presence database
const WEB_PRESENCE_DB: Record<string, {
    domain: string;
    domainAgeYears: number;
    hasSocialMedia: boolean;
    hasGoogleBusinessListing: boolean;
    hasNewsOrPR: boolean;
    reviewCount: number;
    averageRating: number | null;
    websiteActive: boolean;
    sslValid: boolean;
    lastCrawled: string;
}> = {
    'priya textiles': {
        domain: 'priyatextiles.in',
        domainAgeYears: 5.8,
        hasSocialMedia: true,
        hasGoogleBusinessListing: true,
        hasNewsOrPR: false,
        reviewCount: 47,
        averageRating: 4.2,
        websiteActive: true,
        sslValid: true,
        lastCrawled: '2024-01-10T00:00:00Z',
    },
    'coimbatore steels': {
        domain: 'cbsteels.in',
        domainAgeYears: 0.3, // Very new domain — suspicious given 2015 incorporation
        hasSocialMedia: false,
        hasGoogleBusinessListing: false, // Not listed
        hasNewsOrPR: false,
        reviewCount: 0,
        averageRating: null,
        websiteActive: true,
        sslValid: false,
        lastCrawled: '2024-01-12T00:00:00Z',
    },
    'namma digital': {
        domain: 'nammadigital.io',
        domainAgeYears: 0.1, // Brand new domain
        hasSocialMedia: true, // Facebook only, no follower data
        hasGoogleBusinessListing: false,
        hasNewsOrPR: false,
        reviewCount: 0,
        averageRating: null,
        websiteActive: false, // Domain bought but no site
        sslValid: false,
        lastCrawled: '2024-01-13T00:00:00Z',
    },
    'apex micro': {
        domain: null as unknown as string,  // No website
        domainAgeYears: 0,
        hasSocialMedia: false,
        hasGoogleBusinessListing: true, // Listed on Google Maps with photos
        hasNewsOrPR: false,
        reviewCount: 12,
        averageRating: 3.8,
        websiteActive: false,
        sslValid: false,
        lastCrawled: '2024-01-14T00:00:00Z',
    },
    'sri venkateswara': {
        domain: 'srivenkatesh-exports.com',
        domainAgeYears: 6.2,
        hasSocialMedia: false,
        hasGoogleBusinessListing: true,
        hasNewsOrPR: true, // Trade publication mention
        reviewCount: 31,
        averageRating: 4.0,
        websiteActive: true,
        sslValid: true,
        lastCrawled: '2024-01-11T00:00:00Z',
    },
    'nilgiri coffee traders': {
        domain: 'nilgiricoffeetraders.com',
        domainAgeYears: 4.5,
        hasSocialMedia: true,
        hasGoogleBusinessListing: true,
        hasNewsOrPR: false,
        reviewCount: 42,
        averageRating: 4.5,
        websiteActive: true,
        sslValid: true,
        lastCrawled: '2024-01-16T00:00:00Z',
    },
    'vibrant logistics': {
        domain: 'vibrantlogistics.in',
        domainAgeYears: 4.2,
        hasSocialMedia: true,
        hasGoogleBusinessListing: true,
        hasNewsOrPR: false,
        reviewCount: 15,
        averageRating: 4.1,
        websiteActive: true,
        sslValid: true,
        lastCrawled: '2024-01-15T00:00:00Z',
    },
};

const WebPresenceCheckerSchema = z.object({
    caseId: z.string().describe('Unique case identifier'),
    businessName: z.string().describe('Business name'),
    websiteUrl: z.string().optional().describe('Business website URL if provided by applicant'),
    incorporationYear: z.number().optional().describe('Year of incorporation for domain age cross-check'),
});

@Injectable({ deps: [CaseStoreService] })
export class WebPresenceTools {
    constructor(private readonly caseStore: CaseStoreService) { }

    @Tool({
        name: 'web_presence_checker',
        description: 'Assess the digital footprint of a business — domain age, website activity, Google Business listing, social media, and online reviews. A very new domain for an old business is a red flag. No online presence at all is a yellow flag worth noting.',
        inputSchema: WebPresenceCheckerSchema,
        examples: {
            request: {
                caseId: 'case-001',
                businessName: 'Priya Textiles Pvt Ltd',
                incorporationYear: 2018,
            },
            response: {
                ok: true,
                source: 'Web Presence Analysis (Mock OSINT)',
                confidence: 0.85,
                matchesClaim: true,
                retrievedAt: '2024-01-15T10:33:00Z',
                data: {
                    domain: 'priyatextiles.in',
                    domainAgeYears: 5.8,
                    domainAgeConsistentWithIncorporation: true,
                    websiteActive: true,
                    hasGoogleListing: true,
                    reviewCount: 47,
                    flags: [],
                }
            }
        }
    })
    async webPresenceChecker(args: z.infer<typeof WebPresenceCheckerSchema>) {
        const state = this.caseStore.getOrCreate(args.caseId, args.businessName);
        const now = new Date().toISOString();

        // Find mock data — fuzzy match on business name
        const nameKey = Object.keys(WEB_PRESENCE_DB).find(k =>
            args.businessName.toLowerCase().includes(k)
        );
        const presenceData = nameKey ? WEB_PRESENCE_DB[nameKey] : null;

        const flags: string[] = [];
        let confidence = 0.5;

        let domainAgeConsistentWithIncorporation: boolean | null = null;

        if (presenceData) {
            // Domain age vs incorporation year
            if (args.incorporationYear && presenceData.domainAgeYears > 0) {
                const currentYear = new Date().getFullYear();
                const yearsInBusiness = currentYear - args.incorporationYear;
                domainAgeConsistentWithIncorporation = presenceData.domainAgeYears >= Math.min(yearsInBusiness * 0.3, 1);
                if (!domainAgeConsistentWithIncorporation) {
                    flags.push(`Domain registered only ${presenceData.domainAgeYears.toFixed(1)} years ago, but business claims ${yearsInBusiness} years of operation — significant gap suggests this website is new`);
                    confidence -= 0.25;
                }
            }

            if (!presenceData.websiteActive && !presenceData.hasGoogleBusinessListing) {
                flags.push('No active website and no Google Business listing — zero verified digital footprint');
                confidence -= 0.2;
            } else if (!presenceData.websiteActive) {
                flags.push('Registered domain but website is inactive/under construction');
                confidence -= 0.1;
            }

            if (!presenceData.sslValid && presenceData.websiteActive) {
                flags.push('Website lacks SSL certificate — unusual for a legitimate trading business');
                confidence -= 0.05;
            }

            if (presenceData.hasGoogleBusinessListing) confidence += 0.15;
            if (presenceData.hasSocialMedia) confidence += 0.05;
            if (presenceData.hasNewsOrPR) confidence += 0.1;
            if (presenceData.reviewCount > 20) confidence += 0.1;

        } else {
            flags.push(`No web presence data found for "${args.businessName}"`);
            confidence = 0.3;
        }

        confidence = Math.max(0, Math.min(1, confidence));

        const result: ToolResult<{
            domain: string | null;
            domainAgeYears: number;
            domainAgeConsistentWithIncorporation: boolean | null;
            websiteActive: boolean;
            hasGoogleListing: boolean;
            hasSocialMedia: boolean;
            hasNewsOrPR: boolean;
            reviewCount: number;
            averageRating: number | null;
            flags: string[];
        }> = {
            status: 'success',
            ok: !!presenceData,
            source: 'Web Presence Analysis (Mock OSINT)',
            data: {
                domain: presenceData?.domain ?? null,
                domainAgeYears: presenceData?.domainAgeYears ?? 0,
                domainAgeConsistentWithIncorporation,
                websiteActive: presenceData?.websiteActive ?? false,
                hasGoogleListing: presenceData?.hasGoogleBusinessListing ?? false,
                hasSocialMedia: presenceData?.hasSocialMedia ?? false,
                hasNewsOrPR: presenceData?.hasNewsOrPR ?? false,
                reviewCount: presenceData?.reviewCount ?? 0,
                averageRating: presenceData?.averageRating ?? null,
                flags,
            },
            matchesClaim: flags.length === 0,
            confidence,
            retrievedAt: now,
        };

        this.caseStore.addToolResult(args.caseId, result as ToolResult);

        // Update digital_presence claims
        const currentClaims = state.claims;
        const webEvidence: Evidence = {
            id: `ev-web-${Date.now()}`,
            source: 'Web Presence Analysis (Mock OSINT)',
            snippet: presenceData
                ? `Domain: ${presenceData.domain ?? 'none'} (${presenceData.domainAgeYears.toFixed(1)} yrs old). Google listing: ${presenceData.hasGoogleBusinessListing ? 'Yes' : 'No'}. Reviews: ${presenceData.reviewCount}. ${flags.length ? 'Flags: ' + flags.join('; ') : ''}`
                : `No verifiable digital footprint found for "${args.businessName}"`,
            retrievedAt: now,
            reliability: confidence,
            relation: flags.length === 0 ? 'supports' : flags.some(f => f.includes('zero')) ? 'missing' : 'contradicts',
        };

        const existingWebClaim = currentClaims.find(c => c.dimension === 'digital_presence');
        if (existingWebClaim) {
            const updated = currentClaims.map(c => c.dimension === 'digital_presence'
                ? { ...c, status: (flags.length === 0 ? 'verified' : 'contradicted') as typeof c.status, evidence: [...c.evidence, webEvidence] }
                : c
            );
            this.caseStore.updateClaims(args.caseId, updated);
        } else {
            const updated = [...currentClaims, {
                id: `${args.caseId}-web-presence`,
                dimension: 'digital_presence' as const,
                label: 'Digital Footprint',
                value: presenceData?.domain ?? 'None found',
                status: (flags.length === 0 ? 'verified' : 'contradicted') as 'verified' | 'contradicted' | 'pending',
                evidence: [webEvidence],
            }];
            this.caseStore.updateClaims(args.caseId, updated);
        }

        return result;
    }
}
