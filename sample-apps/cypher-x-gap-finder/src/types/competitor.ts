import { z } from 'zod';

export const DiscoverCompetitorsInputSchema = z.object({
    idea: z.string().optional().catch(''),
    category: z.string().optional().catch(''),
    coreProblem: z.string().optional().catch(''),
    problem: z.string().optional().catch(''),
    targetAudience: z.string().optional().catch(''),
    targetUser: z.string().optional().catch(''),
    valueProposition: z.string().optional().catch(''),
    valueProp: z.string().optional().catch(''),
    keywords: z.union([z.array(z.string()), z.string()]).optional().catch([]),
    geography: z.string().optional().catch('')
});

export type DiscoverCompetitorsInput = z.infer<typeof DiscoverCompetitorsInputSchema>;

export const CompetitorSchema = z.object({
    name: z.string().default('Unknown Competitor'),
    website: z.string().default(''),
    description: z.string().default('No description provided.'),
    reason: z.string().default('Identified as a potential competitor based on market overlaps.')
});

export type Competitor = z.infer<typeof CompetitorSchema>;

export const DiscoverCompetitorsOutputSchema = z.object({
    competitors: z.array(CompetitorSchema),
    status: z.string().optional(),
    message: z.string().optional(),
    error: z.string().optional()
});

export type DiscoverCompetitorsOutput = z.infer<typeof DiscoverCompetitorsOutputSchema>;
