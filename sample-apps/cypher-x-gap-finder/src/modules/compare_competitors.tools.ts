import { ToolDecorator as Tool, Widget, ExecutionContext, Injectable } from '@nitrostack/core';
import { CompetitorComparisonService } from '../services/competitorComparison.service.js';
import { CompareCompetitorsInputSchema } from '../types/comparison.types.js';

function comparisonWidget(route: string) {
    return {
        route,
        prefersBorder: true,
    };
}

@Injectable({ deps: [CompetitorComparisonService] })
export class CompareCompetitorsTools {
    constructor(private readonly comparisonService: CompetitorComparisonService) {}

    @Tool({
        name: 'compare_competitors',
        description: 'Compare competitor profiles across features, pricing, target audience, business model, strengths, and weaknesses to generate a comparative feature matrix.',
        inputSchema: CompareCompetitorsInputSchema,
    })
    @Widget(comparisonWidget('competitor-comparison'))
    async compareCompetitors(args: any, ctx: ExecutionContext) {
        const startTime = Date.now();
        ctx.logger.info('[Tool: compare_competitors] Execution Started', { input: JSON.stringify(args) });

        try {
            const parseResult = CompareCompetitorsInputSchema.safeParse(args);
            const parsedInput = parseResult.success ? parseResult.data : (args || {});

            const result = await this.comparisonService.compare(parsedInput);
            const duration = Date.now() - startTime;

            ctx.logger.info('[Tool: compare_competitors] Execution Completed', { 
                marketLeader: result.marketLeader,
                durationMs: duration 
            });

            return result;
        } catch (error: any) {
            const duration = Date.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : String(error);
            ctx.logger.error('[Tool: compare_competitors] Execution Failed', { error: errorMessage, durationMs: duration });

            return {
                marketLeader: 'N/A',
                summary: 'Comparison failed due to error.',
                topCompetitors: [],
                comparisonTable: [],
                featureMatrix: [],
                status: 'error',
                message: errorMessage
            };
        }
    }
}
