import { z } from '@nitrostack/core';

/**
 * Market Resource Schema
 * market://{ticker}
 */
export const MarketResourceSchema = z.object({
  ticker: z.string().describe('Stock ticker symbol (e.g., AAPL, BTC)'),
  currentPrice: z.number().describe('Current market price'),
  ohlc: z.object({
    open: z.number(),
    high: z.number(),
    low: z.number(),
    close: z.number()
  }).describe('Open, High, Low, Close prices'),
  vwap: z.number().describe('Volume-Weighted Average Price'),
  spread: z.number().describe('Bid-ask spread in basis points'),
  volume: z.number().describe('24h trading volume'),
  marketDepth: z.object({
    bids: z.array(z.tuple([z.number(), z.number()])).describe('[[price, quantity], ...]'),
    asks: z.array(z.tuple([z.number(), z.number()])).describe('[[price, quantity], ...]')
  }).describe('Top N bid/ask levels'),
  timestamp: z.number().describe('Unix timestamp (ms)')
});

export type MarketResource = z.infer<typeof MarketResourceSchema>;

/**
 * OrderBook Resource Schema
 * orderbook://{ticker}
 */
export const OrderBookResourceSchema = z.object({
  ticker: z.string().describe('Stock ticker symbol'),
  bidLevels: z.array(z.object({
    price: z.number(),
    quantity: z.number()
  })).describe('Bid levels [price, quantity]'),
  askLevels: z.array(z.object({
    price: z.number(),
    quantity: z.number()
  })).describe('Ask levels [price, quantity]'),
  marketDepth: z.object({
    bidDepth: z.number().describe('Total bid-side quantity'),
    askDepth: z.number().describe('Total ask-side quantity')
  }).describe('Aggregate depth'),
  orderImbalance: z.number().describe('(buyVolume - sellVolume) / (buyVolume + sellVolume), range [-1, 1]'),
  liquidityScore: z.number().describe('0-100 score based on spread + depth'),
  timestamp: z.number().describe('Unix timestamp (ms)')
});

export type OrderBookResource = z.infer<typeof OrderBookResourceSchema>;

/**
 * Risk Resource Schema
 * risk://{account}
 */
export const RiskResourceSchema = z.object({
  account: z.string().describe('Account identifier'),
  currentExposure: z.number().describe('Total notional exposure across all positions'),
  pnl: z.number().describe('Unrealized profit/loss'),
  var95: z.number().describe('Value at Risk (95% confidence, historical simulation)'),
  var99: z.number().describe('Value at Risk (99% confidence, historical simulation)'),
  expectedShortfall: z.number().describe('Expected Shortfall (CVaR) at 95%'),
  maxDrawdown: z.number().describe('Maximum drawdown from peak equity'),
  leverage: z.number().describe('Current leverage ratio (exposure / equity)'),
  correlationMatrix: z.record(z.string(), z.record(z.string(), z.number())).describe('Position correlation matrix'),
  suggestedMaxPositionSize: z.number().describe('Recommended max position size given VaR limit'),
  timestamp: z.number().describe('Unix timestamp (ms)')
});

export type RiskResource = z.infer<typeof RiskResourceSchema>;

/**
 * News Resource Schema
 * news://{ticker}
 */
export const NewsResourceSchema = z.object({
  ticker: z.string().describe('Stock ticker symbol'),
  economicCalendar: z.array(z.object({
    event: z.string().describe('Event name (e.g., "Fed Rate Decision")'),
    impact: z.enum(['low', 'medium', 'high']).describe('Expected market impact'),
    scheduledTime: z.number().describe('Unix timestamp (ms)'),
    forecast: z.string().optional().describe('Forecasted value'),
    previous: z.string().optional().describe('Previous value')
  })).describe('Upcoming high-impact economic events'),
  breakingNews: z.array(z.object({
    headline: z.string(),
    source: z.string(),
    url: z.string().optional(),
    timestamp: z.number().describe('Unix timestamp (ms)'),
    relevance: z.number().describe('0-1 relevance score to ticker')
  })).describe('Recent breaking news'),
  sentimentScore: z.number().describe('Aggregate sentiment -1 (bearish) to +1 (bullish), via keyword lexicon'),
  sentimentBreakdown: z.object({
    bullish: z.number().describe('Count of bullish keywords'),
    bearish: z.number().describe('Count of bearish keywords'),
    neutral: z.number().describe('Count of neutral keywords')
  }).describe('Sentiment keyword counts'),
  timestamp: z.number().describe('Unix timestamp (ms)')
});

export type NewsResource = z.infer<typeof NewsResourceSchema>;
