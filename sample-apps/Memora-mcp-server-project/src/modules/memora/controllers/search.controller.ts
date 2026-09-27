import { ControllerDecorator as Controller, ToolDecorator as Tool } from '@nitrostack/core';
import { z } from 'zod';

@Controller('search')
export class SearchController {
    @Tool({
        name: 'web_search',
        description: 'Performs a web search to find academic papers, MIT OpenCourseWare material, or recent research to answer a query.',
        inputSchema: z.object({
            query: z.string().describe('The academic search query')
        })
    })
    async searchWeb(params: { query: string }) {
        const TAVILY_API_KEY = process.env.TAVILY_API_KEY;
        
        if (!TAVILY_API_KEY) {
            throw new Error("Missing TAVILY_API_KEY in environment variables.");
        }

        const tavilyRes = await fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${TAVILY_API_KEY}`
            },
            body: JSON.stringify({
                query: params.query,
                search_depth: 'basic',
                include_answer: true,
                max_results: 5
            })
        });

        if (!tavilyRes.ok) {
            throw new Error(`Tavily search failed: ${tavilyRes.statusText}`);
        }

        const searchData = await tavilyRes.json() as any;

        return {
            query: params.query,
            answer: searchData.answer,
            results: searchData.results?.map((r: any) => ({
                title: r.title,
                url: r.url,
                content: r.content
            })) || [],
            success: true
        };
    }
}
