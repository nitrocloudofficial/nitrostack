import { ToolDecorator as Tool, Injectable, z } from '@nitrostack/core';
import { CaseStoreService } from '../case-store/case-store.service.js';
import { REGISTRY_DATASET } from './registry.data.js';
import type { ToolResult } from '../../shared-types.js';
import stringSimilarity from 'string-similarity';

const ValidateRegistrationSchema = z.object({
    caseId: z.string().describe('Unique case identifier'),
    businessName: z.string().describe('Business name to look up'),
    registrationNumber: z.string().describe('Registration/CIN/UDYAM number to verify'),
});

@Injectable({ deps: [CaseStoreService] })
export class RegistryTools {
    constructor(private readonly caseStore: CaseStoreService) { }

    @Tool({
        name: 'validateRegistration',
        description: 'Identity Sub-agent: Look up a business registration/tax ID against the mock registry. Validates using a fuzzy similarity score on name (not exact match) against the mock Registry.',
        inputSchema: ValidateRegistrationSchema,
    })
    async validateRegistration(args: z.infer<typeof ValidateRegistrationSchema>): Promise<ToolResult> {
        try {
            const state = this.caseStore.getOrCreate(args.caseId, args.businessName);

            // Exact match on the registration number itself as per PDF constraint
            const record = REGISTRY_DATASET.find(r =>
                r.registrationNumber.toLowerCase() === args.registrationNumber.toLowerCase()
            );

            if (!record) {
                return {
                    status: 'success',
                    data: { found: false, error: 'Registration number not found in registry' }
                };
            }

            // Real grounding: Fuzzy similarity score on name (not exact match)
            const similarity = stringSimilarity.compareTwoStrings(
                record.businessName.toLowerCase(),
                args.businessName.toLowerCase()
            );

            // Threshold for acceptable match (e.g. > 0.8)
            const nameMatch = similarity > 0.8;
            const flags: string[] = [];
            
            if (!nameMatch) {
                flags.push(`Name similarity is low (${Math.round(similarity * 100)}%). Registry shows "${record.businessName}", applicant claims "${args.businessName}"`);
            }

            if (record.status !== 'active') {
                flags.push(`Business status: "${record.status}" — not in good standing`);
            }

            const result: ToolResult = {
                status: 'success',
                ok: true,
                source: 'Business Registry',
                confidence: 0.9,
                data: {
                    found: true,
                    similarityScore: similarity,
                    nameMatch,
                    isActive: record.status === 'active',
                    flags,
                    record: {
                        registrationNumber: record.registrationNumber,
                        businessName: record.businessName,
                        status: record.status
                    }
                }
            };
            
            this.caseStore.addToolResult(args.caseId, result);
            
            // Verify identity claims if match is good
            if (nameMatch && record.status === 'active') {
                const currentClaims = state.claims;
                const updated = currentClaims.map(c => {
                    if (c.dimension === 'identity') {
                        return { ...c, status: 'verified' as const };
                    }
                    return c;
                });
                this.caseStore.updateClaims(args.caseId, updated);
            }
            
            return result;
        } catch (error) {
            return { status: 'failed', error: String(error) };
        }
    }
}
