// ═══════════════════════════════════════════════════════════════════════════════
// Top Layer Tools
// initializeCase, buildClaimEvidenceGraph, generateVerificationReport
// These orchestrate the entire investigation pipeline
// ═══════════════════════════════════════════════════════════════════════════════

import { ToolDecorator as Tool, Injectable, z } from '@nitrostack/core';
import { CaseStoreService } from '../case-store/case-store.service.js';
import type { ToolResult, Case, Claim, Evidence, TraceEvent } from '../../shared-types.js';

// ── Schemas ──────────────────────────────────────────────────────────────────

const InitCaseSchema = z.object({
    caseId: z.string().describe('Unique case identifier'),
    businessName: z.string().describe('Business name'),
    applicantData: z.object({
        registrationNumber: z.string().optional(),
        address: z.string().optional(),
        directorName: z.string().optional(),
        incorporationDate: z.string().optional(),
        websiteUrl: z.string().optional(),
        loanAmount: z.number().optional(),
    }).optional().describe('Initial applicant data from the loan application'),
});

const GraphSchema = z.object({
    caseId: z.string().describe('Case ID to build graph for'),
    businessName: z.string().describe('Business name'),
});

const ReportSchema = z.object({
    caseId: z.string().describe('Case ID to generate report for'),
    businessName: z.string().describe('Business name'),
});

@Injectable({ deps: [CaseStoreService] })
export class TopLayerTools {
    constructor(private readonly caseStore: CaseStoreService) {}

