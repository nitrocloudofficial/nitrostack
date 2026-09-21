import { z } from 'zod';
import { CompetitorSchema } from './competitor.js';

export const CompetitorProfileSchema = z.object({
    name: z.string().default('Unknown Competitor'),
    website: z.string().default(''),
    overview: z.string().default('Overview not available'),
    problemSolved: z.string().default('Problem solved details not available'),
    targetCustomers: z.string().default('General customers and enterprise users'),
    pricingModel: z.string().default('Freemium / Paid Tier'),
    keyFeatures: z.array(z.string()).default([]),
    techStack: z.array(z.string()).default([]),
    businessModel: z.string().default('B2B / B2C SaaS'),
    funding: z.string().default('Undisclosed / Private'),
    strengths: z.array(z.string()).default([]),
    weaknesses: z.array(z.string()).default([]),
    usp: z.string().default('Unique value proposition details not available')
});

export type CompetitorProfile = z.infer<typeof CompetitorProfileSchema>;

export const ExtractCompetitorProfilesInputSchema = z.object({
    competitors: z.array(CompetitorSchema).default([]),
    ideaAnalysis: z.object({
        category: z.string().optional(),
        coreProblem: z.string().optional(),
        targetAudience: z.string().optional(),
        valueProposition: z.string().optional(),
        keywords: z.array(z.string()).optional()
    }).optional()
});

export type ExtractCompetitorProfilesInput = z.infer<typeof ExtractCompetitorProfilesInputSchema>;

export const ExtractCompetitorProfilesOutputSchema = z.object({
    profiles: z.array(CompetitorProfileSchema),
    status: z.string().optional(),
    message: z.string().optional()
});

export type ExtractCompetitorProfilesOutput = z.infer<typeof ExtractCompetitorProfilesOutputSchema>;
