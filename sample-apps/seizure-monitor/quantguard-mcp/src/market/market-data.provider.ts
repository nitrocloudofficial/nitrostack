/**
 * MarketDataProvider interface — swappable market data sources
 * 
 * Implementations:
 * - YahooFinanceProvider (default, free, no auth)
 * - PolygonProvider (premium, richer orderbook data)
 * - AlphaVantageProvider (free tier, simpler API)
 */
export interface MarketDataProvider {
  /**
   * Get current price for a symbol
   */
  getPrice(symbol: string): Promise<number>;

  /**
   * Get OHLCV (Open, High, Low, Close, Volume) data
   */
  getOHLCV(symbol: string, interval: string): Promise<OHLCV[]>;

  /**
   * Get orderbook snapshot (if available)
   */
  getOrderbook?(symbol: string): Promise<Orderbook>;

  /**
   * Get recent trades (if available)
   */
  getTrades?(symbol: string, limit?: number): Promise<Trade[]>;
}

export interface OHLCV {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Orderbook {
  symbol: string;
  bids: [number, number][]; // [price, quantity]
  asks: [number, number][]; // [price, quantity]
  timestamp: number;
}

export interface Trade {
  id: string;
  symbol: string;
  price: number;
  quantity: number;
  side: 'buy' | 'sell';
  timestamp: number;
}
