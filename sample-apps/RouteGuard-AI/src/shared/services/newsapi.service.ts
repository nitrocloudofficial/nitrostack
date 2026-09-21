import { Injectable, ConfigService } from '@nitrostack/core';
import { z } from 'zod';

// NewsAPI response schemas
const NewsArticleSchema = z.object({
  source: z.object({ id: z.string().nullable(), name: z.string() }),
  author: z.string().nullable(),
  title: z.string(),
  description: z.string().nullable(),
  url: z.string(),
  urlToImage: z.string().nullable(),
  publishedAt: z.string(),
  content: z.string().nullable(),
});

const NewsResponseSchema = z.object({
  status: z.string(),
  totalResults: z.number(),
  articles: z.array(NewsArticleSchema),
});

export type NewsArticle = z.infer<typeof NewsArticleSchema>;
export type NewsResponse = z.infer<typeof NewsResponseSchema>;

@Injectable({ deps: [ConfigService] })
export class NewsAPIService {
  private apiKey: string;
  private baseUrl = 'https://newsapi.org/v2';

  constructor(private config: ConfigService) {
    this.apiKey = this.config.get('NEWSAPI_KEY') || 'demo';
  }

  /**
   * Search for threat-related news articles
   * Keywords: typhoon, hurricane, port strike, congestion, geopolitical, sanctions, embargo
   */
  async searchThreats(keywords: string[], limit = 20): Promise<NewsArticle[]> {
    try {
      const query = keywords.join(' OR ');
      const url = new URL(`${this.baseUrl}/everything`);
      url.searchParams.append('q', query);
      url.searchParams.append('sortBy', 'publishedAt');
      url.searchParams.append('language', 'en');
      url.searchParams.append('pageSize', String(limit));
      url.searchParams.append('apiKey', this.apiKey);

      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`NewsAPI error: ${response.statusText}`);
      }

      const data = await response.json();
      const parsed = NewsResponseSchema.parse(data);
      return parsed.articles;
    } catch (error) {
      // Fallback to mock data if API fails
      return this.getMockArticles();
    }
  }

  /**
   * Search for supply chain disruption news
   */
  async searchSupplyChainDisruptions(): Promise<NewsArticle[]> {
    const keywords = [
      'supply chain disruption',
      'port congestion',
      'shipping delay',
      'logistics crisis',
      'freight rate',
      'container shortage',
    ];
    return this.searchThreats(keywords, 30);
  }

  /**
   * Search for weather-related threats
   */
  async searchWeatherThreats(): Promise<NewsArticle[]> {
    const keywords = [
      'typhoon',
      'hurricane',
      'cyclone',
      'storm',
      'flooding',
      'extreme weather',
      'port closure',
    ];
    return this.searchThreats(keywords, 20);
  }

  /**
   * Search for geopolitical threats
   */
  async searchGeopoliticalThreats(): Promise<NewsArticle[]> {
    const keywords = [
      'sanctions',
      'embargo',
      'trade war',
      'geopolitical tension',
      'border closure',
      'political crisis',
    ];
    return this.searchThreats(keywords, 20);
  }

  /**
   * Search for carrier/logistics company news
   */
  async searchCarrierNews(carrierName: string): Promise<NewsArticle[]> {
    return this.searchThreats([carrierName, 'shipping', 'logistics'], 15);
  }

  /**
   * Mock articles for fallback/demo
   */
  private getMockArticles(): NewsArticle[] {
    return [
      {
        source: { id: 'bbc-news', name: 'BBC News' },
        author: 'Reuters',
        title: 'Typhoon Noru approaches Shanghai port, shipping delays expected',
        description:
          'Major typhoon system moving toward Shanghai port. Port authorities warn of potential 3-5 day delays.',
        url: 'https://example.com/typhoon-noru',
        urlToImage: 'https://example.com/typhoon.jpg',
        publishedAt: new Date().toISOString(),
        content:
          'Typhoon Noru is expected to reach Shanghai port within 48 hours. Port operations may be suspended.',
      },
      {
        source: { id: 'reuters', name: 'Reuters' },
        author: 'AP',
        title: 'Port workers strike in Rotterdam, container handling halted',
        description:
          'Labor dispute leads to strike action at Europe\'s largest port. Thousands of containers affected.',
        url: 'https://example.com/rotterdam-strike',
        urlToImage: 'https://example.com/strike.jpg',
        publishedAt: new Date(Date.now() - 3600000).toISOString(),
        content:
          'Rotterdam port workers have begun strike action over wage disputes. Container handling has been halted.',
      },
    ];
  }
}