    // ══════════════════════════════════════════════════════════════════════════
    // initializeCase — Creates a new case and seeds initial claims
    // ══════════════════════════════════════════════════════════════════════════
    @Tool({
        name: 'initializeCase',
        description: 'Initialize a new investigation case. Creates the case in the store and seeds initial "pending" claims from the applicant\'s loan application data. Call this FIRST before any other investigation tools.',
        inputSchema: InitCaseSchema,
    })
    async initializeCase(args: z.infer<typeof InitCaseSchema>): Promise<ToolResult> {
        try {
            const now = new Date().toISOString();
            const state = this.caseStore.getOrCreate(args.caseId, args.businessName);

            // Seed initial claims from application data
            const initialClaims: Claim[] = [];
            const appData = args.applicantData;

            if (appData?.registrationNumber) {
                initialClaims.push({
                    id: `${args.caseId}-app-regnum`,
                    dimension: 'identity',
                    label: 'Registration Number (Claimed)',
                    value: appData.registrationNumber,
                    status: 'pending',
                    evidence: [{
                        id: `ev-app-reg-${Date.now()}`,
                        source: 'Loan Application Form',
                        snippet: `Applicant claimed registration number: ${appData.registrationNumber}`,
                        retrievedAt: now,
                        reliability: 0.5,
                        relation: 'supports',
                    }],
                });
            }

            if (appData?.address) {
                initialClaims.push({
                    id: `${args.caseId}-app-addr`,
                    dimension: 'location',
                    label: 'Business Address (Claimed)',
                    value: appData.address,
                    status: 'pending',
                    evidence: [{
                        id: `ev-app-addr-${Date.now()}`,
                        source: 'Loan Application Form',
                        snippet: `Applicant claimed address: ${appData.address}`,
                        retrievedAt: now,
                        reliability: 0.5,
                        relation: 'supports',
                    }],
                });
            }

            if (appData?.directorName) {
                initialClaims.push({
                    id: `${args.caseId}-app-director`,
                    dimension: 'identity',
                    label: 'Director Name (Claimed)',
                    value: appData.directorName,
                    status: 'pending',
                    evidence: [{
                        id: `ev-app-dir-${Date.now()}`,
                        source: 'Loan Application Form',
                        snippet: `Applicant claimed director: ${appData.directorName}`,
                        retrievedAt: now,
                        reliability: 0.5,
                        relation: 'supports',
                    }],
                });
            }

            this.caseStore.updateClaims(args.caseId, [...state.claims, ...initialClaims]);

            return {
                status: 'success',
                data: {
                    caseId: args.caseId,
                    businessName: args.businessName,
                    initialClaimsSeeded: initialClaims.length,
                    caseStatus: 'investigating',
                },
                source: 'Case Initializer',
                confidence: 1.0,
                retrievedAt: now,
            };
        } catch (err: any) {
            return { status: 'failed', error: err.message };
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // buildClaimEvidenceGraph — Pure logic aggregation
    // ══════════════════════════════════════════════════════════════════════════
    @Tool({
        name: 'buildClaimEvidenceGraph',
        description: 'Build a claim-evidence graph from all investigation data. Returns nodes (claims, evidence sources) and edges (supports/contradicts) for visualization. Call this after all investigation tools have run.',
        inputSchema: GraphSchema,
    })
    async buildClaimEvidenceGraph(args: z.infer<typeof GraphSchema>): Promise<ToolResult> {
        try {
            const state = this.caseStore.get(args.caseId);
            if (!state) return { status: 'failed', error: `Case ${args.caseId} not found` };

            const now = new Date().toISOString();
            const nodes: Array<{
                id: string;
                type: 'claim' | 'evidence' | 'source';
                label: string;
                dimension?: string;
                status?: string;
                reliability?: number;
            }> = [];
            const edges: Array<{
                from: string;
                to: string;
                relation: 'supports' | 'contradicts' | 'missing';
                weight: number;
            }> = [];

            // Track unique sources
            const sources = new Set<string>();

            for (const claim of state.claims) {
                // Add claim node
                nodes.push({
                    id: claim.id,
                    type: 'claim',
                    label: `${claim.label}: ${claim.value}`,
                    dimension: claim.dimension,
                    status: claim.status,
                });

                for (const ev of claim.evidence) {
                    // Add evidence node
                    nodes.push({
                        id: ev.id,
                        type: 'evidence',
                        label: ev.snippet.substring(0, 100),
                        reliability: ev.reliability,
                    });

                    // Add edge: evidence → claim
                    edges.push({
                        from: ev.id,
                        to: claim.id,
                        relation: ev.relation,
                        weight: ev.reliability,
                    });

                    // Add source node (if new)
                    if (!sources.has(ev.source)) {
                        sources.add(ev.source);
                        nodes.push({
                            id: `src-${ev.source.replace(/\s/g, '-').toLowerCase()}`,
                            type: 'source',
                            label: ev.source,
                        });
                    }

                    // Edge: source → evidence
                    edges.push({
                        from: `src-${ev.source.replace(/\s/g, '-').toLowerCase()}`,
                        to: ev.id,
                        relation: 'supports',
                        weight: 1.0,
                    });
                }
            }

            // Calculate graph statistics
            const totalClaims = state.claims.length;
            const verifiedClaims = state.claims.filter(c => c.status === 'verified').length;
            const contradictedClaims = state.claims.filter(c => c.status === 'contradicted').length;
            const pendingClaims = state.claims.filter(c => c.status === 'pending').length;
            const totalEvidence = state.claims.reduce((sum, c) => sum + c.evidence.length, 0);

            return {
                status: 'success',
                data: {
                    nodes,
                    edges,
                    stats: {
                        totalNodes: nodes.length,
                        totalEdges: edges.length,
                        totalClaims,
                        verifiedClaims,
                        contradictedClaims,
                        pendingClaims,
                        totalEvidence,
                        uniqueSources: sources.size,
                    },
                },
                source: 'Claim-Evidence Graph Builder',
                confidence: 1.0,
                retrievedAt: now,
            };
        } catch (err: any) {
            return { status: 'failed', error: err.message };
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // generateVerificationReport — Template-based report generation
    // ══════════════════════════════════════════════════════════════════════════
    @Tool({
        name: 'generateVerificationReport',
        description: 'Generate a comprehensive verification report for a case. Summarizes all findings across all dimensions, lists contradictions, missing evidence, and provides a final recommendation. Call this LAST after scoring.',
        inputSchema: ReportSchema,
    })
    async generateVerificationReport(args: z.infer<typeof ReportSchema>): Promise<ToolResult> {
        try {
            const state = this.caseStore.get(args.caseId);
            if (!state) return { status: 'failed', error: `Case ${args.caseId} not found` };

            const now = new Date().toISOString();
            const { claims, rawToolResults } = state;

            // Group claims by dimension
            const dimensionGroups = new Map<string, Claim[]>();
            for (const claim of claims) {
                const arr = dimensionGroups.get(claim.dimension) ?? [];
                arr.push(claim);
                dimensionGroups.set(claim.dimension, arr);
            }

            // Build report sections
            const sections: Array<{
                dimension: string;
                totalClaims: number;
                verified: number;
                contradicted: number;
                pending: number;
                keyFindings: string[];
                redFlags: string[];
            }> = [];

            for (const [dimension, dimClaims] of dimensionGroups) {
                const verified = dimClaims.filter(c => c.status === 'verified').length;
                const contradicted = dimClaims.filter(c => c.status === 'contradicted').length;
                const pending = dimClaims.filter(c => c.status === 'pending').length;

                const keyFindings: string[] = [];
                const redFlags: string[] = [];

                for (const claim of dimClaims) {
                    if (claim.status === 'verified') {
                        keyFindings.push(`✅ ${claim.label}: ${claim.value}`);
                    } else if (claim.status === 'contradicted') {
                        redFlags.push(`❌ ${claim.label}: ${claim.value} — ${claim.evidence.filter(e => e.relation === 'contradicts').map(e => e.snippet.substring(0, 80)).join('; ')}`);
                    } else {
                        keyFindings.push(`⏳ ${claim.label}: ${claim.value} (pending verification)`);
                    }
                }

                sections.push({ dimension, totalClaims: dimClaims.length, verified, contradicted, pending, keyFindings, redFlags });
            }

            // Overall summary
            const totalClaims = claims.length;
            const totalVerified = claims.filter(c => c.status === 'verified').length;
            const totalContradicted = claims.filter(c => c.status === 'contradicted').length;
            const totalPending = claims.filter(c => c.status === 'pending').length;
            const allRedFlags = sections.flatMap(s => s.redFlags);

            // Generate narrative report
            const reportMarkdown = `# GeoTrust AI — Verification Report
## Case: ${args.caseId}
## Business: ${args.businessName}
## Generated: ${now}

---

### Executive Summary
- **Total Claims Investigated:** ${totalClaims}
- **Verified:** ${totalVerified} | **Contradicted:** ${totalContradicted} | **Pending:** ${totalPending}
- **Tool Results Collected:** ${rawToolResults.length}
- **Red Flags:** ${allRedFlags.length}

---

${sections.map(s => `### ${s.dimension.replace('_', ' ').toUpperCase()}
- Claims: ${s.totalClaims} (${s.verified} verified, ${s.contradicted} contradicted, ${s.pending} pending)

**Key Findings:**
${s.keyFindings.map(f => `- ${f}`).join('\n')}

${s.redFlags.length > 0 ? `**⚠️ Red Flags:**\n${s.redFlags.map(f => `- ${f}`).join('\n')}` : ''}
`).join('\n---\n\n')}

---

### Red Flag Summary
${allRedFlags.length > 0 ? allRedFlags.map((f, i) => `${i + 1}. ${f}`).join('\n') : 'No red flags detected.'}

---

*Report generated by GeoTrust AI v2.0 — Multi-Agent Business Authenticity Engine*
`;

            return {
                status: 'success',
                data: {
                    report: reportMarkdown,
                    sections,
                    summary: {
                        totalClaims,
                        totalVerified,
                        totalContradicted,
                        totalPending,
                        totalToolResults: rawToolResults.length,
                        totalRedFlags: allRedFlags.length,
                    },
                },
                source: 'Verification Report Generator',
                confidence: 1.0,
                retrievedAt: now,
            };
        } catch (err: any) {
            return { status: 'failed', error: err.message };
        }
    }
}
