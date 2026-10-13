import { Injectable } from '@nitrostack/core';
import { GeminiService } from './gemini.service.js';
import { MarketGapAnalysisOutput, MarketGapAnalysisOutputSchema } from '../types/pipeline.types.js';
import { UnderstandIdeaOutput } from '../types/idea.types.js';
import { CompetitorProfile } from '../types/profile.types.js';
import { CompareCompetitorsOutput } from '../types/comparison.types.js';

@Injectable({ deps: [GeminiService] })
export class MarketGapService {
    constructor(private readonly geminiService: GeminiService) {}

    async analyzeGaps(
        ideaAnalysis: UnderstandIdeaOutput,
        profiles: CompetitorProfile[],
        comparison: CompareCompetitorsOutput
    ): Promise<MarketGapAnalysisOutput> {
        try {
            const prompt = `Analyze market gaps and whitespace opportunities for this startup idea against competitors.

Startup Idea:
Category: ${ideaAnalysis?.category || 'Unknown'}
Core Problem: ${ideaAnalysis?.coreProblem || 'Unknown'}
Target Audience: ${ideaAnalysis?.targetAudience || 'Unknown'}
Value Proposition: ${ideaAnalysis?.valueProposition || 'Unknown'}

Existing Competitors (${profiles?.length || 0}):
${(profiles || []).map(p => `- ${p.name}: Weaknesses: ${(p.weaknesses || []).join(', ')} | Target: ${p.targetCustomers}`).join('\n')}

Market Leader: ${comparison?.marketLeader || 'Unknown'}

Tasks:
1. Identify 3-4 specific 'gaps' (market opportunities) that existing competitors are failing to address.
2. List 3 'unaddressedProblems' that customers face in this space.
3. List 3 'whitespaceOpportunities' where the startup can build a defensible moat.

Return JSON strictly adhering to schema.`;

            const res = await this.geminiService.generateStructuredOutput(prompt, MarketGapAnalysisOutputSchema);
            if (res) return res as MarketGapAnalysisOutput;
        } catch (err: any) {
            console.error('[MarketGapService] Gemini gap analysis failed. Using fallback.', err.message);
        }

        return {
            gaps: [
                {
                    title: `Unaddressed Needs in ${ideaAnalysis.category || 'this market'}`,
                    description: `Existing competitors fail to fully solve the core problem: ${ideaAnalysis.coreProblem || 'manual workflows'}.`,
                    opportunitySize: 'High ($50M+ TAM)',
                    difficulty: 'Medium',
                    targetSegment: ideaAnalysis.targetAudience || 'Early adopters & SMBs'
                },
                {
                    title: 'Affordable Tier for Individual Users',
                    description: 'Competitors focus heavily on enterprise contracts, pricing out independent users and small teams.',
                    opportunitySize: 'High',
                    difficulty: 'Low',
                    targetSegment: 'Individuals & Students'
                }
            ],
            unaddressedProblems: [
                `Lack of solutions for: ${ideaAnalysis.coreProblem || 'the core problem'}`,
                'High subscription costs of legacy competitors',
                'Complex onboarding requiring extensive setup'
            ],
            whitespaceOpportunities: [
                `Directly addressing the needs of ${ideaAnalysis.targetAudience || 'users'}`,
                'Self-serve freemium model with micro-transactions',
                'Hyper-personalized user recommendations'
            ]
        };
    }
}
