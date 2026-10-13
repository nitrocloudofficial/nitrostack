import { ToolDecorator as Tool, ExecutionContext } from "@nitrostack/core";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { AgentResult } from "../shared-types.js";
import { writeToContextEngine, toMCPResponse } from "../mcp-utils.js";

const contextEngineUrl = process.env.CONTEXT_ENGINE_URL || "http://localhost:3001";

export class TradeRecordsTools {
  @Tool({
    name: "get_trade_history",
    description: "Get trade execution history for a given user",
    inputSchema: z.object({
      user_id: z.string().uuid(),
      limit: z.number().int().positive().default(100),
      workflow_id: z.string().optional(),
    }),
  })
  async getTradeHistory(input: { user_id: string; limit?: number; workflow_id?: string }, ctx?: ExecutionContext) {
    const limitCount = input.limit || 100;
    const trades = [];
    for (let i = 0; i < Math.min(limitCount, 10); i++) {
      trades.push({
        trade_id: uuidv4(),
        symbol: ["AAPL", "GOOGL", "MSFT"][Math.floor(Math.random() * 3)],
        side: Math.random() > 0.5 ? "BUY" : "SELL",
        quantity: Math.floor(Math.random() * 1000) + 10,
        price: Math.random() * 200 + 50,
        timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 3600 * 1000).toISOString(),
      });
    }

    const payload = { user_id: input.user_id, trades };

    const result: Partial<AgentResult> = {
      id: uuidv4(),
      workflow_id: input.workflow_id || uuidv4(),
      agent_type: "reconciliation",
      result_data: payload,
      confidence_score: 0.96,
    };

    writeToContextEngine(contextEngineUrl, result).catch(console.error);
    return toMCPResponse(payload);
  }

  @Tool({
    name: "get_execution_details",
    description: "Get detailed execution breakdown for a specific trade ID",
    inputSchema: z.object({
      trade_id: z.string().uuid(),
      workflow_id: z.string().optional(),
    }),
  })
  async getExecutionDetails(input: { trade_id: string; workflow_id?: string }, ctx?: ExecutionContext) {
    const details = {
      trade_id: input.trade_id,
      status: "FILLED",
      execution_price: Math.random() * 200 + 50,
      quantity_filled: Math.floor(Math.random() * 1000) + 10,
      fees: Math.random() * 100,
      timestamp: new Date().toISOString(),
    };

    const result: Partial<AgentResult> = {
      id: uuidv4(),
      workflow_id: input.workflow_id || uuidv4(),
      agent_type: "reconciliation",
      result_data: details,
      confidence_score: 0.99,
    };

    writeToContextEngine(contextEngineUrl, result).catch(console.error);
    return toMCPResponse(details);
  }

  @Tool({
    name: "reconcile_trades",
    description: "Run trade reconciliation report across executed vs cleared trades",
    inputSchema: z.object({
      user_id: z.string().uuid(),
      workflow_id: z.string().optional(),
    }),
  })
  async reconcileTrades(input: { user_id: string; workflow_id?: string }, ctx?: ExecutionContext) {
    const reconciliation = {
      user_id: input.user_id,
      total_trades: 150,
      reconciled_trades: 148,
      discrepancies: 2,
      reconciliation_status: "PASSED",
    };

    const result: Partial<AgentResult> = {
      id: uuidv4(),
      workflow_id: input.workflow_id || uuidv4(),
      agent_type: "reconciliation",
      result_data: reconciliation,
      confidence_score: 0.95,
    };

    writeToContextEngine(contextEngineUrl, result).catch(console.error);
    return toMCPResponse(reconciliation);
  }
}
