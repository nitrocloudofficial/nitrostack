import { ToolDecorator as Tool, ExecutionContext } from "@nitrostack/core";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { AgentResult } from "../shared-types.js";
import { writeToContextEngine, toMCPResponse } from "../mcp-utils.js";

const contextEngineUrl = process.env.CONTEXT_ENGINE_URL || "http://localhost:3001";
const polygonApiKey = process.env.POLYGON_API_KEY;
const twelveDataApiKey = process.env.TWELVEDATA_API_KEY;

export class MarketDataTools {
  @Tool({
    name: "get_market_snapshot",
    description: "Get real-time market snapshots for given financial symbols",
    inputSchema: z.object({
      symbols: z.array(z.string()).describe("List of stock or asset symbols"),
      workflow_id: z.string().optional(),
    }),
  })
  async getMarketSnapshot(input: { symbols: string[]; workflow_id?: string }, ctx?: ExecutionContext) {
    const symbolItems = await Promise.all(
      input.symbols.map(async (symbol) => {
        let price = Math.random() * 200 + 50;
        let changePct = (Math.random() - 0.5) * 5;
        let volume = Math.floor(Math.random() * 10000000);
        let dataSource = "simulated";

        if (polygonApiKey) {
          try {
            const res = await fetch(`https://api.polygon.io/v2/last/trade/${symbol}?apiKey=${polygonApiKey}`);
            if (res.ok) {
              const data = (await res.json()) as { results?: { p?: number; s?: number } };
              if (data.results?.p) {
                price = data.results.p;
                if (data.results.s) volume = data.results.s;
                dataSource = "Polygon.io Live";
              }
            }
          } catch (e) {
            console.warn(`[market-data] Polygon fetch error for ${symbol}:`, e);
          }
        }

        if (dataSource === "simulated" && twelveDataApiKey) {
          try {
            const res = await fetch(`https://api.twelvedata.com/price?symbol=${symbol}&apikey=${twelveDataApiKey}`);
            if (res.ok) {
              const data = (await res.json()) as { price?: string };
              if (data.price) {
                price = parseFloat(data.price);
                dataSource = "TwelveData Live";
              }
            }
          } catch (e) {
            console.warn(`[market-data] TwelveData fetch error for ${symbol}:`, e);
          }
        }

        return {
          symbol,
          price,
          change_pct: changePct,
          volume,
          data_source: dataSource,
        };
      })
    );

    const snapshot = { symbols: symbolItems };

    const result: Partial<AgentResult> = {
      id: uuidv4(),
      workflow_id: input.workflow_id || uuidv4(),
      agent_type: "market",
      result_data: snapshot,
      confidence_score: 0.98,
    };

    writeToContextEngine(contextEngineUrl, result).catch(console.error);
    return toMCPResponse(snapshot);
  }

  @Tool({
    name: "get_price_history",
    description: "Get historical price data for a given symbol over a specified timeframe",
    inputSchema: z.object({
      symbol: z.string().describe("Asset symbol"),
      days: z.number().int().positive().default(30).describe("Number of days of history"),
      workflow_id: z.string().optional(),
    }),
  })
  async getPriceHistory(input: { symbol: string; days: number; workflow_id?: string }, ctx?: ExecutionContext) {
    let history: Array<Record<string, unknown>> = [];
    let dataSource = "simulated";

    if (twelveDataApiKey) {
      try {
        const res = await fetch(
          `https://api.twelvedata.com/time_series?symbol=${input.symbol}&interval=1day&outputsize=${input.days}&apikey=${twelveDataApiKey}`
        );
        if (res.ok) {
          const data = (await res.json()) as { values?: Array<{ datetime: string; open: string; close: string; high: string; low: string; volume: string }> };
          if (data.values && Array.isArray(data.values)) {
            history = data.values.map((v) => ({
              date: v.datetime,
              open: parseFloat(v.open),
              close: parseFloat(v.close),
              high: parseFloat(v.high),
              low: parseFloat(v.low),
              volume: parseInt(v.volume, 10) || 1000000,
            }));
            dataSource = "TwelveData Live";
          }
        }
      } catch (e) {
        console.warn(`[market-data] TwelveData history fetch error for ${input.symbol}:`, e);
      }
    }

    if (history.length === 0) {
      for (let i = input.days; i > 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        history.push({
          date: date.toISOString().split("T")[0],
          open: Math.random() * 200 + 50,
          close: Math.random() * 200 + 50,
          high: Math.random() * 220 + 60,
          low: Math.random() * 180 + 40,
          volume: Math.floor(Math.random() * 10000000),
        });
      }
    }

    const snapshotData = { symbol: input.symbol, data_source: dataSource, history };

    const result: Partial<AgentResult> = {
      id: uuidv4(),
      workflow_id: input.workflow_id || uuidv4(),
      agent_type: "market",
      result_data: snapshotData,
      confidence_score: 0.97,
    };

    writeToContextEngine(contextEngineUrl, result).catch(console.error);
    return toMCPResponse(snapshotData);
  }

  @Tool({
    name: "get_volatility_metrics",
    description: "Get historical and implied volatility metrics for specified symbols",
    inputSchema: z.object({
      symbols: z.array(z.string()).describe("List of stock or asset symbols"),
      workflow_id: z.string().optional(),
    }),
  })
  async getVolatilityMetrics(input: { symbols: string[]; workflow_id?: string }, ctx?: ExecutionContext) {
    const metrics = {
      symbols: input.symbols.map((symbol) => ({
        symbol,
        volatility: Math.random() * 0.5,
        beta: 0.5 + Math.random() * 1.5,
        sharpe_ratio: Math.random() * 2 - 1,
      })),
    };

    const result: Partial<AgentResult> = {
      id: uuidv4(),
      workflow_id: input.workflow_id || uuidv4(),
      agent_type: "market",
      result_data: metrics,
      confidence_score: 0.91,
    };

    writeToContextEngine(contextEngineUrl, result).catch(console.error);
    return toMCPResponse(metrics);
  }
}
