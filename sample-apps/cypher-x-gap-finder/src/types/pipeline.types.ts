import { z } from 'zod';
import { UnderstandIdeaOutputSchema } from './idea.types.js';
import { CompetitorSchema } from './competitor.js';
import { CompetitorProfileSchema } from './profile.types.js';
import { CompareCompetitorsOutputSchema } from './comparison.types.js';

export const RunCompetitiveResearchInputSchema = z.object({
    idea: z.string().min(1, 'Idea is required'),
    industry: z.string().optional().catch(''),
    geography: z.string().optional().catch(''),
    targetAudience: z.string().optional().catch('')
});

export type RunCompetitiveResearchInput = z.infer<typeof RunCompetitiveResearchInputSchema>;

export const MarketGapSchema = z.object({
    title: z.string(),
    description: z.string(),
    opportunitySize: z.string().default('High'),
    difficulty: z.string().default('Medium'),
    targetSegment: z.string().default('Underserved Market')
});

export const MarketGapAnalysisOutputSchema = z.object({
    gaps: z.array(MarketGapSchema).default([]),
    unaddressedProblems: z.array(z.string()).default([]),
    whitespaceOpportunities: z.array(z.string()).default([])
});

export type MarketGapAnalysisOutput = z.infer<typeof MarketGapAnalysisOutputSchema>;

export const InnovationScoringOutputSchema = z.object({
    overallScore: z.coerce.number().min(0).max(100).default(85),
    explanation: z.string().optional().default('Based on competitive density and problem uniqueness.'),
    dimensionScores: z.object({
        problemUniqueness: z.coerce.number().min(0).max(100).default(80),
        marketTiming: z.coerce.number().min(0).max(100).default(90),
        moatPotential: z.coerce.number().min(0).max(100).default(85),
        executionFeasibility: z.coerce.number().min(0).max(100).default(85)
    }).default({
        problemUniqueness: 80,
        marketTiming: 90,
        moatPotential: 85,
        executionFeasibility: 85
    }),
    recommendations: z.array(z.string()).default([]),
    riskFactors: z.array(z.string()).default([])
});

export type InnovationScoringOutput = z.infer<typeof InnovationScoringOutputSchema>;

export const ReportSectionSchema = z.object({
    heading: z.string(),
    content: z.string(),
    type: z.string().default('text')
});

export const GenerateReportOutputSchema = z.object({
    title: z.string().default('Competitive Intelligence Report'),
    executiveSummary: z.string().default('Executive summary of competitive research.'),
    sections: z.array(ReportSectionSchema).default([]),
    keyTakeaways: z.array(z.string()).default([])
});

export type GenerateReportOutput = z.infer<typeof GenerateReportOutputSchema>;

export const PipelineStepResultSchema = z.object({
    stepNumber: z.number(),
    stepName: z.string(),
    status: z.enum(['pending', 'running', 'completed', 'failed']),
    error: z.string().optional()
});

export const RunCompetitiveResearchOutputSchema = z.object({
    currentStep: z.number().default(7),
    steps: z.array(PipelineStepResultSchema).default([]),
    ideaAnalysis: UnderstandIdeaOutputSchema.optional(),
    competitors: z.array(CompetitorSchema).default([]),
    profiles: z.array(CompetitorProfileSchema).default([]),
    comparison: CompareCompetitorsOutputSchema.optional(),
    marketGaps: MarketGapAnalysisOutputSchema.optional(),
    innovationScores: InnovationScoringOutputSchema.optional(),
    report: GenerateReportOutputSchema.optional(),
    status: z.string().default('success'),
    message: z.string().default('Pipeline executed successfully.'),
    error: z.string().optional(),
    failedStep: z.string().optional(),
    success: z.boolean().optional(),
    failedStage: z.string().optional(),
    stack: z.string().optional()
});

export type RunCompetitiveResearchOutput = z.infer<typeof RunCompetitiveResearchOutputSchema>;
