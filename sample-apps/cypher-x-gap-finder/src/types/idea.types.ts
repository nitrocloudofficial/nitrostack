import { z } from 'zod';

export const UnderstandIdeaInputSchema = z.object({
    idea: z.string().min(1, 'Idea text is required'),
    industry: z.string().optional(),
    geography: z.string().optional(),
    targetAudience: z.enum(['B2B', 'B2C', 'Both']).optional()
});

export type UnderstandIdeaInput = z.infer<typeof UnderstandIdeaInputSchema>;

export const UnderstandIdeaOutputSchema = z.object({
    category: z.string().describe('The industry sector or business category the idea fits into'),
    coreProblem: z.string().describe('The core problem that the idea aims to solve'),
    targetAudience: z.string().describe('The primary customer segment or target user group'),
    valueProposition: z.string().describe('The unique value proposition or why users would choose this product'),
    keywords: z.array(z.string()).describe('List of search keywords/entities for competitor discovery (5-8 terms)')
});

export type UnderstandIdeaOutput = z.infer<typeof UnderstandIdeaOutputSchema>;
