import { Injectable, OnModuleInit } from '@nitrostack/core';
import { OrderbookService } from '../orderbook/orderbook.service.js';
import { MarketTools } from './market.tools.js';
import { DbService } from '../db/db.service.js';
import WebSocket from 'ws';

@Injectable({ deps: [OrderbookService, MarketTools, DbService] })
export class DemoDataService implements OnModuleInit {
  private ws: WebSocket | null = null;
  private startTime = Date.now();
  private mockInterval: NodeJS.Timeout | null = null;

  constructor(
    private orderbookService: OrderbookService,
    private marketTools: MarketTools,
    private db: DbService
  ) {}

  onModuleInit() {
    const isDemo = process.env.DEMO_MODE === 'true';
    if (isDemo) {
      console.log('🏁 QUANTGUARD: Starting Demo Simulation Mode...');
      this.startSimulation();
    }
  }

  /**
   * Start live Binance WS connection with dynamic spoof injection schedule
   */
  private startSimulation() {
    this.startTime = Date.now();

    // Start background simulation loop (refreshing every 5 seconds)
    this.mockInterval = setInterval(() => {
      this.runSimulationStep();
    }, 5000);

    // Try connecting to live Binance WebSocket for authentic real-time feed
    this.connectBinanceWs();
  }

  /**
   * Connect to Binance WS for live depth
   */
  private connectBinanceWs() {
    try {
      this.ws = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@depth10@100ms');

      this.ws.on('message', (data: string) => {
        // Only process live messages if no active spoof is injected (spoof overrides feed)
        const elapsed = (Date.now() - this.startTime) / 1000;
        const isSpoofActive = elapsed >= 120 && elapsed < 180;
        
        if (isSpoofActive) return;

        try {
          const payload = JSON.parse(data);
          if (payload.bids && payload.asks) {
            const bidLevels = payload.bids.map((b: string[]) => ({
              price: Number(b[0]),
              quantity: Number(b[1])
            }));
            const askLevels = payload.asks.map((a: string[]) => ({
              price: Number(a[0]),
              quantity: Number(a[1])
            }));

            let bidDepth = 0;
            let askDepth = 0;
            bidLevels.forEach((b: any) => bidDepth += b.quantity);
            askLevels.forEach((a: any) => askDepth += a.quantity);

            const imbalance = (bidDepth - askDepth) / (bidDepth + askDepth);
            
            // Push to service
            this.orderbookService.updateOrderbook('BTCUSDT', {
              ticker: 'BTCUSDT',
              bidLevels,
              askLevels,
              marketDepth: {
                bidDepth: Number(bidDepth.toFixed(2)),
                askDepth: Number(askDepth.toFixed(2))
              },
              orderImbalance: Number(imbalance.toFixed(4)),
              liquidityScore: 88 // High liquidity for BTCUSDT
            });
          }
        } catch (e) {
          // JSON parse error
        }
      });

      this.ws.on('error', () => {
        // WebSocket error, fall back silently to mock generator
      });

      this.ws.on('close', () => {
        // Try reconnecting in 10s
        setTimeout(() => this.connectBinanceWs(), 10000);
      });
    } catch (error) {
      // Offline fallback
    }
  }

  /**
   * Single step of the demo simulation
   */
  private runSimulationStep() {
    const elapsed = (Date.now() - this.startTime) / 1000;
    
    // Inject spoof wall at minute 2 (120s - 180s)
    if (elapsed >= 120 && elapsed < 180) {
      this.marketTools.setDemoSpoof(
        true,
        'BUY',
        '🚨 SPOOF ALERT: Injected artificial BUY wall of 1,250 BTC at $92,450.00. Book imbalance spiked to 85% buy pressure with immediate price appreciation nudge.'
      );

      // Generate orderbook dominated by huge buy wall
      const midPrice = 92500.0;
      const bidLevels = [
        { price: 92450.0, quantity: 1250.0 }, // The spoof wall
        { price: 92440.0, quantity: 15.2 },
        { price: 92430.0, quantity: 18.5 }
      ];
      const askLevels = [
        { price: 92550.0, quantity: 12.4 },
        { price: 92560.0, quantity: 14.8 },
        { price: 92570.0, quantity: 16.1 }
      ];

      const bidDepth = 1250.0 + 15.2 + 18.5;
      const askDepth = 12.4 + 14.8 + 16.1;
      const imbalance = (bidDepth - askDepth) / (bidDepth + askDepth);

      this.orderbookService.updateOrderbook('BTCUSDT', {
        ticker: 'BTCUSDT',
        bidLevels,
        askLevels,
        marketDepth: {
          bidDepth: Number(bidDepth.toFixed(2)),
          askDepth: Number(askDepth.toFixed(2))
        },
        orderImbalance: Number(imbalance.toFixed(4)),
        liquidityScore: 35 // Liquidity degraded due to severe manipulation
      });

      console.log(`[SIMULATOR] Minute 2: Injected synthetic BUY spoof wall. VPIN toxicity rising. recommendedStrategy should switch to WAIT.`);

    } else if (elapsed >= 180 && elapsed < 185) {
      // Cancel spoof wall at minute 3
      this.marketTools.setDemoSpoof(
        false,
        'NONE',
        'No active orderbook manipulation. Spoofing wall cancelled. Liquidity profile recovered.'
      );
      console.log(`[SIMULATOR] Minute 3: Spoofing wall cancelled. Market recovering to standard VWAP strategy.`);
    } else {
      // Normal state / mock feed if WS is down
      const isWsActive = this.ws && this.ws.readyState === WebSocket.OPEN;
      if (!isWsActive) {
        // Simulate normal BTCUSDT feed
        const midPrice = 92000.0 + Math.random() * 200;
        const bidLevels = [
          { price: midPrice - 10, quantity: 12.5 },
          { price: midPrice - 20, quantity: 18.2 },
          { price: midPrice - 30, quantity: 24.1 }
        ];
        const askLevels = [
          { price: midPrice + 10, quantity: 11.4 },
          { price: midPrice + 20, quantity: 16.8 },
          { price: midPrice + 30, quantity: 22.5 }
        ];
        const bidDepth = 12.5 + 18.2 + 24.1;
        const askDepth = 11.4 + 16.8 + 22.5;
        const imbalance = (bidDepth - askDepth) / (bidDepth + askDepth);

        this.orderbookService.updateOrderbook('BTCUSDT', {
          ticker: 'BTCUSDT',
          bidLevels,
          askLevels,
          marketDepth: {
            bidDepth: Number(bidDepth.toFixed(2)),
            askDepth: Number(askDepth.toFixed(2))
          },
          orderImbalance: Number(imbalance.toFixed(4)),
          liquidityScore: 92
        });
      }
    }
  }

  // Cleanup
  destroy() {
    if (this.mockInterval) clearInterval(this.mockInterval);
    if (this.ws) this.ws.terminate();
  }
}
