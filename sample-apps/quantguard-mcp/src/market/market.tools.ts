import { ToolDecorator as Tool, z, ExecutionContext, Injectable } from '@nitrostack/core';
import { MarketDataService } from './market-data.service.js';
import { OrderbookService } from '../orderbook/orderbook.service.js';

// Schemas for input/output
const ScanMarketInput = z.object({
  ticker: z.string().describe('Symbol to scan (e.g. BTCUSDT, AAPL)')
});

const ScanMarketOutput = z.object({
  price: z.number(),
  spread: z.number(),
  volatility: z.number(),
  liquidityScore: z.number(),
  timestamp: z.number()
});

const ToxicityInput = z.object({
  ticker: z.string().describe('Symbol to analyze (e.g. BTCUSDT)'),
  bucketSize: z.number().optional().default(50).describe('Volume bucket size for VPIN calculation')
});

const ToxicityOutput = z.object({
  vpin: z.number(),
  toxicityStatus: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  timestamp: z.number()
});

const SpoofingInput = z.object({
  ticker: z.string().describe('Symbol to monitor for spoofing')
});

const SpoofingOutput = z.object({
  spoofingDetected: z.boolean(),
  direction: z.enum(['BUY', 'SELL', 'NONE']),
  spoofingDetails: z.string(),
  timestamp: z.number()
});

const LiquidityInput = z.object({
  ticker: z.string().describe('Symbol to assess'),
  orderSize: z.number().optional().default(10000).describe('Notional order size in USD to calculate estimated slippage')
});

const LiquidityOutput = z.object({
  liquidityScore: z.number(),
  estimatedSlippagePercent: z.number(),
  depthSummary: z.string(),
  timestamp: z.number()
});

@Injectable({ deps: [MarketDataService, OrderbookService] })
export class MarketTools {
  // Simple state to track spoofing history for demo simulation
  private demoSpoofState = {
    active: false,
    direction: 'NONE' as 'BUY' | 'SELL' | 'NONE',
    details: 'No manipulation detected',
    detectedAt: 0
  };

  constructor(
    private marketService: MarketDataService,
    private orderbookService: OrderbookService
  ) {}

  /**
   * Set spoof state (called by DemoDataService)
   */
  setDemoSpoof(active: boolean, direction: 'BUY' | 'SELL' | 'NONE', details: string) {
    this.demoSpoofState = {
      active,
      direction,
      details,
      detectedAt: active ? Date.now() : 0
    };
  }

  @Tool({
    name: 'scan_market',
    description: 'Get high-level market metrics: price, spread, volatility, and liquidity score',
    inputSchema: ScanMarketInput,
    outputSchema: ScanMarketOutput
  })
  async scanMarket({ ticker }: { ticker: string }, ctx: ExecutionContext) {
    try {
      const price = await this.marketService.getPrice(ticker);
      const volatility = await this.marketService.getRealizedVolatility(ticker, '1d');
      const orderbook = await this.orderbookService.getOrderbook(ticker);
      const liquidityScore = orderbook.liquidityScore;
      
      let spread = 0;
      if (orderbook.bidLevels.length > 0 && orderbook.askLevels.length > 0) {
        const bid = orderbook.bidLevels[0].price;
        const ask = orderbook.askLevels[0].price;
        const mid = (bid + ask) / 2;
        spread = mid > 0 ? ((ask - bid) / mid) * 10000 : 0;
      }

      return {
        price,
        spread: Number(spread.toFixed(2)),
        volatility: Number(volatility.toFixed(6)),
        liquidityScore,
        timestamp: Date.now()
      };
    } catch (error) {
      ctx.logger.error(`Error in scan_market for ${ticker}`, { error: String(error) });
      throw error;
    }
  }

