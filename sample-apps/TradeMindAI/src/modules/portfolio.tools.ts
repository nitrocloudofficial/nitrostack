import { ToolDecorator as Tool, ExecutionContext } from "@nitrostack/core";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { AgentResult } from "../shared-types.js";
import { writeToContextEngine, toMCPResponse } from "../mcp-utils.js";

const contextEngineUrl = process.env.CONTEXT_ENGINE_URL || "http://localhost:3001";

function generatePortfolioSnapshot(userId: string) {
  return {
    user_id: userId,
    total_value: 1250000,
    currency: "USD",
    positions: [
      { symbol: "AAPL", quantity: 100, price: 190.5, value: 19050 },
      { symbol: "GOOGL", quantity: 50, price: 140.2, value: 7010 },
      { symbol: "SPY", quantity: 300, price: 420.3, value: 126090 },
    ],
    cash: 1098850,
    updated_at: new Date().toISOString(),
  };
}

export class PortfolioTools {
  @Tool({
    name: "get_portfolio_snapshot",
    description: "Get real-time portfolio holdings, value, and position breakdown",
    inputSchema: z.object({
      user_id: z.string().uuid(),
      as_of: z.string().datetime().optional(),
      workflow_id: z.string().optional(),
    }),
  })
  async getPortfolioSnapshot(input: { user_id: string; as_of?: string; workflow_id?: string }, ctx?: ExecutionContext) {
    const snapshot = generatePortfolioSnapshot(input.user_id);
    const confidence = 0.95;

    const result: Partial<AgentResult> = {
      id: uuidv4(),
      workflow_id: input.workflow_id || uuidv4(),
      agent_type: "portfolio",
      result_data: snapshot,
      confidence_score: confidence,
    };

    writeToContextEngine(contextEngineUrl, result).catch(console.error);
    return toMCPResponse(snapshot);
  }

  @Tool({
    name: "get_allocation_breakdown",
    description: "Get asset class and sector allocation breakdown for portfolio",
    inputSchema: z.object({
      user_id: z.string().uuid(),
      as_of: z.string().datetime().optional(),
      workflow_id: z.string().optional(),
    }),
  })
  async getAllocationBreakdown(input: { user_id: string; as_of?: string; workflow_id?: string }, ctx?: ExecutionContext) {
    const breakdown = {
      user_id: input.user_id,
      allocation: {
        equities: 0.75,
        fixed_income: 0.15,
        cash: 0.1,
      },
      sector_breakdown: {
        technology: 0.35,
        healthcare: 0.2,
        financials: 0.15,
        other: 0.3,
      },
    };

    const result: Partial<AgentResult> = {
      id: uuidv4(),
      workflow_id: input.workflow_id || uuidv4(),
      agent_type: "portfolio",
      result_data: breakdown,
      confidence_score: 0.93,
    };

    writeToContextEngine(contextEngineUrl, result).catch(console.error);
    return toMCPResponse(breakdown);
  }

  @Tool({
    name: "get_pnl_history",
    description: "Get historical PnL performance metrics over time",
    inputSchema: z.object({
      user_id: z.string().uuid(),
      days: z.number().int().positive().default(30),
      workflow_id: z.string().optional(),
    }),
  })
  async getPnlHistory(input: { user_id: string; days?: number; workflow_id?: string }, ctx?: ExecutionContext) {
    const daysCount = input.days || 30;
    const history = [];
    for (let i = daysCount; i > 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      history.push({
        date: date.toISOString().split("T")[0],
        daily_return: (Math.random() - 0.5) * 0.02,
        cumulative_return: Math.random() * 0.15,
      });
    }

    const payload = { user_id: input.user_id, history };

    const result: Partial<AgentResult> = {
      id: uuidv4(),
      workflow_id: input.workflow_id || uuidv4(),
      agent_type: "portfolio",
      result_data: payload,
      confidence_score: 0.92,
    };

    writeToContextEngine(contextEngineUrl, result).catch(console.error);
    return toMCPResponse(payload);
  }
}
