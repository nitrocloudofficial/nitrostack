import { ToolDecorator as Tool, ExecutionContext } from "@nitrostack/core";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { AgentResult } from "../shared-types.js";
import { writeToContextEngine, toMCPResponse } from "../mcp-utils.js";

const contextEngineUrl = process.env.CONTEXT_ENGINE_URL || "http://localhost:3001";

export class ComplianceDbTools {
  @Tool({
    name: "check_restrictions",
    description: "Check user trading restrictions for a given symbol",
    inputSchema: z.object({
      user_id: z.string().uuid(),
      symbol: z.string(),
      workflow_id: z.string().optional(),
    }),
  })
  async checkRestrictions(input: { user_id: string; symbol: string; workflow_id?: string }, ctx?: ExecutionContext) {
    const restrictions = {
      user_id: input.user_id,
      symbol: input.symbol,
      restricted: false,
      reason: null,
      max_position_size: 1000000,
    };

    const result: Partial<AgentResult> = {
      id: uuidv4(),
      workflow_id: input.workflow_id || uuidv4(),
      agent_type: "compliance",
      result_data: restrictions,
      confidence_score: 0.99,
    };

    writeToContextEngine(contextEngineUrl, result).catch(console.error);
    return toMCPResponse(restrictions);
  }

  @Tool({
    name: "get_audit_trail",
    description: "Get compliance audit trail for a user",
    inputSchema: z.object({
      user_id: z.string().uuid(),
      limit: z.number().int().positive().default(50),
      workflow_id: z.string().optional(),
    }),
  })
  async getAuditTrail(input: { user_id: string; limit?: number; workflow_id?: string }, ctx?: ExecutionContext) {
    const entries = [];
    for (let i = 0; i < 5; i++) {
      entries.push({
        event_id: uuidv4(),
        timestamp: new Date(Date.now() - i * 3600 * 1000).toISOString(),
        action: ["TRADE_EXECUTED", "APPROVAL_GRANTED", "RISK_CHECK_PASSED"][
          Math.floor(Math.random() * 3)
        ],
        actor: "system",
        details: "Compliance check passed",
      });
    }

    const snapshot = { user_id: input.user_id, entries };

    const result: Partial<AgentResult> = {
      id: uuidv4(),
      workflow_id: input.workflow_id || uuidv4(),
      agent_type: "compliance",
      result_data: snapshot,
      confidence_score: 0.98,
    };

    writeToContextEngine(contextEngineUrl, result).catch(console.error);
    return toMCPResponse(snapshot);
  }

  @Tool({
    name: "validate_compliance",
    description: "Validate trade order compliance prior to execution",
    inputSchema: z.object({
      user_id: z.string().uuid(),
      symbol: z.string(),
      quantity: z.number().positive(),
      workflow_id: z.string().optional(),
    }),
  })
  async validateCompliance(input: { user_id: string; symbol: string; quantity: number; workflow_id?: string }, ctx?: ExecutionContext) {
    const validation = {
      user_id: input.user_id,
      symbol: input.symbol,
      quantity: input.quantity,
      compliant: true,
      violations: [],
      warnings: [],
    };

    const result: Partial<AgentResult> = {
      id: uuidv4(),
      workflow_id: input.workflow_id || uuidv4(),
      agent_type: "compliance",
      result_data: validation,
      confidence_score: 0.97,
    };

    writeToContextEngine(contextEngineUrl, result).catch(console.error);
    return toMCPResponse(validation);
  }
}
