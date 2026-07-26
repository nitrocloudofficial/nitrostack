import { Injectable } from '@nitrostack/core';
import { GeminiService } from './gemini.service.js';
import { TavilyClient } from '../api/tavily.js';
import { DiscoverCompetitorsInput, DiscoverCompetitorsOutput, DiscoverCompetitorsOutputSchema, Competitor } from '../types/competitor.js';
import { z } from 'zod';

interface TempCompetitor {
    name: string;
    website: string;
    description: string;
    reason: string;
    score: number;
    queryMatches: Set<string>;
}

@Injectable({ deps: [GeminiService, TavilyClient] })
export class CompetitorDiscoveryService {
    constructor(
        private readonly geminiService: GeminiService,
        private readonly tavilyClient: TavilyClient
    ) {}

    private validateInput(input: DiscoverCompetitorsInput) {
        const trimStr = (val: string | undefined | null): string => {
            if (typeof val === 'string') return val.trim();
            return '';
        };

        const rawIdea = trimStr(input.idea);
        const category = trimStr(input.category) || (rawIdea ? 'Tech/SaaS' : '');
        const coreProblem = trimStr(input.coreProblem) || trimStr(input.problem) || rawIdea;
        const targetAudience = trimStr(input.targetAudience) || trimStr(input.targetUser) || 'Target Users';
        const geography = trimStr(input.geography);
        const valueProposition = trimStr(input.valueProposition) || trimStr(input.valueProp) || rawIdea;

        let keywords: string[] = [];
        const rawKeywords = input.keywords;
        if (Array.isArray(rawKeywords)) {
            keywords = rawKeywords
                .map(k => (typeof k === 'string' ? k.trim() : ''))
                .filter(k => k.length > 0);
        } else if (typeof rawKeywords === 'string' && rawKeywords.trim().length > 0) {
            keywords = rawKeywords
                .split(',')
                .map(k => k.trim())
                .filter(k => k.length > 0);
        }

        if (keywords.length === 0) {
            if (valueProposition) keywords.push(valueProposition.split(' ').slice(0, 3).join(' '));
            if (coreProblem && coreProblem !== valueProposition) keywords.push(coreProblem.split(' ').slice(0, 3).join(' '));
            if (category) keywords.push(category);
        }

        const isValid = Boolean(coreProblem || valueProposition || category || rawIdea);

        return {
            isValid,
            category: category || 'Startup',
            coreProblem,
            targetAudience,
            keywords,
            geography,
            valueProposition
        };
    }

