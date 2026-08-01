import { ToolDecorator as Tool, Widget, ResourceDecorator as Resource, ExecutionContext, Injectable, z } from '@nitrostack/core';
import { NewsService } from './news.service.js';

const NewsSchema = z.object({
    sector: z.string().optional().describe('Filter by sector (e.g. "Technology", "Energy")'),
    sentiment: z.enum(['Positive', 'Negative', 'Neutral']).optional().describe('Filter by sentiment'),
    impact: z.enum(['High', 'Medium', 'Low']).optional().describe('Filter by impact level'),
    index: z.string().optional().describe('Filter by market index (e.g. "NSE Nifty", "Nasdaq")'),
    company: z.string().optional().describe('Filter by related company'),
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('Only events on/after this date (ISO)'),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('Only events on/before this date (ISO)'),
    query: z.string().optional().describe('Headline contains this text'),
    limit: z.number().int().min(1).max(200).optional().describe('Max events to return (default 20)'),
});

@Injectable({ deps: [NewsService] })
export class NewsTools {
    constructor(private readonly newsService: NewsService) { }

    @Tool({
        name: 'get_market_news',
        description:
            'Search a market news & events dataset — filter by sector, sentiment, impact, index, company, date range, ' +
            'or headline text. Returns the matching events, newest first. (Curated dataset, not a live news feed.)',
        inputSchema: NewsSchema,
        examples: {
            request: { sector: 'Technology', sentiment: 'Negative', limit: 5 },
            response: {
                count: 5,
                events: [{ date: '2025-07-21', headline: 'Massive stock buyback…', index: 'NSE Nifty', sentiment: 'Negative', impact: 'Low' }],
            },
        },
    })
    @Widget('market-news')
    async getMarketNews(args: z.infer<typeof NewsSchema>, ctx: ExecutionContext) {
        ctx.logger.info('Querying market news', { sector: args.sector, sentiment: args.sentiment });
        const events = this.newsService.query(args);
        const summary = this.newsService.summary(args);
        return { count: events.length, totalMatched: summary.total, summary, events };
    }

    @Tool({
        name: 'get_market_sentiment',
        description:
            'Summarize sentiment across the market news & events dataset (optionally filtered by sector/index/date). ' +
            'Returns counts by sentiment and impact, the top sectors in the news, and a net bullish/bearish read.',
        inputSchema: z.object({
            sector: z.string().optional(),
            index: z.string().optional(),
            from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
            to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        }),
        examples: {
            request: { sector: 'Technology' },
            response: { total: 240, netSentiment: 'bearish', bySentiment: { Positive: 70, Negative: 110, Neutral: 60 } },
        },
    })
    async getMarketSentiment(
        args: { sector?: string; index?: string; from?: string; to?: string },
        ctx: ExecutionContext,
    ) {
        ctx.logger.info('Summarizing market sentiment', { sector: args.sector, index: args.index });
        return this.newsService.summary(args);
    }

    @Resource({
        uri: 'finance://market/events',
        name: 'Market News & Events (recent)',
        description: 'The most recent entries from the market news & events dataset (date, headline, index, sentiment, impact).',
        mimeType: 'application/json',
    })
    async recentEvents(_uri: string, _ctx: ExecutionContext) {
        const events = this.newsService.query({ limit: 50 });
        return { source: 'financial_news_events dataset (provided)', count: events.length, events };
    }
}
