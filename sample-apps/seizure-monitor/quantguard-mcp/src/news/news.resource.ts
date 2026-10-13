import { ResourceDecorator as Resource, ExecutionContext, Injectable } from '@nitrostack/core';
import { NewsService } from './news.service.js';

@Injectable({ deps: [NewsService] })
export class NewsResource {
  constructor(private newsService: NewsService) {}

  @Resource({
    name: 'news',
    description: 'Get macro news events, upcoming economic calendar and sentiment breakdown for a ticker',
    uri: 'news://{ticker}'
  })
  async getNews(
    { ticker }: { ticker: string },
    ctx: ExecutionContext
  ) {
    try {
      const state = await this.newsService.getNewsState(ticker);
      return state;
    } catch (error) {
      ctx.logger.error(`Failed to fetch news metrics for ${ticker}`, { error: String(error) });
      throw error;
    }
  }
}
