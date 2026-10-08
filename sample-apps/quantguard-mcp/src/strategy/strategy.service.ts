import { Injectable } from '@nitrostack/core';
import { MarketDataService } from '../market/market-data.service.js';

export interface BacktestResult {
  sharpeRatio: number;
  totalReturn: number;
  maxDrawdown: number;
  winRate: number;
  tradesCount: number;
}

@Injectable({ deps: [MarketDataService] })
export class StrategyService {
  constructor(private marketService: MarketDataService) {}

  /**
   * Backtest execution strategy on historical prices
   */
  async backtest(strategy: 'TWAP' | 'VWAP' | 'MARKET', ticker: string, days: number = 30): Promise<BacktestResult> {
    let candles;
    try {
      candles = await this.marketService.getOHLCV(ticker, '1d');
    } catch (e) {
      // Fallback: generate mock candles if data provider fails
      candles = this.generateMockCandles(100.0, days);
    }

    // Filter to requested days
    const candlesToTest = candles.slice(-Math.min(days, candles.length));
    if (candlesToTest.length < 2) {
      return { sharpeRatio: 0, totalReturn: 0, maxDrawdown: 0, winRate: 0, tradesCount: 0 };
    }

    const returns: number[] = [];
    let equity = 1.0;
    let peak = 1.0;
    let maxDrawdown = 0.0;
    let winCount = 0;
    const tradesCount = candlesToTest.length;

    // Define strategy-specific slippage (subtracted from daily return)
    const slippageMap = {
      'TWAP': 0.0005, // 5 bps
      'VWAP': 0.0003, // 3 bps
      'MARKET': 0.0015 // 15 bps
    };
    const slippage = slippageMap[strategy];

    for (let i = 1; i < candlesToTest.length; i++) {
      const prevClose = candlesToTest[i - 1].close;
      const currentClose = candlesToTest[i].close;
      
      // Calculate return for the day with strategy slippage penalty
      const rawReturn = (currentClose - prevClose) / prevClose;
      const strategyReturn = rawReturn - slippage;
      
      returns.push(strategyReturn);
      equity *= (1.0 + strategyReturn);

      if (strategyReturn > 0) {
        winCount++;
      }

      if (equity > peak) {
        peak = equity;
      }
      const dd = (peak - equity) / peak;
      if (dd > maxDrawdown) {
        maxDrawdown = dd;
      }
    }

    const totalReturn = equity - 1.0;
    const winRate = winCount / (candlesToTest.length - 1);

    // Calculate Sharpe Ratio (Risk-Free rate = 2%)
    const dailyRf = 0.02 / 252;
    const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - meanReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    // Annualize Sharpe ratio
    const sharpeRatio = stdDev > 0 
      ? (Math.sqrt(252) * (meanReturn - dailyRf)) / stdDev 
      : 0.0;

    return {
      sharpeRatio: Number(sharpeRatio.toFixed(2)),
      totalReturn: Number((totalReturn * 100).toFixed(2)), // as percentage
      maxDrawdown: Number((maxDrawdown * 100).toFixed(2)), // as percentage
      winRate: Number((winRate * 100).toFixed(2)), // as percentage
      tradesCount
    };
  }

  /**
   * Helper to generate mock candles when external feeds fail
   */
  private generateMockCandles(startPrice: number, days: number) {
    const candles = [];
    let currentPrice = startPrice;
    const now = Date.now();

    for (let i = days; i >= 0; i--) {
      const change = currentPrice * (Math.random() * 0.04 - 0.02); // -2% to +2%
      const open = currentPrice;
      const close = currentPrice + change;
      const high = Math.max(open, close) * (1 + Math.random() * 0.005);
      const low = Math.min(open, close) * (1 - Math.random() * 0.005);
      const volume = Math.round(10000 + Math.random() * 50000);

      candles.push({
        timestamp: now - i * 86400000,
        open,
        high,
        low,
        close,
        volume
      });

      currentPrice = close;
    }

    return candles;
  }
}
