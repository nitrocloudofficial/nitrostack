import { Injectable, ToolDecorator as Tool, z, ExecutionContext } from '@nitrostack/core';
import { QualityTestService } from './quality.service.js';
import { GoogleSheetsService } from '../google-sheets/google-sheets.service.js';

@Injectable({ deps: [QualityTestService, GoogleSheetsService] })
export class QualityTestTools {
    constructor(
        private readonly qualityTestService: QualityTestService,
        private readonly sheets: GoogleSheetsService,
    ) { }

    @Tool({
        name: 'get_lot_yield_summary',
        title: 'Lot Yield Summary (STDF)',
        description: 'Parses STDF binary test logs for a given lot and returns a summarized yield report with failing bin codes, counts, and impacts.',
        inputSchema: z.object({
            lotId: z.string().describe('The lot identifier to fetch quality test summaries for'),
        }),
        annotations: {
            readOnlyHint: true,
            destructiveHint: false,
        },
    })
    async getYieldSummary(input: { lotId: string }, ctx: ExecutionContext) {
        const lotId = String(input.lotId).replace(/^lotId:\s*/i, '').trim();
        ctx.logger.info(`Fetching yield summary for lot: ${lotId}`);
        const summary = await this.qualityTestService.getYieldSummary(lotId);
        if (!summary) {
            return { error: `No yield data found for lot ${lotId}.` };
        }
        return summary;
    }

    @Tool({
        name: 'create_yield_record',
        title: 'Create Yield Record',
        description: 'Logs a new yield test result for a wafer lot. Use this when the user wants to record test results, add a yield data point, or log STDF summary data for a lot.',
        inputSchema: z.object({
            lotId: z.string().describe('The lot ID tested, e.g. LOT-8923'),
            totalWafersTested: z.number().describe('Total number of wafers tested, e.g. 2000'),
            overallYield: z.string().describe('Overall yield percentage, e.g. 81.40%'),
            failingBins: z.array(z.object({
                binCode: z.string().describe('Bin code identifier, e.g. BIN_12_LEAKAGE'),
                count: z.number().describe('Number of failures for this bin'),
                impact: z.string().describe('Impact description, e.g. High power consumption'),
            })).describe('Array of failing bins with codes, counts, and impacts'),
        }),
        annotations: {
            readOnlyHint: false,
            destructiveHint: false,
        },
        invocation: {
            invoking: 'Creating yield record...',
            invoked: 'Yield record created',
        },
    })
    async createYieldRecord(
        input: { lotId: string; totalWafersTested: number; overallYield: string; failingBins: { binCode: string; count: number; impact: string }[] },
        ctx: ExecutionContext,
    ) {
        const lotId = String(input.lotId).replace(/^lotId:\s*/i, '').trim();
        const totalWafersTested = input.totalWafersTested;
        const overallYield = String(input.overallYield).replace(/^overallYield:\s*/i, '').trim();

        // Format failingBins as text with en-dash separator
        const failingBinsText = (input.failingBins || [])
            .map((b) => `${b.binCode} \u2013 ${b.count} failures (Impact: ${b.impact})`)
            .join('');

        ctx.logger.info(`Creating yield record for lot: ${lotId}`);

        await this.sheets.appendRow('Yield Data', [
            lotId,
            String(totalWafersTested),
            overallYield,
            failingBinsText,
        ]);

        return {
            lotId,
            totalWafersTested,
            overallYield,
            failingBins: input.failingBins,
            message: `Yield record for lot ${lotId} created successfully.`,
        };
    }
}
