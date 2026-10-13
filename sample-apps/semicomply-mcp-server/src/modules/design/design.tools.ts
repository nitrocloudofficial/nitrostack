import { Injectable, ToolDecorator as Tool, z, ExecutionContext } from '@nitrostack/core';
import { DesignService } from './design.service.js';
import { GoogleSheetsService } from '../google-sheets/google-sheets.service.js';

@Injectable({ deps: [DesignService, GoogleSheetsService] })
export class DesignTools {
    constructor(
        private readonly designService: DesignService,
        private readonly sheets: GoogleSheetsService,
    ) { }

    @Tool({
        name: 'get_cadence_design_revision',
        title: 'Cadence Design Revision Lookup',
        description: 'Retrieves layout/IP block revision metadata from Cadence Virtuoso/Altium for a given revision ID. Returns designer, IP block, changes, and timestamp.',
        inputSchema: z.object({
            revisionId: z.string().describe('The revision identifier for the IP block or PCB layout, e.g. REV-SERDES-PHY-v2.3'),
        }),
        annotations: {
            readOnlyHint: true,
            destructiveHint: false,
        },
    })
    async getRevision(input: { revisionId: string }, ctx: ExecutionContext) {
        const revisionId = String(input.revisionId).replace(/^revisionId:\s*/i, '').trim();
        ctx.logger.info(`Fetching design revision: ${revisionId}`);
        const revision = await this.designService.getRevision(revisionId);
        if (!revision) {
            return { error: `Revision ${revisionId} not found in Cadence vault.` };
        }
        return revision;
    }

    @Tool({
        name: 'create_design_revision',
        title: 'Create Design Revision',
        description: 'Creates a new design revision record in the Cadence design vault. Use this when the user wants to log a new revision, add a design change, or record a layout update for an IP block.',
        inputSchema: z.object({
            lotId: z.string().describe('The lot ID this revision applies to, e.g. LOT-8923'),
            designer: z.string().describe('Name of the designer making the revision, e.g. A. Sharma'),
            ipBlock: z.string().describe('The IP block name, e.g. SERDES_PHY_BLOCK'),
            changes: z.string().describe('Description of what changed in this revision'),
            timestamp: z.string().optional().describe('ISO 8601 timestamp. Defaults to now if omitted.'),
        }),
        annotations: {
            readOnlyHint: false,
            destructiveHint: false,
        },
        invocation: {
            invoking: 'Creating design revision...',
            invoked: 'Design revision created',
        },
    })
    async createRevision(
        input: { lotId: string; designer: string; ipBlock: string; changes: string; timestamp?: string },
        ctx: ExecutionContext,
    ) {
        const lotId = String(input.lotId).replace(/^lotId:\s*/i, '').trim();
        const designer = String(input.designer).replace(/^designer:\s*/i, '').trim();
        const ipBlock = String(input.ipBlock).replace(/^ipBlock:\s*/i, '').trim();
        const changes = String(input.changes).replace(/^changes:\s*/i, '').trim();
        const timestamp = input.timestamp || new Date().toISOString();

        // Auto-generate revision ID: REV-{IPBLOCK}-v{nextVersion}
        const existing = await this.sheets.fetchSheet('Design Revisions');
        const sameBlock = existing.filter((r) => r.ipBlock === ipBlock);
        let maxVersion = 0;
        for (const row of sameBlock) {
            const match = row.revisionId?.match(/v(\d+)\.?(\d+)?/);
            if (match) {
                const v = parseInt(match[1], 10) * 10 + (parseInt(match[2] || '0', 10));
                if (v > maxVersion) maxVersion = v;
            }
        }
        const nextMajor = Math.floor(maxVersion / 10) + 1;
        const revisionId = `REV-${ipBlock}-v${nextMajor}.0`;

        ctx.logger.info(`Creating design revision: ${revisionId}`);

        await this.sheets.appendRow('Design Revisions', [
            revisionId,
            lotId,
            designer,
            ipBlock,
            changes,
            timestamp,
        ]);

        return {
            revisionId,
            lotId,
            designer,
            ipBlock,
            changes,
            timestamp,
            message: `Design revision ${revisionId} created successfully.`,
        };
    }
}
