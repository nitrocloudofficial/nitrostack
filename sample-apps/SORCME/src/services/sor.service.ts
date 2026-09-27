import { Injectable } from "@nitrostack/core";
import { OrderBookLevel } from "../schemas/quant.schemas.js";

@Injectable()
export class SmartOrderRouterService {
  calculateVWAP(
    binanceAsks: number[][],
    coinbaseAsks: number[][],
    targetUsd: number,
  ) {
    let remainingUsd = targetUsd;
    let totalTokensObtained = 0;

    const route = {
      binance: { usd: 0, tokens: 0, vwap: 0 },
      coinbase: { usd: 0, tokens: 0, vwap: 0 },
    };

    const combinedBook: OrderBookLevel[] = [
      ...binanceAsks.map((a) => ({
        exchange: "binance" as const,
        price: a[0],
        vol: a[1],
      })),
      ...coinbaseAsks.map((a) => ({
        exchange: "coinbase" as const,
        price: a[0],
        vol: a[1],
      })),
    ].sort((a, b) => a.price - b.price);

    for (const level of combinedBook) {
      if (remainingUsd <= 0) break;

      const levelUsd = level.vol * level.price;
      const fillUsd = Math.min(remainingUsd, levelUsd);
      const tokensFilled = fillUsd / level.price;

      route[level.exchange].usd += fillUsd;
      route[level.exchange].tokens += tokensFilled;

      totalTokensObtained += tokensFilled;
      remainingUsd -= fillUsd;
    }

    if (route.binance.tokens > 0)
      route.binance.vwap = route.binance.usd / route.binance.tokens;
    if (route.coinbase.tokens > 0)
      route.coinbase.vwap = route.coinbase.usd / route.coinbase.tokens;

    const filledUsd = targetUsd - remainingUsd;

    return {
      targetUsd,
      filledUsd,
      unfilledUsd: remainingUsd,
      blendedVwap:
        totalTokensObtained > 0 ? filledUsd / totalTokensObtained : 0,
      estimatedTokens: totalTokensObtained,
      routingPlan: {
        binance: { usd: route.binance.usd, vwap: route.binance.vwap },
        coinbase: { usd: route.coinbase.usd, vwap: route.coinbase.vwap },
      },
    };
  }
}
