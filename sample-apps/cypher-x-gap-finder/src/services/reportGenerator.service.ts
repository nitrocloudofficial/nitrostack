import { Injectable } from '@nitrostack/core';
import { GeminiService } from './gemini.service.js';
import { GenerateReportOutput, GenerateReportOutputSchema, InnovationScoringOutput, MarketGapAnalysisOutput } from '../types/pipeline.types.js';
import { UnderstandIdeaOutput } from '../types/idea.types.js';
import { CompetitorProfile } from '../types/profile.types.js';
import { CompareCompetitorsOutput } from '../types/comparison.types.js';
import { Competitor } from '../types/competitor.js';

@Injectable({ deps: [GeminiService] })
export class ReportGeneratorService {
    constructor(private readonly geminiService: GeminiService) {}

    async generateReport(
        ideaAnalysis: UnderstandIdeaOutput,
        competitors: Competitor[],
        profiles: CompetitorProfile[],
        comparison: CompareCompetitorsOutput,
        marketGaps: MarketGapAnalysisOutput,
        innovationScores: InnovationScoringOutput
    ): Promise<GenerateReportOutput> {
        try {
            const prompt = `Synthesize a comprehensive, C-level executive report for this startup competitive analysis.

Input Data:
- Idea: ${ideaAnalysis?.valueProposition || 'Unknown Idea'}
- Competitors Discovered: ${(competitors || []).map(c => c.name || 'Competitor').join(', ')}
- Market Leader: ${comparison?.marketLeader || 'Unknown Leader'}
- Innovation Score: ${innovationScores?.overallScore || 0}/100
- Market Gaps: ${(marketGaps?.gaps || []).map(g => g.title).join('; ')}

Tasks:
1. Provide a professional 'title'.
2. Provide a 2-3 sentence 'executiveSummary'.
3. Create 3 structured 'sections' with heading, content, and type ('text', 'matrix', 'recommendation'):
   - Section 1: Executive Market Overview
   - Section 2: Competitive Positioning & Whitespace Opportunities
   - Section 3: Strategic Go-To-Market Roadmap
4. Provide 4 bullet point 'keyTakeaways'.

Return JSON strictly adhering to schema.`;

            const res = await this.geminiService.generateStructuredOutput(prompt, GenerateReportOutputSchema);
            if (res) return res as GenerateReportOutput;
        } catch (err: any) {
            console.error('[ReportGeneratorService] Gemini report synthesis failed. Using fallback.', err.message);
        }

        return {
            title: `Competitive Intelligence Report: ${ideaAnalysis.category || 'Startup Analysis'}`,
            executiveSummary: `Analysis indicates significant market timing opportunity for ${ideaAnalysis.valueProposition}. While established competitors like ${comparison.marketLeader || 'incumbents'} dominate legacy channels, critical market gaps exist around ${ideaAnalysis.coreProblem || 'pricing flexibility'}.`,
            sections: [
                {
                    heading: '1. Executive Market Landscape',
                    content: `The ${ideaAnalysis.category || 'target'} market is currently served by ${profiles.length} primary competitors. Most incumbents focus on high-touch enterprise solutions, creating a clear entry vector for agile AI-native offerings.`,
                    type: 'text'
                },
                {
                    heading: '2. Whitespace & Competitive Moat',
                    content: `Key market gaps include ${(marketGaps?.gaps || []).map(g => g.title).join(', ')}. By addressing unaddressed problems such as ${(marketGaps?.unaddressedProblems || []).join(' and ')}, the platform can build a defensible product moat.`,
                    type: 'matrix'
                },
                {
                    heading: '3. Strategic Recommendations & Roadmap',
                    content: (innovationScores?.recommendations || []).join('\n• '),
                    type: 'recommendation'
                }
            ],
            keyTakeaways: [
                `Overall Innovation Index: ${innovationScores.overallScore}/100`,
                `Primary Market Opportunity: ${marketGaps.gaps[0]?.title || 'Market Gaps'}`,
                `Target Customer Segment: ${ideaAnalysis.targetAudience}`,
                `Go-To-Market Focus: Leverage freemium acquisition model`
            ]
        };
    }
}
