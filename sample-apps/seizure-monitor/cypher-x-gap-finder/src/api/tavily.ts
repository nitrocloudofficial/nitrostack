import { Injectable } from '@nitrostack/core';
import { z } from 'zod';

export const TavilySearchResultSchema = z.object({
    title: z.string(),
    url: z.string(),
    content: z.string(),
    score: z.number().optional()
});

export const TavilySearchResponseSchema = z.object({
    results: z.array(TavilySearchResultSchema)
});

export type TavilySearchResult = z.infer<typeof TavilySearchResultSchema>;
export type TavilySearchResponse = z.infer<typeof TavilySearchResponseSchema>;

@Injectable({ deps: [] })
export class TavilyClient {
    private apiKey: string | undefined;
    private baseUrl = 'https://api.tavily.com/search';

    constructor() {
        this.apiKey = process.env.TAVILY_API_KEY;
    }

    /**
     * Search Tavily using the POST API with retry and timeout logic.
     */
    async search(query: string, maxResults = 5): Promise<TavilySearchResponse> {
        const isPlaceholder = !this.apiKey || this.apiKey.trim() === '' || this.apiKey.includes('your_tavily_key_here');
        
        console.error('[TavilyClient] Starting search query:', {
            query,
            maxResults,
            hasApiKey: !!this.apiKey,
            apiKeyLength: this.apiKey ? this.apiKey.length : 0,
            isPlaceholder
        });

        if (isPlaceholder) {
            console.warn('[TavilyClient] TAVILY_API_KEY environment variable is not defined or is a placeholder. Falling back to high-quality simulated search results.');
            return this.getMockResults(query);
        }

        const maxRetries = 3;
        let attempt = 0;
        let lastError: Error | null = null;

        while (attempt < maxRetries) {
            attempt++;
            try {
                // Fetch with a 10s timeout using AbortController
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000);

                const requestPayload = {
                    api_key: this.apiKey,
                    query,
                    search_depth: 'basic',
                    include_answer: false,
                    include_raw_content: false,
                    max_results: maxResults,
                };

                console.error(`[TavilyClient] Search attempt ${attempt}/${maxRetries} to URL ${this.baseUrl}:`, {
                    url: this.baseUrl,
                    query,
                    maxResults
                });

                const response = await fetch(this.baseUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(requestPayload),
                    signal: controller.signal,
                });

                clearTimeout(timeoutId);

                const responseText = await response.text();
                console.error(`[TavilyClient] Response received (Status ${response.status} ${response.statusText}):`, {
                    status: response.status,
                    statusText: response.statusText,
                    bodySnippet: responseText.substring(0, 500)
                });

                if (!response.ok) {
                    const errorMsg = `Tavily API responded with HTTP status ${response.status}: ${response.statusText} at URL ${this.baseUrl}. Response body: ${responseText}`;
                    const httpError = new Error(errorMsg);
                    lastError = httpError;

                    if (response.status === 429) {
                        if (attempt < maxRetries) {
                            const waitTime = attempt * 1000;
                            console.warn(`[TavilyClient] Rate limited (429) at URL ${this.baseUrl}. Retrying in ${waitTime}ms... (Attempt ${attempt}/${maxRetries})`);
                            await new Promise((resolve) => setTimeout(resolve, waitTime));
                            continue;
                        }
                    }
                    throw httpError;
                }

                let json: any;
                try {
                    json = JSON.parse(responseText);
                } catch (jsonErr: any) {
                    throw new Error(`Failed to parse Tavily response as JSON: ${jsonErr.message}. Raw response: ${responseText}`);
                }
                
                // Validate response schema
                const validated = TavilySearchResponseSchema.safeParse(json);
                if (!validated.success) {
                    console.error('[TavilyClient] Zod schema validation failed for response:', {
                        errors: validated.error.issues,
                        rawResponse: json
                    });
                    throw new Error(`Invalid response schema from Tavily API: ${validated.error.message}`);
                }

                return validated.data;
            } catch (err: any) {
                lastError = err instanceof Error ? err : new Error(String(err));
                console.error(`[TavilyClient] Search attempt ${attempt}/${maxRetries} failed:`, {
                    message: lastError.message,
                    stack: lastError.stack
                });
                
                if (attempt < maxRetries) {
                    const waitTime = attempt * 500;
                    await new Promise((resolve) => setTimeout(resolve, waitTime));
                }
            }
        }

        const finalError = lastError || new Error(`Tavily search failed for all ${maxRetries} attempts`);
        console.error('[TavilyClient] All search attempts failed. Throwing exception to service layer.', {
            message: finalError.message,
            stack: finalError.stack
        });
        throw finalError;
    }

    /**
     * Simulated mock responses for testing without an API key.
     */
    private getMockResults(query: string): TavilySearchResponse {
        const lowerQuery = query.toLowerCase();
        
        // Extract meaningful keywords from query for dynamic generation
        const words = query.split(' ').filter(w => w.length > 3 && !['startups', 'solving', 'companies', 'competitors', 'alternatives'].includes(w.toLowerCase()));
        const topic = words.length > 0 ? words.join(' ') : 'Startup';
        const formattedTopic = topic.charAt(0).toUpperCase() + topic.slice(1);
        const domainSlug = words.join('').toLowerCase().replace(/[^a-z0-9]/g, '');

        return {
            results: [
                {
                    title: `${formattedTopic} Pro - Enterprise Solution`,
                    url: `https://${domainSlug || 'competitor'}pro.com`,
                    content: `Leading platform providing comprehensive ${topic} solutions for modern businesses and individuals. Featuring advanced analytics, scalable infrastructure, and seamless user experience.`,
                    score: 0.98
                },
                {
                    title: `${formattedTopic}ify - The modern alternative`,
                    url: `https://${domainSlug || 'competitor'}ify.io`,
                    content: `A modern, fast, and secure alternative in the ${topic} space. Designed specifically for our target audience with transparent pricing and powerful API integrations.`,
                    score: 0.95
                },
                {
                    title: `Open${formattedTopic} - Open Source Platform`,
                    url: `https://open${domainSlug || 'competitor'}.org`,
                    content: `The community-driven open source alternative for ${topic}. Self-host or use our managed cloud. Fully customizable and developer-friendly.`,
                    score: 0.88
                }
            ]
        };
    }
}
