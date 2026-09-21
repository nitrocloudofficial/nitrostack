import { ToolDecorator as Tool, Widget, ExecutionContext, Injectable } from '@nitrostack/core';
import { InnovationScoreService } from '../services/innovationScore.service.js';
import { z } from 'zod';
import { UnderstandIdeaOutputSchema } from '../types/idea.types.js';
import { CompetitorProfileSchema } from '../types/profile.types.js';
import { MarketGapAnalysisOutputSchema } from '../types/pipeline.types.js';

export const InnovationScoringInputSchema = z.object({
    ideaAnalysis: UnderstandIdeaOutputSchema.optional(),
    profiles: z.array(CompetitorProfileSchema).optional().catch([]),
    marketGaps: MarketGapAnalysisOutputSchema.optional()
});

function pipelineWidget(route: string) {
    return {
        route,
        prefersBorder: true,
    };
}

@Injectable({ deps: [InnovationScoreService] })
export class InnovationScoringTools {
    constructor(private readonly scoreService: InnovationScoreService) {}

    @Tool({
        name: 'innovation_scoring',
        description: 'Calculate innovation index and potential scores across market dimensions.',
        inputSchema: InnovationScoringInputSchema,
    })
    @Widget(pipelineWidget('pipeline-progress'))
    async scoreInnovation(args: any, ctx: ExecutionContext) {
        const startTime = Date.now();
        ctx.logger.info('[Tool: innovation_scoring] Started', { input: JSON.stringify(args) });

        try {
            const parseResult = InnovationScoringInputSchema.safeParse(args);
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
            const marketGaps = input.marketGaps || { gaps: [], unaddressedProblems: [], whitespaceOpportunities: [] };

            const result = await this.scoreService.scoreInnovation(ideaAnalysis as any, profiles, marketGaps);
            const duration = Date.now() - startTime;

            ctx.logger.info('[Tool: innovation_scoring] Completed', { overallScore: result.overallScore, durationMs: duration });
            return result;
        } catch (error: any) {
            const duration = Date.now() - startTime;
            const errorMsg = error instanceof Error ? error.message : String(error);
            ctx.logger.error('[Tool: innovation_scoring] Failed', { error: errorMsg, durationMs: duration });

            return {
                overallScore: 80,
                dimensionScores: { problemUniqueness: 80, marketTiming: 80, moatPotential: 80, executionFeasibility: 80 },
                recommendations: [],
                riskFactors: [],
                status: 'error',
                error: errorMsg
            };
        }
    }
}
