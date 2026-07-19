import { ResourceDecorator as Resource, ExecutionContext, Injectable } from '@nitrostack/core';
import { OrderbookService } from './orderbook.service.js';

@Injectable({ deps: [OrderbookService] })
export class OrderBookResource {
  constructor(private orderbookService: OrderbookService) {}

  @Resource({
    name: 'orderbook',
    description: 'Get current order book depth and imbalance metrics for a ticker',
    uri: 'orderbook://{ticker}'
  })
  async getOrderBook(
    { ticker }: { ticker: string },
    ctx: ExecutionContext
  ) {
    try {
      const state = await this.orderbookService.getOrderbook(ticker);
      return state;
    } catch (error) {
      ctx.logger.error(`Failed to fetch orderbook for ${ticker}`, { error: String(error) });
      throw error;
    }
  }
}
