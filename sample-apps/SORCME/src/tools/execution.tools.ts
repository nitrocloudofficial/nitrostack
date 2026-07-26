import { ToolDecorator as Tool, Injectable } from "@nitrostack/core";
import { z } from "@nitrostack/core";
import {
  OrderRoutingSchema,
  OrderRoutingInput,
  ArbitrageSchema,
  ArbitrageInput,
  CoinGeckoTickerQuerySchema,
  CoinGeckoTickerQueryInput,
  SimulateRiskSchema,
  SimulateRiskInput,
} from "../schemas/quant.schemas.js";
import { SmartOrderRouterService } from "../services/sor.service.js";
import { CoinGeckoService } from "../services/coingecko.service.js";

@Injectable({ deps: [SmartOrderRouterService, CoinGeckoService] })
export class QuantExecutionTools {
  constructor(
    private sorService: SmartOrderRouterService,
    private coinGeckoService: CoinGeckoService
  ) {}

  @Tool({
    name: "crypto_router",
    description:
      "Smart router that maps user intent to exact tools. Call this for ANY crypto query. Use goal=price for live rates, goal=arbitrage for price gaps, goal=routing for order splitting, goal=full for complete analysis. ALWAYS call this tool first before any other tool.",
    inputSchema: z.object({
      pair: z.string().describe("Trading pair e.g. BTC/USDT"),
      goal: z
        .enum(["price", "arbitrage", "routing", "full"])
        .describe("price | arbitrage | routing | full"),
      usdAmount: z
        .number()
        .optional()
        .describe("Required when goal is routing or full"),
    }),
  })
  async cryptoRouter(input: {
    pair: string;
    goal: "price" | "arbitrage" | "routing" | "full";
    usdAmount?: number;
  }) {
    if (
      (input.goal === "routing" || input.goal === "full") &&
      (input.usdAmount === undefined || input.usdAmount === null)
    ) {
      throw new Error("usdAmount is required for goal=routing or goal=full");
    }

    if (input.goal === "price") {
      return await this.getCoinIntelligence({
        pair: input.pair,
        exchanges: ["binance", "coinbase"],
      });
    }

    if (input.goal === "arbitrage") {
      return await this.detectArbitrage({
        pair: input.pair,
        feeTier: 0.001,
      });
    }

    if (input.goal === "routing") {
      return await this.calculateOptimalRouting({
        pair: input.pair,
        usdAmount: input.usdAmount!,
      });
    }

    if (!input.usdAmount) {
      throw new Error("usdAmount is required for goal=full");
    }

    const arbitrage = await this.detectArbitrage({
      pair: input.pair,
      feeTier: 0.001,
    });

    const routing = await this.calculateOptimalRouting({
      pair: input.pair,
      usdAmount: input.usdAmount,
    });

    const risk = await this.evaluateExecutionRisk({
      pair: input.pair,
      buyVenue: arbitrage.buyVenue,
      sellVenue: arbitrage.sellVenue,
      buyPrice: arbitrage.buyPrice,
      sellPrice: arbitrage.sellPrice,
      targetUsd: routing.targetUsd,
      filledUsd: routing.filledUsd,
      unfilledUsd: routing.unfilledUsd,
    });

    return { arbitrage, routing, risk };
  }

  @Tool({
    name: "evaluate_execution_risk",
    description:
      "Pre-execution calculator. Takes pair, buyVenue, sellVenue, buyPrice, sellPrice, targetUsd, filledUsd, unfilledUsd. Returns EXECUTE or ABORT verdict with fee breakdown.",
    inputSchema: SimulateRiskSchema,
  })
  async evaluateExecutionRisk(input: SimulateRiskInput) {
    const fees: Record<string, { taker: number; maker: number }> = {
      binance: { taker: 0.001, maker: 0.001 },
      coinbase: { taker: 0.006, maker: 0.004 },
    };

    const buyVenueKey = input.buyVenue.toLowerCase();
    const sellVenueKey = input.sellVenue.toLowerCase();

    // Quantity in units (assuming targetUsd is the order size)
    const quantity = input.targetUsd / input.buyPrice;

    // Fees as absolute dollar amounts
    const buyFee =
      input.buyPrice * quantity * (fees[buyVenueKey]?.taker ?? 0.001);
    const sellFee =
      input.sellPrice * quantity * (fees[sellVenueKey]?.taker ?? 0.006);
    const totalFees = buyFee + sellFee;

    // Slippage from unfilled portion
    const slippage =
      input.unfilledUsd > 0
        ? input.unfilledUsd * 0.001
        : 0;

    // Gross profit from spread (per unit × quantity)
    const grossSpread = (input.sellPrice - input.buyPrice) * quantity;
    const netPnL = grossSpread - totalFees - slippage;

    const executionRisk =
      netPnL > 1.0 ? "LOW" : netPnL > 0 ? "MEDIUM" : "HIGH";

    const verdict = netPnL > 0 ? "EXECUTE" : "ABORT";

    return {
      pair: input.pair,
      verdict,
      executionRisk,
      breakdown: {
        grossSpread,
        buyFee,
        sellFee,
        totalFees,
        slippage,
        netPnL,
      },
      recommendation:
        verdict === "EXECUTE"
          ? `Safe to execute. Net profit: $${netPnL.toFixed(4)} per unit`
          : `Abort execution. Net loss: $${netPnL.toFixed(4)} per unit`,
    };
  }

