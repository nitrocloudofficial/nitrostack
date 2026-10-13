import { Injectable, Inject } from '@nitrostack/core';
import { YahooFinanceProvider } from './providers/yahoo-finance.provider.js';
import { MarketDataProvider, OHLCV, Orderbook } from './market-data.provider.js';

/**
 * Cache entry for market data
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // milliseconds
}

/**
 * MarketDataService — fetches and caches market data from swappable providers
 * 
 * Features:
 * - Pluggable provider (Yahoo Finance, Polygon, etc.)
 * - In-memory cache with TTL (default 2s for price, 5s for OHLCV)
 * - Rate-limit protection via cache
 */
@Injectable({ deps: [YahooFinanceProvider] })
export class MarketDataService {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly PRICE_CACHE_TTL = 2000; // 2 seconds
  private readonly OHLCV_CACHE_TTL = 5000; // 5 seconds
  private readonly ORDERBOOK_CACHE_TTL = 1000; // 1 second

  constructor(private provider: MarketDataProvider) {}

  /**
   * Get current price with caching
   */
  async getPrice(ticker: string): Promise<number> {
    const cacheKey = `price:${ticker}`;
    const cached = this.getCached<number>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    const price = await this.provider.getPrice(ticker);
    this.setCached(cacheKey, price, this.PRICE_CACHE_TTL);
    return price;
  }

  /**
   * Get OHLCV data with caching
   */
  async getOHLCV(ticker: string, interval: string = '1d'): Promise<OHLCV[]> {
    const cacheKey = `ohlcv:${ticker}:${interval}`;
    const cached = this.getCached<OHLCV[]>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    const ohlcv = await this.provider.getOHLCV(ticker, interval);
    this.setCached(cacheKey, ohlcv, this.OHLCV_CACHE_TTL);
    return ohlcv;
  }

  /**
   * Get orderbook snapshot with caching
   */
  async getOrderbook(ticker: string): Promise<Orderbook> {
    const cacheKey = `orderbook:${ticker}`;
    const cached = this.getCached<Orderbook>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    if (!this.provider.getOrderbook) {
      throw new Error(`Orderbook not supported by provider`);
    }

    const orderbook = await this.provider.getOrderbook(ticker);
    this.setCached(cacheKey, orderbook, this.ORDERBOOK_CACHE_TTL);
    return orderbook;
  }

  /**
   * Calculate VWAP from OHLCV data
   * VWAP = sum(typical_price * volume) / sum(volume)
   * where typical_price = (high + low + close) / 3
   */
  async getVWAP(ticker: string, interval: string = '1d'): Promise<number> {
    const ohlcv = await this.getOHLCV(ticker, interval);
    if (ohlcv.length === 0) {
      throw new Error(`No OHLCV data for ${ticker}`);
    }

    let numerator = 0;
    let denominator = 0;

    for (const candle of ohlcv) {
      const typicalPrice = (candle.high + candle.low + candle.close) / 3;
      numerator += typicalPrice * candle.volume;
      denominator += candle.volume;
    }

    return denominator > 0 ? numerator / denominator : 0;
  }

  /**
   * Calculate realized volatility (standard deviation of returns)
   */
  async getRealizedVolatility(ticker: string, interval: string = '1d'): Promise<number> {
    const ohlcv = await this.getOHLCV(ticker, interval);
    if (ohlcv.length < 2) {
      return 0;
    }

    // Calculate log returns
    const returns: number[] = [];
    for (let i = 1; i < ohlcv.length; i++) {
      const ret = Math.log(ohlcv[i].close / ohlcv[i - 1].close);
      returns.push(ret);
    }

    // Calculate standard deviation
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
    return Math.sqrt(variance);
  }

  /**
   * Calculate bid-ask spread in basis points
   * Spread (bps) = (ask - bid) / mid * 10000
   */
  async getSpread(ticker: string): Promise<number> {
    try {
      const orderbook = await this.getOrderbook(ticker);
      if (orderbook.bids.length === 0 || orderbook.asks.length === 0) {
        return 0;
      }

      const bid = orderbook.bids[0][0];
      const ask = orderbook.asks[0][0];
      const mid = (bid + ask) / 2;

      return mid > 0 ? ((ask - bid) / mid) * 10000 : 0;
    } catch {
      // If orderbook not available, return 0
      return 0;
    }
  }

  /**
   * Get market depth (top N levels)
   */
  async getMarketDepth(ticker: string, levels: number = 5): Promise<{ bids: [number, number][]; asks: [number, number][] }> {
    try {
      const orderbook = await this.getOrderbook(ticker);
      return {
        bids: orderbook.bids.slice(0, levels),
        asks: orderbook.asks.slice(0, levels)
      };
    } catch {
      return { bids: [], asks: [] };
    }
  }

  /**
   * Clear cache for a specific key or all keys
   */
  clearCache(key?: string): void {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Get cached value if not expired
   */
  private getCached<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set cache value with TTL
   */
  private setCached<T>(key: string, data: T, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }
}
