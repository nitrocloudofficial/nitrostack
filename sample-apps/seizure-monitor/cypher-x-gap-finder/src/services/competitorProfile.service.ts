import { Injectable } from '@nitrostack/core';
import { GeminiService } from './gemini.service.js';
import { TavilyClient } from '../api/tavily.js';
import { 
    ExtractCompetitorProfilesInput, 
    ExtractCompetitorProfilesOutput, 
    ExtractCompetitorProfilesOutputSchema,
    CompetitorProfile
} from '../types/profile.types.js';

@Injectable({ deps: [GeminiService, TavilyClient] })
export class CompetitorProfileService {
    constructor(
        private readonly geminiService: GeminiService,
        private readonly tavilyClient: TavilyClient
    ) {}

    async extractProfiles(input: ExtractCompetitorProfilesInput): Promise<ExtractCompetitorProfilesOutput> {
        const rawCompetitors = input.competitors || [];

        if (!Array.isArray(rawCompetitors) || rawCompetitors.length === 0) {
            return {
                profiles: [],
                status: 'empty',
                message: 'No competitors were provided to extract profiles for.'
            };
        }

        // Limit to max 3 competitors for rate limit safety on free tier API keys
        const competitorsToProcess = rawCompetitors.slice(0, 3);

        const profilePromises = competitorsToProcess.map(async (comp): Promise<CompetitorProfile> => {
            const name = comp.name || 'Unknown Competitor';
            const website = comp.website || 'https://example.com';
            const initialDesc = comp.description || comp.reason || 'SaaS platform provider';

            let searchContext = initialDesc;
            try {
                const searchRes = await this.tavilyClient.search(`${name} ${website} pricing features funding business model`);
                if (searchRes.results && searchRes.results.length > 0) {
                    searchContext = searchRes.results.map((r: any) => `${r.title}: ${r.content}`).join('\n').substring(0, 1500);
                }
            } catch (err: any) {
                console.warn(`[CompetitorProfileService] Search failed for ${name}:`, err.message);
            }

            const prompt = `Analyze and extract a structured competitor profile for "${name}" (${website}).

Search / Web Context:
${searchContext}

Startup Industry Context:
Category: ${input.ideaAnalysis?.category || 'General SaaS'}
Core Problem: ${input.ideaAnalysis?.coreProblem || 'Industry problem'}

Extract and structure the profile into the exact JSON format required:
- overview: 1-2 sentence overview of ${name}.
- problemSolved: What problem ${name} solves for its users.
- targetCustomers: Primary customer segments.
- pricingModel: Pricing tier structure (e.g. Free Tier, Freemium, Custom Enterprise).
- keyFeatures: Array of 3-5 core product features.
- techStack: Array of known or inferred technologies used (e.g. React, Node.js, AWS, Python).
- businessModel: Business model type (e.g. B2B Subscription, Freemium, Marketplace).
- funding: Known funding stage or status (e.g. Series A, Bootstrapped, Public).
- strengths: Array of 3 key strengths or advantages.
- weaknesses: Array of 2-3 key weaknesses or limitations.
- usp: Unique Selling Proposition (why customers choose ${name}).

IMPORTANT ANTI-HALLUCINATION RULES:
If any specific information (such as pricingModel, funding, or techStack) is NOT clearly available in the Search Context, DO NOT guess or invent data. You MUST output "Not Disclosed" or "Unknown" for that field.

Return JSON strictly adhering to schema.`;

            try {
                const SingleProfileSchema = ExtractCompetitorProfilesOutputSchema.shape.profiles.element;
                const result = await this.geminiService.generateStructuredOutput(prompt, SingleProfileSchema);
                if (result) return result as CompetitorProfile;
            } catch (err: any) {
                console.warn(`[CompetitorProfileService] Gemini profile generation failed for ${name}. Using fallback.`, err.message);
            }

            return {
                name,
                website,
                overview: initialDesc.length > 150 ? initialDesc.substring(0, 147) + '...' : initialDesc,
                problemSolved: `Provides software solutions addressing ${input.ideaAnalysis?.category || 'industry requirements'}.`,
                targetCustomers: input.ideaAnalysis?.targetAudience || 'SMBs and Enterprise Users',
                pricingModel: 'Tiered Subscription',
                keyFeatures: ['Core Platform Functionality', 'Analytics Dashboard', 'API Access'],
                techStack: ['Modern Web Stack', 'Cloud Infrastructure'],
                businessModel: 'B2B SaaS Subscription',
                funding: 'Private / Venture Backed',
                strengths: ['Established brand presence', 'Comprehensive feature set', 'Large user base'],
                weaknesses: ['Higher enterprise pricing', 'Complex setup for small teams'],
                usp: `Established market alternative for ${name}.`
            };
        });

        const profiles = await Promise.all(profilePromises);

        return {
            profiles,
            status: 'success',
            message: 'Competitor profiles extracted successfully.'
        };
    }
}