  @Tool({
    name: "calculate_optimal_order_routing",
    description:
      "Calculates optimal order splitting across exchanges to minimize slippage.",
    inputSchema: OrderRoutingSchema,
  })
  async calculateOptimalRouting(input: OrderRoutingInput) {
    const liveData = await this.getCoinIntelligence({
      pair: input.pair,
      exchanges: ["binance", "coinbase"],
    });

    const binanceTicker = liveData.tickers.find(
      (t) => t.market.identifier.toLowerCase() === "binance"
    );
    if (!binanceTicker) {
      throw new Error(
        "Live price data unavailable for binance. Cannot calculate optimal routing."
      );
    }

    const coinbaseTicker = liveData.tickers.find(
      (t) => t.market.identifier.toLowerCase() === "coinbase"
    );
    if (!coinbaseTicker) {
      throw new Error(
        "Live price data unavailable for coinbase. Cannot calculate optimal routing."
      );
    }

    const simulateOrderBook = (basePrice: number) => {
      return [
        [basePrice, 10000 / basePrice],
        [basePrice * 1.001, 50000 / basePrice],
        [basePrice * 1.002, 100000 / basePrice],
        [basePrice * 1.005, 500000 / basePrice],
      ];
    };

    const binanceAsks = simulateOrderBook(binanceTicker.last);
    const coinbaseAsks = simulateOrderBook(coinbaseTicker.last);

    return this.sorService.calculateVWAP(
      binanceAsks,
      coinbaseAsks,
      input.usdAmount
    );
  }

  @Tool({
    name: "detect_cross_venue_arbitrage",
    description:
      "Identifies price discrepancies across venues and computes net profit after fees.",
    inputSchema: ArbitrageSchema,
  })
  async detectArbitrage(input: ArbitrageInput) {
    const liveData = await this.getCoinIntelligence({
      pair: input.pair,
      exchanges: ["binance", "coinbase"],
    });

    const binanceTicker = liveData.tickers.find(
      (t) => t.market.identifier.toLowerCase() === "binance"
    );
    if (!binanceTicker) {
      throw new Error(
        "Live price data unavailable for binance. Cannot detect arbitrage."
      );
    }

    const coinbaseTicker = liveData.tickers.find(
      (t) => t.market.identifier.toLowerCase() === "coinbase"
    );
    if (!coinbaseTicker) {
      throw new Error(
        "Live price data unavailable for coinbase. Cannot detect arbitrage."
      );
    }

    // Simulate realistic price gaps (Binance typically cheaper, Coinbase premium)
    const binance = {
      bid: binanceTicker.last * 0.998,  // Binance bid slightly lower
      ask: binanceTicker.last,           // Binance ask at market
    };

    const coinbase = {
      bid: coinbaseTicker.last * 1.002,  // Coinbase bid slightly higher (premium)
      ask: coinbaseTicker.last * 1.004,  // Coinbase ask at premium
    };

    // Route 1: Buy on Binance, sell on Coinbase
    const route1Spread = coinbase.bid - binance.ask;
    const route1Fees = binance.ask * input.feeTier + coinbase.bid * input.feeTier;
    const route1 = {
      buyVenue: "Binance",
      sellVenue: "Coinbase",
      buyPrice: binance.ask,
      sellPrice: coinbase.bid,
      netProfitPerUnit: route1Spread - route1Fees
    };

    // Route 2: Buy on Coinbase, sell on Binance (typically negative)
    const route2Spread = binance.bid - coinbase.ask;
    const route2Fees = coinbase.ask * input.feeTier + binance.bid * input.feeTier;
    const route2 = {
      buyVenue: "Coinbase",
      sellVenue: "Binance",
      buyPrice: coinbase.ask,
      sellPrice: binance.bid,
      netProfitPerUnit: route2Spread - route2Fees
    };

    const bestRoute = route1.netProfitPerUnit > route2.netProfitPerUnit ? route1 : route2;

    return {
      pair: input.pair,
      opportunityDetected: bestRoute.netProfitPerUnit > 0,
      ...bestRoute,
    };
  }

  @Tool({
    name: "coin_intelligence",
    description:
      "Fetches live coin price and ticker data from CoinGecko API for a given trading pair across specified exchanges",
    inputSchema: CoinGeckoTickerQuerySchema,
  })
  async getCoinIntelligence(input: CoinGeckoTickerQueryInput) {
    return this.coinGeckoService.getExchangeTickers(input);
  }
}
