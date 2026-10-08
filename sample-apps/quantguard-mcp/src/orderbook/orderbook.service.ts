import { Injectable } from '@nitrostack/core';
import { DbService } from '../db/db.service.js';
import { MarketDataService } from '../market/market-data.service.js';

export interface OrderBookLevel {
  price: number;
  quantity: number;
}

export interface OrderBookState {
  ticker: string;
  bidLevels: OrderBookLevel[];
  askLevels: OrderBookLevel[];
  marketDepth: {
    bidDepth: number;
    askDepth: number;
  };
  orderImbalance: number;
  liquidityScore: number;
  timestamp: number;
}

@Injectable({ deps: [DbService, MarketDataService] })
export class OrderbookService {
  private orderbooks = new Map<string, OrderBookState>();

  constructor(
    private db: DbService,
    private marketDataService: MarketDataService
  ) {}

  /**
   * Get or generate orderbook for a symbol
   */
  async getOrderbook(ticker: string): Promise<OrderBookState> {
    // If we have a cached/updated orderbook in memory, return it
    const cached = this.orderbooks.get(ticker);
    const now = Date.now();
    
    // Cache TTL of 1 second for orderbook
    if (cached && now - cached.timestamp < 1000) {
      return cached;
    }

    // Try to get price from MarketDataService to generate a realistic orderbook
    let midPrice = 100.0;
    try {
      midPrice = await this.marketDataService.getPrice(ticker);
    } catch (e) {
      // Fallback if price fetch fails
    }

    // Generate simulated orderbook levels
    const bidLevels: OrderBookLevel[] = [];
    const askLevels: OrderBookLevel[] = [];
    
    const spread = midPrice * 0.0005; // 5 bps spread
    const bestBid = midPrice - spread / 2;
    const bestAsk = midPrice + spread / 2;

    let bidDepth = 0;
    let askDepth = 0;

    for (let i = 0; i < 10; i++) {
      const bidPrice = bestBid - i * (midPrice * 0.0002);
      const askPrice = bestAsk + i * (midPrice * 0.0002);
      const bidQty = Math.round((500 + Math.random() * 1000) * (10 - i)) / 10;
      const askQty = Math.round((500 + Math.random() * 1000) * (10 - i)) / 10;

      bidLevels.push({ price: Number(bidPrice.toFixed(4)), quantity: bidQty });
      askLevels.push({ price: Number(askPrice.toFixed(4)), quantity: askQty });

      bidDepth += bidQty;
      askDepth += askQty;
    }

    const orderImbalance = (bidDepth - askDepth) / (bidDepth + askDepth);
    
    // Liquidity score 0-100 based on spread and depth
    // Tighter spread and higher depth -> higher score
    const spreadBps = (spread / midPrice) * 10000;
    const spreadScore = Math.max(0, 100 - spreadBps * 5); // 0 spread = 100 points, 20 bps = 0 points
    const depthScore = Math.min(100, (bidDepth + askDepth) / 100);
    const liquidityScore = Math.round(spreadScore * 0.6 + depthScore * 0.4);

    const state: OrderBookState = {
      ticker,
      bidLevels,
      askLevels,
      marketDepth: {
        bidDepth: Number(bidDepth.toFixed(2)),
        askDepth: Number(askDepth.toFixed(2))
      },
      orderImbalance: Number(orderImbalance.toFixed(4)),
      liquidityScore,
      timestamp: now
    };

    this.orderbooks.set(ticker, state);
    
    // Persist snapshot to database
    this.saveSnapshot(state);

    return state;
  }

  /**
   * Update orderbook in-memory (called by Binance WS or DemoDataService)
   */
  updateOrderbook(ticker: string, state: Omit<OrderBookState, 'timestamp'>): void {
    const fullState: OrderBookState = {
      ...state,
      timestamp: Date.now()
    };
    this.orderbooks.set(ticker, fullState);
    this.saveSnapshot(fullState);
  }

  /**
   * Save snapshot to orderbook_snapshots table
   */
  private saveSnapshot(state: OrderBookState): void {
    try {
      this.db.run(
        `INSERT INTO orderbook_snapshots (id, symbol, bids, asks, timestamp) 
         VALUES (?, ?, ?, ?, ?)`,
        [
          `${state.ticker}_${state.timestamp}`,
          state.ticker,
          JSON.stringify(state.bidLevels),
          JSON.stringify(state.askLevels),
          new Date(state.timestamp).toISOString()
        ]
      );
    } catch (error) {
      // Silently catch database write errors during fast WS feeds
    }
  }
}
