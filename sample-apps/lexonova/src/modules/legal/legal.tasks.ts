/**
 * Legal Task Tools
 *
 * Demonstrates the MCP Tasks feature — long-running, async tool execution
 * with progress reporting and cancellation support.
 */

import { ToolDecorator as Tool, ExecutionContext, Injectable, z } from '@nitrostack/core';
import { LegalService } from './legal.service.js';

const CaseAssessSchema = z.object({
    workerName: z.string().describe('Name of the worker'),
    employerName: z.string().describe('Name of the employer'),
    issueDescription: z.string().describe('Description of the issue or complaint, e.g. "unpaid wages" or "harassment"'),
});

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

@Injectable({ deps: [LegalService] })
export class LegalTaskTools {
    constructor(private readonly legalService: LegalService) { }

    @Tool({
        name: 'assess_worker_case',
        description:
            'Performs a detailed legal assessment of a worker case. ' +
            'This is a long-running operation requiring task augmentation. ' +
            'Pass `task: {}` to get a task handle, poll with tasks/get, and retrieve results via tasks/result.',
        inputSchema: CaseAssessSchema,
        taskSupport: 'required',
    })
    async assessWorkerCase(
        args: z.infer<typeof CaseAssessSchema>,
        ctx: ExecutionContext,
    ) {
        ctx.logger.info('Starting case assessment', { workerName: args.workerName });

        ctx.task?.updateProgress('🔍 Step 1: Matching issue description against Labour Code sections...');
        await sleep(1000);
        ctx.task?.throwIfCancelled();

        // Find matches
        const matches = this.legalService.searchLaw(args.issueDescription);

        ctx.task?.updateProgress('📋 Step 2: Retrieving relevant filing procedures...');
        await sleep(1000);
        ctx.task?.throwIfCancelled();

        const procedures = this.legalService.getProcedures(args.issueDescription);

        ctx.task?.updateProgress('📝 Step 3: Drafting preliminary worker grievance statement...');
        await sleep(1000);
        ctx.task?.throwIfCancelled();

        const summary = `Case Assessment for ${args.workerName} vs ${args.employerName}.\n` +
            `Issue: ${args.issueDescription}\n\n` +
            `Relevant Provisions Found: ${matches.map(m => m.id).join(', ') || 'None'}\n` +
            `Recommended Steps: ${procedures.map(p => p.id).join(' -> ') || 'None'}`;

        return {
            status: 'completed',
            workerName: args.workerName,
            employerName: args.employerName,
            assessmentSummary: summary,
            generatedAt: new Date().toISOString(),
        };
    }
}
