import { z } from 'zod';
import { CompetitorProfileSchema } from './profile.types.js';

export const CompareCompetitorsInputSchema = z.object({
    profiles: z.array(CompetitorProfileSchema).default([])
});

export type CompareCompetitorsInput = z.infer<typeof CompareCompetitorsInputSchema>;

export const TopCompetitorBadgeSchema = z.object({
    name: z.string(),
    badge: z.string(),
    keyDifferentiator: z.string()
});

export const ComparisonTableRowSchema = z.object({
    feature: z.string(),
    category: z.string(),
    scores: z.record(z.string(), z.string())
});

export const FeatureMatrixItemSchema = z.object({
    name: z.string(),
    pricing: z.string(),
    targetAudience: z.string(),
    strengthsCount: z.coerce.number().nonnegative().default(0),
    weaknessesCount: z.coerce.number().nonnegative().default(0)
});

export const CompareCompetitorsOutputSchema = z.object({
    marketLeader: z.string().default('Top Competitor'),
    summary: z.string().default('Comparison completed.'),
    topCompetitors: z.array(TopCompetitorBadgeSchema).default([]),
    comparisonTable: z.array(ComparisonTableRowSchema).default([]),
    featureMatrix: z.array(FeatureMatrixItemSchema).default([]),
    status: z.string().optional(),
    message: z.string().optional()
});

export type CompareCompetitorsOutput = z.infer<typeof CompareCompetitorsOutputSchema>;
