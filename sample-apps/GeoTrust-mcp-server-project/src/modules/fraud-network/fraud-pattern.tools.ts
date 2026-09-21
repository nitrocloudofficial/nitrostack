// ═══════════════════════════════════════════════════════════════════════════════
// Fraud Pattern Sub-agent Tools
// Real grounding: Scans across real case history — no two-source comparison
// ═══════════════════════════════════════════════════════════════════════════════

import { ToolDecorator as Tool, Injectable, z } from '@nitrostack/core';
import { CaseStoreService } from '../case-store/case-store.service.js';
import { REGISTRY_DATASET } from '../registry/registry.data.js';
import type { ToolResult, Claim, Evidence } from '../../shared-types.js';
import stringSimilarity from 'string-similarity';

const CaseInputSchema = z.object({
    caseId: z.string().describe('Current case identifier'),
    businessName: z.string().describe('Business name to check'),
});

const SharedIdSchema = z.object({
    caseId: z.string().describe('Current case identifier'),
    businessName: z.string().describe('Business name'),
    pan: z.string().optional().describe('PAN to check for sharing across cases'),
    phone: z.string().optional().describe('Phone number to check'),
    address: z.string().optional().describe('Address to check'),
    directorName: z.string().optional().describe('Director name to check'),
});

@Injectable({ deps: [CaseStoreService] })
export class FraudPatternTools {
    constructor(private readonly caseStore: CaseStoreService) {}