  @Tool({
    name: 'analyze_order_flow_toxicity',
    description: 'Calculate VPIN (Volume-Synchronized Probability of Toxicity) and determine order flow toxicity status',
    inputSchema: ToxicityInput,
    outputSchema: ToxicityOutput
  })
  async analyzeToxicity({ ticker, bucketSize }: { ticker: string; bucketSize?: number }, ctx: ExecutionContext) {
    try {
      const orderbook = await this.orderbookService.getOrderbook(ticker);
      
      // Calculate VPIN approximation based on order imbalance
      // In real markets: VPIN = sum(|V_B - V_S|) / (N * V)
      // We approximate it using order book imbalance and volatility
      const imbalance = Math.abs(orderbook.orderImbalance);
      const vol = await this.marketService.getRealizedVolatility(ticker, '1d');
      
      // Let's add standard volatility scale
      const volatilityFactor = Math.min(1.0, vol * 100);
      
      // Basic VPIN mapping: imbalance * 0.5 + volatilityFactor * 0.5 + noise
      let vpin = imbalance * 0.4 + volatilityFactor * 0.3 + 0.15;
      
      // Adjust VPIN if demo spoof is active (spoofing increases order book toxicity)
      if (ticker === 'BTCUSDT' && this.demoSpoofState.active) {
        vpin += 0.25; // Injected spoof increases toxicity
      }
      
      vpin = Math.min(0.99, Math.max(0.01, vpin));
      
      let toxicityStatus: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
      if (vpin > 0.45) {
        toxicityStatus = 'HIGH';
      } else if (vpin > 0.30) {
        toxicityStatus = 'MEDIUM';
      }

      return {
        vpin: Number(vpin.toFixed(4)),
        toxicityStatus,
        timestamp: Date.now()
      };
    } catch (error) {
      ctx.logger.error(`Error in analyze_order_flow_toxicity for ${ticker}`, { error: String(error) });
      throw error;
    }
  }

  @Tool({
    name: 'detect_spoofing',
    description: 'Monitor order book for manipulative resting orders that cancel quickly to force price action',
    inputSchema: SpoofingInput,
    outputSchema: SpoofingOutput
  })
  async detectSpoofing({ ticker }: { ticker: string }, ctx: ExecutionContext) {
    try {
      // If demo mode has set an active spoofing event, trigger it immediately
      if (ticker === 'BTCUSDT' && this.demoSpoofState.active) {
        return {
          spoofingDetected: true,
          direction: this.demoSpoofState.direction,
          spoofingDetails: this.demoSpoofState.details,
          timestamp: Date.now()
        };
      }

      const orderbook = await this.orderbookService.getOrderbook(ticker);
      
      // Heuristic: if order imbalance is extremely high (> 0.7 or < -0.7), flag possible spoof wall
      const imbalance = orderbook.orderImbalance;
      let spoofingDetected = false;
      let direction: 'BUY' | 'SELL' | 'NONE' = 'NONE';
      let spoofingDetails = 'No order book manipulation detected.';

      if (Math.abs(imbalance) > 0.75) {
        spoofingDetected = true;
        direction = imbalance > 0 ? 'BUY' : 'SELL';
        spoofingDetails = `Detected abnormal resting order wall on the ${direction === 'BUY' ? 'bid' : 'ask'} side causing extreme book pressure (${(imbalance * 100).toFixed(1)}% imbalance).`;
      }

      return {
        spoofingDetected,
        direction,
        spoofingDetails,
        timestamp: Date.now()
      };
    } catch (error) {
      ctx.logger.error(`Error in detect_spoofing for ${ticker}`, { error: String(error) });
      throw error;
    }
  }

  @Tool({
    name: 'analyze_liquidity',
    description: 'Calculate normalized liquidity score and estimate market-impact slippage for a specific order size',
    inputSchema: LiquidityInput,
    outputSchema: LiquidityOutput
  })
  async analyzeLiquidity({ ticker, orderSize }: { ticker: string; orderSize?: number }, ctx: ExecutionContext) {
    try {
      const orderbook = await this.orderbookService.getOrderbook(ticker);
      const size = orderSize ?? 10000;

      // Estimate slippage using a square-root impact model:
      // Slippage % = Daily_Volatility * sqrt(Order_Size / Daily_Volume) * Impact_Factor
      // Simplified: we scale based on bid/ask depth
      const totalDepth = orderbook.marketDepth.bidDepth + orderbook.marketDepth.askDepth;
      
      // Let's calculate estimated slippage
      let estimatedSlippagePercent = (size / (totalDepth * 100)) * 0.05;
      
      // If spoofing is active, liquidity is thin, slippage rises
      if (ticker === 'BTCUSDT' && this.demoSpoofState.active) {
        estimatedSlippagePercent *= 3.5; // Injected spoof reduces real execution liquidity
      }

      estimatedSlippagePercent = Math.max(0.0001, Math.min(0.05, estimatedSlippagePercent));

      const depthSummary = `Bid Depth: ${orderbook.marketDepth.bidDepth} units, Ask Depth: ${orderbook.marketDepth.askDepth} units. Best Bid: ${orderbook.bidLevels[0]?.price}, Best Ask: ${orderbook.askLevels[0]?.price}.`;

      return {
        liquidityScore: orderbook.liquidityScore,
        estimatedSlippagePercent: Number((estimatedSlippagePercent * 100).toFixed(4)), // return as percentage
        depthSummary,
        timestamp: Date.now()
      };
    } catch (error) {
      ctx.logger.error(`Error in analyze_liquidity for ${ticker}`, { error: String(error) });
      throw error;
    }
  }
}
