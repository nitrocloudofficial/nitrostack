import { ConfigService, Injectable } from "@nitrostack/core";
import {
  CoinGeckoTickerQueryInput,
  CoinGeckoTickersResponse,
  CoinGeckoTickersResponseSchema,
} from "../schemas/quant.schemas.js";

@Injectable({ deps: [ConfigService] })
export class CoinGeckoService {
  private baseUrl = "https://api.coingecko.com/api/v3";

  private static SYMBOL_TO_ID_MAP: Record<string, string> = {
    SOL: "solana",
    ETH: "ethereum",
    BTC: "bitcoin",
    AVAX: "avalanche-2",
    MATIC: "matic-network",
    POL: "polygon-ecosystem-token",
    LINK: "chainlink",
  };

  private static EXCHANGE_ID_MAP: Record<string, string> = {
    coinbase: "gdax",
  };

  constructor(private config: ConfigService) {}

  /**
   * Read the key lazily, per request. Resolving it in the constructor bakes in
   * whatever was present at container-build time; on a hosted platform the key
   * is optional anyway (CoinGecko's public tier works without it), so a missing
   * key must never prevent the server from booting.
   */
  private getApiKey(): string | undefined {
    const key = this.config.get<string>("COINGECKO_API_KEY");
    if (!key || key.trim() === "" || key === "your_key") {
      return undefined;
    }
    return key.trim();
  }

  private parsePair(pair: string): { coinId: string; target: string } {
    const [baseSymbol, targetSymbol] = pair.toUpperCase().split("/");

    if (!baseSymbol || !targetSymbol) {
      throw new Error(
        `Invalid trading pair format: '${pair}'. Expected format 'BASE/TARGET' (e.g., 'SOL/USDT').`
      );
    }

    const coinId = CoinGeckoService.SYMBOL_TO_ID_MAP[baseSymbol];
    if (!coinId) {
      throw new Error(
        `Unsupported base token '${baseSymbol}'. Please map it inside SYMBOL_TO_ID_MAP.`
      );
    }

    return { coinId, target: targetSymbol };
  }

  async getExchangeTickers(
    input: CoinGeckoTickerQueryInput
  ): Promise<CoinGeckoTickersResponse> {
    const { coinId, target } = this.parsePair(input.pair);

    const url = new URL(`${this.baseUrl}/coins/${coinId}/tickers`);
    url.searchParams.append("include_exchange_logo", "false");

    const headers: Record<string, string> = {
      Accept: "application/json",
    };

    const apiKey = this.getApiKey();
    if (apiKey) {
      headers["x-cg-demo-api-key"] = apiKey;
    }

    const response = await fetch(url.toString(), { headers });

    if (!response.ok) {
      throw new Error(
        `CoinGecko API Error ${response.status}: ${response.statusText}`
      );
    }

    const rawData = await response.json();

    const parsedData = CoinGeckoTickersResponseSchema.parse(rawData);

    const targetExchanges = (
      input.exchanges?.map((e) => e.toLowerCase()) || ["binance", "coinbase"]
    ).map((e) => CoinGeckoService.EXCHANGE_ID_MAP[e] || e);

    const filteredTickers = parsedData.tickers
      .filter((ticker) => {
        const matchesTarget =
          ticker.target.toUpperCase() === target ||
          ticker.target.toUpperCase() === "USD";
        const matchesExchange = targetExchanges.includes(
          ticker.market.identifier.toLowerCase()
        );
        return matchesTarget && matchesExchange;
      })
      .map((ticker) => {
        const id = ticker.market.identifier.toLowerCase();
        if (id === "gdax") {
          return {
            ...ticker,
            market: { ...ticker.market, identifier: "coinbase" },
          };
        }
        return ticker;
      });

    return {
      name: parsedData.name,
      tickers: filteredTickers,
    };
  }
}
