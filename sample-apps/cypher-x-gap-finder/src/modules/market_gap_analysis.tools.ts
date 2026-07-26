import { ToolDecorator as Tool, Widget, ExecutionContext, Injectable } from '@nitrostack/core';
import { MarketGapService } from '../services/marketGap.service.js';
import { MarketGapAnalysisOutputSchema } from '../types/pipeline.types.js';
import { z } from 'zod';
import { UnderstandIdeaOutputSchema } from '../types/idea.types.js';
import { CompetitorProfileSchema } from '../types/profile.types.js';
import { CompareCompetitorsOutputSchema } from '../types/comparison.types.js';

export const MarketGapAnalysisInputSchema = z.object({
    ideaAnalysis: UnderstandIdeaOutputSchema.optional(),
    profiles: z.array(CompetitorProfileSchema).optional().catch([]),
    comparison: CompareCompetitorsOutputSchema.optional()
});

function pipelineWidget(route: string) {
    return {
        route,
        prefersBorder: true,
    };
}

@Injectable({ deps: [MarketGapService] })
export class MarketGapAnalysisTools {
    constructor(private readonly marketGapService: MarketGapService) {}

    @Tool({
        name: 'market_gap_analysis',
        description: 'Analyze unaddressed market gaps, customer pain points, and whitespace opportunities.',
        inputSchema: MarketGapAnalysisInputSchema,
    })
    @Widget(pipelineWidget('pipeline-progress'))
    async analyzeMarketGaps(args: any, ctx: ExecutionContext) {
        const startTime = Date.now();
        ctx.logger.info('[Tool: market_gap_analysis] Started', { input: JSON.stringify(args) });

        try {
            const parseResult = MarketGapAnalysisInputSchema.safeParse(args);
            const input = parseResult.success ? parseResult.data : {};

            const defaultIdea = {
                category: 'Startup SaaS',
                coreProblem: 'Unaddressed market problem',
                targetAudience: 'Target Customers',
                valueProposition: 'Value prop solution',
                keywords: ['SaaS']
            };

            const ideaAnalysis = input.ideaAnalysis || defaultIdea;
            const profiles = input.profiles || [];
            const comparison = input.comparison || { marketLeader: 'Incumbent' };

            const result = await this.marketGapService.analyzeGaps(ideaAnalysis as any, profiles, comparison as any);
            const duration = Date.now() - startTime;

            ctx.logger.info('[Tool: market_gap_analysis] Completed', { gapsCount: result.gaps.length, durationMs: duration });
            return result;
        } catch (error: any) {
            const duration = Date.now() - startTime;
            const errorMsg = error instanceof Error ? error.message : String(error);
            ctx.logger.error('[Tool: market_gap_analysis] Failed', { error: errorMsg, durationMs: duration });

            return {
                gaps: [],
                unaddressedProblems: [],
                whitespaceOpportunities: [],
                status: 'error',
                error: errorMsg
            };
        }
    }
}