    async discover(input: DiscoverCompetitorsInput): Promise<DiscoverCompetitorsOutput> {
        console.error('[STAGE 2: Service Input received]:', JSON.stringify(input, null, 2));
        const validated = this.validateInput(input);
        console.error('[STAGE 3: Service Input Validation result]:', JSON.stringify(validated, null, 2));

        if (!validated.isValid) {
            console.error('[CompetitorDiscoveryService] Input lacks sufficient information. Returning empty input guidance.');
            return {
                competitors: [],
                status: 'empty',
                message: 'Please provide the required startup information to discover competitors.'
            };
        }

        const { category, coreProblem, targetAudience, keywords: keywordsArray, geography, valueProposition } = validated;

        let uniqueQueries: string[] = [];
        try {
            const queryPrompt = `You are an expert market researcher. Generate exactly 4 highly-specific search engine queries to find direct competitors for this startup idea.
            
Idea: ${valueProposition || coreProblem || category}
Category: ${category}
Target Audience: ${targetAudience}

RULES:
1. Do NOT generate generic queries like "startups solving X" or "software companies".
2. Generate queries that real users would type to find alternatives (e.g., "apps like Splitwise", "bill splitting apps", "Uber alternatives").
3. Focus on finding actual product websites and companies.
Return JSON strictly adhering to schema.`;

            const queryResult = await this.geminiService.generateStructuredOutput(
                queryPrompt,
                z.object({ queries: z.array(z.string()).max(4) })
            );
            if (queryResult && Array.isArray(queryResult.queries) && queryResult.queries.length > 0) {
                uniqueQueries = queryResult.queries;
            }
        } catch (err: any) {
            console.warn('[STAGE 4: Gemini query generation failed. Using fallback static queries]:', err.message);
        }

        if (uniqueQueries.length === 0) {
            const queries: string[] = [];
            if (coreProblem && coreProblem.trim() !== '') {
                queries.push(`startups solving ${coreProblem}`);
                queries.push(`software companies for ${coreProblem} ${targetAudience}`);
            }
            if (valueProposition && valueProposition.trim() !== '') {
                queries.push(`${valueProposition} competitors`);
            }
            if (category && category.trim() !== '') {
                queries.push(`top ${category} startups ${geography ? `in ${geography}` : ''}`);
            }
            if (queries.length === 0) queries.push('new startups SaaS competitors');
            uniqueQueries = Array.from(new Set(queries)).slice(0, 4);
        }

        console.error('[STAGE 4: Parameters sent to Tavily (Queries generated)]:', uniqueQueries);

        const allSearchResults: Array<{ url: string; title: string; content?: string; score?: number; query?: string }> = [];
        let lastApiErrorMessage: string | null = null;

        const searchPromises = uniqueQueries.map(async (query) => {
            try {
                console.error('[STAGE 5: Tavily request query]:', query);
                const response = await this.tavilyClient.search(query);
                console.error('[STAGE 6: Tavily response received]:', { query, count: response.results?.length || 0 });
                return (response.results || []).map((r) => ({ ...r, query }));
            } catch (error: any) {
                const errMsg = error instanceof Error ? error.message : String(error);
                console.error(`[STAGE 6: Tavily request failed]: query "${query}":`, { message: errMsg });
                lastApiErrorMessage = errMsg;
                return [];
            }
        });

        // Use Promise.allSettled for robust concurrent discovery timeout isolation
        const resultsArray = await Promise.allSettled(searchPromises);
        for (const res of resultsArray) {
            if (res.status === 'fulfilled') {
                allSearchResults.push(...res.value);
            }
        }

        console.error(`[STAGE 6: Collected ${allSearchResults.length} total raw Tavily search items.]`);

        if (allSearchResults.length === 0) {
            if (lastApiErrorMessage) {
                return {
                    competitors: [],
                    status: 'error',
                    message: lastApiErrorMessage,
                    error: lastApiErrorMessage
                };
            }
            return {
                competitors: [],
                status: 'no_results',
                message: 'No competitors were found for this startup idea.'
            };
        }

        const BLOCKLIST_DOMAINS = [
            'github.com', 'medium.com', 'reddit.com', 'quora.com', 'wikipedia.org', 
            'youtube.com', 'linkedin.com', 'twitter.com', 'facebook.com', 
            'crunchbase.com', 'producthunt.com', 'tracxn.com', 'ycombinator.com', 
            'glassdoor.com', 'indeed.com', 'upwork.com', 'fiverr.com', 'google.com', 
            'microsoft.com', 'apple.com', 'amazon.com', 'wikipedia.com', 'substack.com',
            'hashnode.com', 'dev.to', 'gitbook.io', 'npmtrends.com', 'npmpackage.com',
            'g2.com', 'capterra.com', 'trustradius.com', 'alternativeto.net',
            'techcrunch.com', 'forbes.com', 'theverge.com', 'news.ycombinator.com',
            'softwareadvice.com', 'getapp.com', 'sourceforge.net', 'slant.co', 'saashub.com'
        ];

        const competitorsMap = new Map<string, TempCompetitor>();

        allSearchResults.forEach((res, index) => {
            if (!res.url || !res.title) return;

            try {
                const parsedUrl = new URL(res.url);
                const hostname = parsedUrl.hostname.toLowerCase();
                const domain = hostname.replace('www.', '');

                const isBlocked = BLOCKLIST_DOMAINS.some(blocked => domain === blocked || domain.endsWith('.' + blocked));
                if (isBlocked) return;

                const rootWebsite = `${parsedUrl.protocol}//${parsedUrl.hostname}`;

                let brandName = domain.split('.')[0];
                brandName = brandName.charAt(0).toUpperCase() + brandName.slice(1);
                
                const delimiters = [' - ', ' | ', ' : ', ' – ', '—'];
                for (const delim of delimiters) {
                    if (res.title.includes(delim)) {
                        const part = res.title.split(delim)[0].trim();
                        if (part.length > 2 && part.length < 30 && /^[a-zA-Z0-9\s.'&-]+$/.test(part)) {
                            brandName = part;
                            break;
                        }
                    }
                }

                const snippet = res.content || '';
                const baseScore = res.score || (1.0 - (index / allSearchResults.length) * 0.5);

                const existing = competitorsMap.get(domain);
                if (existing) {
                    existing.score += 0.5;
                    if (res.query) existing.queryMatches.add(res.query);
                } else {
                    const reason = `Discovered via search results in the ${category || 'startup'} space matching core problem and target audience.`;
                    competitorsMap.set(domain, {
                        name: brandName,
                        website: rootWebsite,
                        description: snippet.length > 200 ? snippet.substring(0, 197) + '...' : snippet,
                        reason,
                        score: baseScore,
                        queryMatches: new Set(res.query ? [res.query] : [])
                    });
                }
            } catch (e) {
                // Ignore parsing errors for malformed URLs
            }
        });

        const deterministicCompetitors: Competitor[] = Array.from(competitorsMap.values())
            .sort((a, b) => b.score - a.score)
            .slice(0, 8)
            .map(c => ({
                name: c.name,
                website: c.website,
                description: c.description,
                reason: c.reason
            }));

        console.error(`[STAGE 6: Deterministically identified ${deterministicCompetitors.length} competitors.]`);

        if (deterministicCompetitors.length === 0) {
            return {
                competitors: [],
                status: 'no_results',
                message: 'No competitors were found for this startup idea.'
            };
        }

        try {
            console.error('[STAGE 7: Gemini request starting for competitor enrichment...]');
            const extractionPrompt = `You are an elite startup competitive analyst. Your task is to FILTER, SCORE, and ENRICH the provided raw competitor list.
            
Startup Idea Details:
- Category: ${category}
- Core Problem: ${coreProblem}
- Target Audience: ${targetAudience}
- Value Proposition: ${valueProposition}

Raw Competitors List (May contain irrelevant companies):
${JSON.stringify(deterministicCompetitors, null, 2)}

CRITICAL INSTRUCTIONS:
1. AGGRESSIVE FILTERING: Reject any competitor that does NOT directly compete or solve the exact same customer problem. Remove generic SaaS, directories, blogs, or companies solving tangentially related issues.
2. RELEVANCE SCORING (Internal): Evaluate each candidate. If it does not directly compete, remove it completely.
3. SELECTION: Return at most 5 highly relevant competitors. It is much better to return 0 or 1 highly relevant competitor than 5 weak/generic competitors.
4. ANTI-HALLUCINATION: If relevance cannot be justified, drop the company completely. Never invent companies.
5. REASONING: For each selected competitor, write a highly specific 'reason' explaining exactly how their product offering overlaps with the startup idea (max 2 sentences).

Keep the name and website exactly as provided for those you keep. Return the response strictly adhering to the requested JSON schema.`;

            const geminiResult = await this.geminiService.generateStructuredOutput(
                extractionPrompt,
                DiscoverCompetitorsOutputSchema
            );
            
            console.error('[STAGE 8: Gemini response received]:', JSON.stringify(geminiResult, null, 2));

            if (geminiResult && Array.isArray(geminiResult.competitors) && geminiResult.competitors.length > 0) {
                console.error(`[STAGE 10: Successfully enriched ${geminiResult.competitors.length} competitors using Gemini.]`);
                return {
                    competitors: geminiResult.competitors as Competitor[],
                    status: 'success',
                    message: 'Competitors discovered successfully.'
                };
            }
        } catch (err: any) {
            console.warn('[STAGE 8: Gemini enrichment skipped or failed. Falling back to deterministic results]:', err.message);
        }

        return {
            competitors: deterministicCompetitors,
            status: 'success',
            message: 'Competitors discovered successfully.'
        };
    }
}
