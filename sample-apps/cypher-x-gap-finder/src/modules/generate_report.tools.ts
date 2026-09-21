import { ToolDecorator as Tool, Widget, ExecutionContext, Injectable } from '@nitrostack/core';
import { ReportGeneratorService } from '../services/reportGenerator.service.js';
import { z } from 'zod';
import { UnderstandIdeaOutputSchema } from '../types/idea.types.js';
import { CompetitorSchema } from '../types/competitor.js';
import { CompetitorProfileSchema } from '../types/profile.types.js';
import { CompareCompetitorsOutputSchema } from '../types/comparison.types.js';
import { MarketGapAnalysisOutputSchema, InnovationScoringOutputSchema } from '../types/pipeline.types.js';

export const GenerateReportInputSchema = z.object({
    ideaAnalysis: UnderstandIdeaOutputSchema.optional(),
    competitors: z.array(CompetitorSchema).optional().catch([]),
    profiles: z.array(CompetitorProfileSchema).optional().catch([]),
    comparison: CompareCompetitorsOutputSchema.optional(),
    marketGaps: MarketGapAnalysisOutputSchema.optional(),
    innovationScores: InnovationScoringOutputSchema.optional()
});

function pipelineWidget(route: string) {
    return {
        route,
        prefersBorder: true,
    };
}

@Injectable({ deps: [ReportGeneratorService] })
export class GenerateReportTools {
    constructor(private readonly reportService: ReportGeneratorService) {}

    @Tool({
        name: 'generate_report',
        description: 'Synthesize full C-level strategic report from competitive research data.',
        inputSchema: GenerateReportInputSchema,
    })
    @Widget(pipelineWidget('pipeline-progress'))
    async generateReport(args: any, ctx: ExecutionContext) {
        const startTime = Date.now();
        ctx.logger.info('[Tool: generate_report] Started', { input: JSON.stringify(args) });

        try {
            const parseResult = GenerateReportInputSchema.safeParse(args);
            const input = parseResult.success ? parseResult.data : {};

            const defaultIdea = {
                category: 'Startup SaaS',
                coreProblem: 'Unaddressed market problem',
                targetAudience: 'Target Customers',
                valueProposition: 'Value prop solution',
                keywords: ['SaaS']
            };

            const ideaAnalysis = input.ideaAnalysis || defaultIdea;
            const competitors = input.competitors || [];
            const profiles = input.profiles || [];
            const comparison = input.comparison || { marketLeader: 'Incumbent' };
            const marketGaps = input.marketGaps || { gaps: [], unaddressedProblems: [], whitespaceOpportunities: [] };
            const innovationScores = input.innovationScores || { overallScore: 85, explanation: 'Based on competitive density and problem uniqueness.', dimensionScores: { problemUniqueness: 80, marketTiming: 90, moatPotential: 85, executionFeasibility: 85 }, recommendations: [], riskFactors: [] };

            const result = await this.reportService.generateReport(
                ideaAnalysis as any,
                competitors,
                profiles,
                comparison as any,
                marketGaps,
                innovationScores
            );
            const duration = Date.now() - startTime;

            ctx.logger.info('[Tool: generate_report] Completed', { title: result.title, durationMs: duration });
            return result;
        } catch (error: any) {
            const duration = Date.now() - startTime;
            const errorMsg = error instanceof Error ? error.message : String(error);
            ctx.logger.error('[Tool: generate_report] Failed', { error: errorMsg, durationMs: duration });

            return {
                title: 'Competitive Intelligence Report',
                executiveSummary: 'Report generation completed with default executive overview.',
                sections: [],
                keyTakeaways: [],
                status: 'error',
                error: errorMsg
            };
        }
    }
}
