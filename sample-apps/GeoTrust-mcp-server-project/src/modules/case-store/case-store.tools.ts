import { ToolDecorator as Tool, Injectable, z } from '@nitrostack/core';
import { CaseStoreService } from './case-store.service.js';
import type { ToolResult } from '../../shared-types.js';

const InitializeCaseSchema = z.object({
    caseId: z.string(),
    businessName: z.string(),
});

@Injectable({ deps: [CaseStoreService] })
export class CaseStoreTools {
    constructor(private readonly caseStore: CaseStoreService) { }

    @Tool({
        name: 'initializeCase',
        description: 'Pre-step: Derives entity type, GST status, and ownership from what has already been extracted for the case.',
        inputSchema: InitializeCaseSchema,
    })
    async initializeCase(args: z.infer<typeof InitializeCaseSchema>): Promise<ToolResult> {
        try {
            const state = this.caseStore.getOrCreate(args.caseId, args.businessName);
            
            // Derive entity type from business name if missing
            const nameLower = args.businessName.toLowerCase();
            let entityType = 'Unknown';
            if (nameLower.includes('pvt ltd') || nameLower.includes('private limited')) entityType = 'Pvt Ltd';
            else if (nameLower.includes('llp') || nameLower.includes('limited liability')) entityType = 'LLP';
            else if (nameLower.includes('ltd') || nameLower.includes('limited')) entityType = 'Public Ltd';
            
            // Look through claims for GST status and ownership
            const hasGstClaim = state.claims.some(c => c.label === 'GST Number' && c.value !== 'UNKNOWN');
            const hasOwnershipClaim = state.claims.some(c => c.label === 'Premises Ownership' && c.value !== 'UNKNOWN');

            return {
                status: 'success',
                data: {
                    entityType,
                    hasGstClaim,
                    hasOwnershipClaim,
                    aggregatedAt: new Date().toISOString()
                }
            };
        } catch (error) {
            return { status: 'failed', error: String(error) };
        }
    }
}
