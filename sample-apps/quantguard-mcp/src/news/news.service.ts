import { Injectable } from '@nitrostack/core';
import { DbService } from '../db/db.service.js';

export interface EconomicEvent {
  event: string;
  impact: 'low' | 'medium' | 'high';
  scheduledTime: number;
  forecast?: string;
  previous?: string;
}

export interface BreakingNews {
  headline: string;
  source: string;
  url?: string;
  timestamp: number;
  relevance: number;
}

export interface NewsState {
  ticker: string;
  economicCalendar: EconomicEvent[];
  breakingNews: BreakingNews[];
  sentimentScore: number;
  sentimentBreakdown: {
    bullish: number;
    bearish: number;
    neutral: number;
  };
  timestamp: number;
}

@Injectable({ deps: [DbService] })
export class NewsService {
  private bullishKeywords = [
    'growth', 'profit', 'surge', 'gain', 'upgrade', 'outperform', 
    'bullish', 'expansion', 'beat', 'success', 'innovative', 
    'rising', 'optimism', 'high', 'positive', 'strong', 'revenue'
  ];

  private bearishKeywords = [
    'loss', 'decline', 'fall', 'drop', 'downgrade', 'underperform', 
    'bearish', 'contraction', 'miss', 'failure', 'crisis', 
    'plunge', 'fears', 'deficit', 'negative', 'weak', 'inflation'
  ];

  constructor(private db: DbService) {}

  /**
   * Get news and sentiment state for a ticker
   */
  async getNewsState(ticker: string): Promise<NewsState> {
    const now = Date.now();

    // Mock economic calendar events
    const economicCalendar: EconomicEvent[] = [
      {
        event: 'FOMC Interest Rate Decision',
        impact: 'high',
        scheduledTime: now + 3600000 * 4, // 4 hours from now
        forecast: '5.25%',
        previous: '5.25%'
      },
      {
        event: 'US Core CPI YoY',
        impact: 'high',
        scheduledTime: now - 3600000 * 2, // 2 hours ago
        forecast: '3.2%',
        previous: '3.1%'
      }
    ];

    // Mock breaking news headlines depending on ticker
    const headlines: string[] = [
      `${ticker} reports quarterly revenue surge of 15% YoY, beating analyst estimates`,
      `New regulatory guidelines cause market volatility for crypto assets like ${ticker}`,
      `Institutional trading desks increase position sizes in ${ticker} amid growth optimism`,
      `Fears of inflation contraction trigger moderate profit taking on ${ticker}`
    ];

    const breakingNews: BreakingNews[] = headlines.map((headline, idx) => ({
      headline,
      source: idx % 2 === 0 ? 'Bloomberg' : 'Reuters',
      url: `https://finance.yahoo.com/quote/${ticker}`,
      timestamp: now - idx * 1800000,
      relevance: 1.0 - idx * 0.15
    }));

    // Simple keyword sentiment lexicon
    let bullishCount = 0;
    let bearishCount = 0;
    let neutralCount = 0;

    for (const news of breakingNews) {
      const tokens = news.headline.toLowerCase().split(/[^a-z]+/);
      let matches = 0;
      
      for (const token of tokens) {
        if (this.bullishKeywords.includes(token)) {
          bullishCount++;
          matches++;
        } else if (this.bearishKeywords.includes(token)) {
          bearishCount++;
          matches++;
        }
      }
      if (matches === 0) {
        neutralCount++;
      }
    }

    const totalKeywords = bullishCount + bearishCount;
    const sentimentScore = totalKeywords > 0 
      ? (bullishCount - bearishCount) / totalKeywords 
      : 0.0;

    const state: NewsState = {
      ticker,
      economicCalendar,
      breakingNews,
      sentimentScore: Number(sentimentScore.toFixed(2)),
      sentimentBreakdown: {
        bullish: bullishCount,
        bearish: bearishCount,
        neutral: neutralCount
      },
      timestamp: now
    };

    // Log news stories to DB for history
    this.persistNews(breakingNews);

    return state;
  }

  /**
   * Persist news stories to database
   */
  private persistNews(newsItems: BreakingNews[]) {
    for (const item of newsItems) {
      try {
        this.db.run(
          `INSERT OR IGNORE INTO news (id, title, content, source, url, published_at, fetched_at)
           VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          [
            `${item.source}_${item.timestamp}`,
            item.headline,
            item.headline,
            item.source,
            item.url || '',
            new Date(item.timestamp).toISOString()
          ]
        );
      } catch (e) {
        // Silently swallow DB conflicts
      }
    }
  }
}