    // ══════════════════════════════════════════════════════════════════════════
    // checkApplicationHistory — Scans real case history
    // Grounding: Pure logic — database query across all cases
    // ══════════════════════════════════════════════════════════════════════════
    @Tool({
        name: 'checkApplicationHistory',
        description: 'Scan all existing cases in the system to check if this business or its principals have applied before. Detects repeat applications, rejected-then-reapplied patterns, and rapid resubmissions.',
        inputSchema: CaseInputSchema,
    })
    async checkApplicationHistory(args: z.infer<typeof CaseInputSchema>): Promise<ToolResult> {
        try {
            const state = this.caseStore.getOrCreate(args.caseId, args.businessName);
            const now = new Date().toISOString();

            // Scan ALL cases in the store
            const allCases = this.caseStore.list();
            const otherCases = allCases.filter(c => c.caseId !== args.caseId);

            const matches: Array<{
                caseId: string;
                businessName: string;
                similarity: number;
                createdAt: string;
            }> = [];

            for (const otherCase of otherCases) {
                const similarity = stringSimilarity.compareTwoStrings(
                    args.businessName.toLowerCase(),
                    otherCase.businessName.toLowerCase()
                );
                if (similarity > 0.6) {
                    matches.push({
                        caseId: otherCase.caseId,
                        businessName: otherCase.businessName,
                        similarity,
                        createdAt: otherCase.createdAt,
                    });
                }
            }

            const flags: string[] = [];
            if (matches.length > 0) {
                flags.push(`Found ${matches.length} prior application(s) with similar business name: ${matches.map(m => `${m.caseId} ("${m.businessName}", ${(m.similarity * 100).toFixed(0)}% match)`).join('; ')}`);
            }

            // Check for rapid resubmission (same business applied within 30 days)
            const recentMatches = matches.filter(m => {
                const daysSince = (Date.now() - new Date(m.createdAt).getTime()) / (1000 * 60 * 60 * 24);
                return daysSince < 30;
            });
            if (recentMatches.length > 0) {
                flags.push(`RAPID RESUBMISSION: ${recentMatches.length} application(s) submitted within the last 30 days`);
            }

            const evidence: Evidence = {
                id: `ev-history-${Date.now()}`,
                source: 'Application History Scanner',
                snippet: matches.length > 0
                    ? `Found ${matches.length} prior application(s) with similar names. Rapid resubmissions: ${recentMatches.length}.`
                    : 'No prior applications found with similar business name.',
                retrievedAt: now,
                reliability: 0.9,
                relation: matches.length === 0 ? 'supports' : 'contradicts',
            };

            const claim: Claim = {
                id: `${args.caseId}-history`,
                dimension: 'identity',
                label: 'Application History',
                value: matches.length === 0 ? 'First application' : `${matches.length} prior application(s)`,
                status: matches.length === 0 ? 'verified' : (recentMatches.length > 0 ? 'contradicted' : 'pending'),
                evidence: [evidence],
            };

            const existing = state.claims;
            const idx = existing.findIndex(c => c.id === claim.id);
            if (idx === -1) existing.push(claim);
            else existing[idx] = claim;
            this.caseStore.updateClaims(args.caseId, existing);

            const result: ToolResult = {
                status: 'success',
                data: { totalCasesScanned: otherCases.length, matches, recentMatches: recentMatches.length, flags },
                source: 'Application History Scanner',
                confidence: matches.length === 0 ? 0.9 : 0.4,
                retrievedAt: now,
            };
            this.caseStore.addToolResult(args.caseId, result);
            return result;
        } catch (err: any) {
            return { status: 'failed', error: err.message };
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // detectSharedIdentifiers — Scans across many cases for repetition
    // Grounding: Pure logic — cross-case identifier matching
    // ══════════════════════════════════════════════════════════════════════════
    @Tool({
        name: 'detectSharedIdentifiers',
        description: 'Scan all cases for shared identifiers (PAN, phone, address, director) across different business names. Shared identifiers across unrelated businesses are a strong shell-company indicator.',
        inputSchema: SharedIdSchema,
    })
    async detectSharedIdentifiers(args: z.infer<typeof SharedIdSchema>): Promise<ToolResult> {
        try {
            const state = this.caseStore.getOrCreate(args.caseId, args.businessName);
            const now = new Date().toISOString();

            const allCases = this.caseStore.list();
            const otherCases = allCases.filter(c => c.caseId !== args.caseId);

            const sharedFindings: Array<{
                identifier: string;
                value: string;
                sharedWith: string;
                caseId: string;
            }> = [];

            for (const otherCase of otherCases) {
                for (const claim of otherCase.claims) {
                    // Check PAN sharing
                    if (args.pan && claim.label === 'PAN' && claim.value === args.pan) {
                        sharedFindings.push({
                            identifier: 'PAN',
                            value: args.pan,
                            sharedWith: otherCase.businessName,
                            caseId: otherCase.caseId,
                        });
                    }
                    // Check address sharing (fuzzy)
                    if (args.address && claim.label === 'Registered Address' && claim.value) {
                        const addrSim = stringSimilarity.compareTwoStrings(args.address.toLowerCase(), claim.value.toLowerCase());
                        if (addrSim > 0.8) {
                            sharedFindings.push({
                                identifier: 'Address',
                                value: args.address,
                                sharedWith: otherCase.businessName,
                                caseId: otherCase.caseId,
                            });
                        }
                    }
                    // Check director name sharing (fuzzy)
                    if (args.directorName && claim.label === 'Director Name' && claim.value) {
                        const nameSim = stringSimilarity.compareTwoStrings(args.directorName.toLowerCase(), claim.value.toLowerCase());
                        if (nameSim > 0.85) {
                            sharedFindings.push({
                                identifier: 'Director Name',
                                value: args.directorName,
                                sharedWith: otherCase.businessName,
                                caseId: otherCase.caseId,
                            });
                        }
                    }
                }
            }

            const flags: string[] = [];
            if (sharedFindings.length > 0) {
                const grouped = new Map<string, typeof sharedFindings>();
                for (const f of sharedFindings) {
                    const arr = grouped.get(f.identifier) ?? [];
                    arr.push(f);
                    grouped.set(f.identifier, arr);
                }
                for (const [id, findings] of grouped) {
                    flags.push(`SHARED ${id}: "${findings[0].value}" also used by ${findings.map(f => `"${f.sharedWith}" (${f.caseId})`).join(', ')}`);
                }
            }

            const evidence: Evidence = {
                id: `ev-shared-${Date.now()}`,
                source: 'Shared Identifier Detector',
                snippet: sharedFindings.length > 0
                    ? `Found ${sharedFindings.length} shared identifier(s) across cases: ${flags.join('; ')}`
                    : 'No shared identifiers found across cases.',
                retrievedAt: now,
                reliability: 0.95,
                relation: sharedFindings.length === 0 ? 'supports' : 'contradicts',
            };

            const claim: Claim = {
                id: `${args.caseId}-shared-ids`,
                dimension: 'identity',
                label: 'Shared Identifiers',
                value: sharedFindings.length === 0 ? 'None found' : `${sharedFindings.length} shared identifier(s)`,
                status: sharedFindings.length === 0 ? 'verified' : 'contradicted',
                evidence: [evidence],
            };

            const existing = state.claims;
            const idx = existing.findIndex(c => c.id === claim.id);
            if (idx === -1) existing.push(claim);
            else existing[idx] = claim;
            this.caseStore.updateClaims(args.caseId, existing);

            const result: ToolResult = {
                status: 'success',
                data: { casesScanned: otherCases.length, sharedFindings, flags },
                source: 'Shared Identifier Detector',
                confidence: sharedFindings.length === 0 ? 0.9 : 0.2,
                retrievedAt: now,
            };
            this.caseStore.addToolResult(args.caseId, result);
            return result;
        } catch (err: any) {
            return { status: 'failed', error: err.message };
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // searchDuplicateEntities — Cross-references registry against itself
    // Grounding: Pure logic — fuzzy search in registry data
    // ══════════════════════════════════════════════════════════════════════════
    @Tool({
        name: 'searchDuplicateEntities',
        description: 'Search the business registry for duplicate or near-duplicate entities by fuzzy-matching business names and addresses. Detects shell company clusters.',
        inputSchema: CaseInputSchema,
    })
    async searchDuplicateEntities(args: z.infer<typeof CaseInputSchema>): Promise<ToolResult> {
        try {
            const state = this.caseStore.getOrCreate(args.caseId, args.businessName);
            const now = new Date().toISOString();

            const duplicates: Array<{
                registrationNumber: string;
                businessName: string;
                nameSimilarity: number;
                sameDirector: boolean;
                sameAddress: boolean;
            }> = [];

            // Find the current business's registry record
            const currentRecord = REGISTRY_DATASET.find(r =>
                stringSimilarity.compareTwoStrings(r.businessName.toLowerCase(), args.businessName.toLowerCase()) > 0.7
            );

            // Cross-reference ALL registry records against each other
            for (const record of REGISTRY_DATASET) {
                if (currentRecord && record.registrationNumber === currentRecord.registrationNumber) continue;

                const nameSim = stringSimilarity.compareTwoStrings(
                    args.businessName.toLowerCase(),
                    record.businessName.toLowerCase()
                );

                const sameDirector = currentRecord
                    ? stringSimilarity.compareTwoStrings(currentRecord.directorName.toLowerCase(), record.directorName.toLowerCase()) > 0.85
                    : false;

                const sameAddress = currentRecord
                    ? stringSimilarity.compareTwoStrings(currentRecord.registeredAddress.toLowerCase(), record.registeredAddress.toLowerCase()) > 0.8
                    : false;

                if (nameSim > 0.5 || sameDirector || sameAddress) {
                    duplicates.push({
                        registrationNumber: record.registrationNumber,
                        businessName: record.businessName,
                        nameSimilarity: nameSim,
                        sameDirector,
                        sameAddress,
                    });
                }
            }

            const flags: string[] = [];
            if (duplicates.length > 0) {
                for (const dup of duplicates) {
                    const reasons: string[] = [];
                    if (dup.nameSimilarity > 0.7) reasons.push(`name ${(dup.nameSimilarity * 100).toFixed(0)}% similar`);
                    if (dup.sameDirector) reasons.push('same director');
                    if (dup.sameAddress) reasons.push('same address');
                    flags.push(`Potential duplicate: "${dup.businessName}" (${dup.registrationNumber}) — ${reasons.join(', ')}`);
                }
            }

            const evidence: Evidence = {
                id: `ev-dupent-${Date.now()}`,
                source: 'Registry Duplicate Entity Scanner',
                snippet: duplicates.length > 0
                    ? `Found ${duplicates.length} potential duplicate(s) in registry: ${flags.join('; ')}`
                    : 'No duplicate entities found in registry.',
                retrievedAt: now,
                reliability: 0.85,
                relation: duplicates.length === 0 ? 'supports' : 'contradicts',
            };

            const claim: Claim = {
                id: `${args.caseId}-dup-entities`,
                dimension: 'identity',
                label: 'Duplicate Entity Check',
                value: duplicates.length === 0 ? 'No duplicates' : `${duplicates.length} potential duplicate(s)`,
                status: duplicates.length === 0 ? 'verified' : 'pending',
                evidence: [evidence],
            };

            const existing = state.claims;
            const idx = existing.findIndex(c => c.id === claim.id);
            if (idx === -1) existing.push(claim);
            else existing[idx] = claim;
            this.caseStore.updateClaims(args.caseId, existing);

            const result: ToolResult = {
                status: 'success',
                data: { registryRecordsScanned: REGISTRY_DATASET.length, duplicates, flags },
                source: 'Registry Duplicate Entity Scanner',
                confidence: duplicates.length === 0 ? 0.85 : 0.5,
                retrievedAt: now,
            };
            this.caseStore.addToolResult(args.caseId, result);
            return result;
        } catch (err: any) {
            return { status: 'failed', error: err.message };
        }
    }
}
