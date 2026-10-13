import { Injectable } from '@nitrostack/core';
import { coerceNumber } from '../../common/validate.js';
import { loadMarketEvents, MarketEvent } from './news.data.js';

export interface NewsFilters {
    sector?: string;
    sentiment?: string;
    impact?: string;
    index?: string;
    company?: string;
    from?: string; // ISO date
    to?: string;   // ISO date
    query?: string; // headline contains
    limit?: number;
}

export interface SentimentSummary {
    total: number;
    bySentiment: Record<string, number>;
    byImpact: Record<string, number>;
    topSectors: Array<{ sector: string; count: number }>;
    netSentiment: 'bullish' | 'bearish' | 'neutral';
}

@Injectable()
export class NewsService {
    private readonly events: MarketEvent[] = loadMarketEvents();

    /** Total events loaded (0 if the dataset file is missing). */
    count(): number {
        return this.events.length;
    }

    /** Filter, sort newest-first, and limit the events. */
    query(filters: NewsFilters = {}): MarketEvent[] {
        const eq = (a: string, b?: string) => !b || a.toLowerCase() === b.toLowerCase();
        const has = (a: string, b?: string) => !b || a.toLowerCase().includes(b.toLowerCase());

        let out = this.events.filter((e) =>
            eq(e.sentiment, filters.sentiment) &&
            eq(e.impact, filters.impact) &&
            has(e.sector, filters.sector) &&
            has(e.index, filters.index) &&
            has(e.company, filters.company) &&
            has(e.headline, filters.query) &&
            (!filters.from || e.date >= filters.from) &&
            (!filters.to || e.date <= filters.to),
        );

        out = out.sort((a, b) => b.date.localeCompare(a.date));
        const limit = filters.limit != null ? coerceNumber(filters.limit, { min: 1, max: 200, fallback: 20 }) : 20;
        return out.slice(0, limit);
    }

    /** Aggregate sentiment/impact/sector counts for a filtered slice. */
    summary(filters: NewsFilters = {}): SentimentSummary {
        const rows = this.query({ ...filters, limit: 100000 });
        const bySentiment: Record<string, number> = {};
        const byImpact: Record<string, number> = {};
        const bySector: Record<string, number> = {};
        for (const e of rows) {
            bySentiment[e.sentiment] = (bySentiment[e.sentiment] ?? 0) + 1;
            byImpact[e.impact] = (byImpact[e.impact] ?? 0) + 1;
            if (e.sector) bySector[e.sector] = (bySector[e.sector] ?? 0) + 1;
        }
        const pos = bySentiment['Positive'] ?? 0;
        const neg = bySentiment['Negative'] ?? 0;
        const netSentiment = pos > neg * 1.1 ? 'bullish' : neg > pos * 1.1 ? 'bearish' : 'neutral';
        const topSectors = Object.entries(bySector)
            .map(([sector, cnt]) => ({ sector, count: cnt }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 6);
        return { total: rows.length, bySentiment, byImpact, topSectors, netSentiment };
    }
}
